# Audit complet — dépôt SIRH EVA (état au 2026-05-02)

**Périmètre** : arborescence workspace `/Users/mikguire/Documents/sirh eva avec prompt` (recherche globale : `django`, `manage.py`, `pubspec.yaml`, `.dart`, `celery`, `docker-compose`).  
**Conclusion liminaire** : **aucun backend Django** et **aucune application Flutter / artefact mobile natif** dans ce dépôt. Le backend livré est **NestJS 11 + Prisma 6 + PostgreSQL** ; le « mobile » présent est un **kit UI React** (`design-system/`) orienté responsive, pas Flutter.

---

## 1. Inventaire par couche

### 1.1 Backend déclaré « Django »

| Élément attendu (vision canon) | Présence dans le dépôt |
|--------------------------------|-------------------------|
| Python, Django, DRF | Non |
| `manage.py`, `settings.py` | Non |
| Celery | Non (workers **BullMQ** via `worker:notifications`) |
| Multi-tenant schéma PG par tenant | Non — modèle **row-level** `tenantId` sur entités métier |

**Verdict** : le legacy Django éventuel est **hors dépôt** ; toute intégration ou comparaison métier (CNSS, IUTS, etc.) suppose un **autre repo ou export** non audité ici.

### 1.2 Backend effectif (NestJS)

| Domaine | Fichiers / modules | État fonctionnel (lecture code) |
|---------|-------------------|--------------------------------|
| Bootstrap | `src/main.ts` | Préfixe `api/v1`, `ValidationPipe`, Swagger `/api/docs`, **rawBody: true** (prérequis Stripe) |
| Auth | `modules/auth/*`, `jwt.strategy.ts`, `auth.service.ts` | Login email/password + `tenantId`, JWT access 15m / refresh 30j, sessions `UserSession`, refresh avec rotation du refresh en DB |
| Tenancy HTTP | `tenant-context.guard.ts` | Oblige `x-tenant-id` ; aligne avec `user.tenantId` JWT si présent |
| RBAC | `permissions.guard.ts`, décorateur `@RequirePermissions` | Permissions depuis payload JWT (pas de re-fetch DB à chaque requête) |
| Employés | `employees/*` | Liste + création filtrées `tenantId`, audit sur création |
| Contrats | `schema.prisma` `Contract` | Modèle présent (CDI/CDD/etc., `salaryCents`, devise **défaut EUR** — écart cible XOF BF) |
| Congés | `leave/*` | Création + approbation avec audit ; **permission `leave.write` utilisée mais absente du seed** (voir §4) |
| Billing | `billing/*`, `stripe-signature.service.ts` | Vérification HMAC type Stripe sur `timestamp.payload` ; idempotence `lastWebhookEventId` |
| Fichiers | `files/*` | Presign S3 (AWS SDK) |
| Notifications | `notifications/*` + worker `workers/notifications.worker.ts` | File BullMQ |
| Admin | `admin/*` | Tenants, impersonation (à traiter avec prudence prod) |
| Audit | `audit/*`, `audit.service.ts` | Logs structurés côté modèle |

**Scripts npm** (`package.json`) : `build`, `start`, `lint`, Prisma generate/migrate/seed, **pas de script `test`** — dette QA majeure.

### 1.3 Base de données (Prisma + SQL)

- **Modèles** : `Tenant`, `User`, `TenantUser`, `Role`, `Permission`, employés, départements, postes, contrats, types de congé, demandes, documents, plans, abonnements, sessions, notifications, audit.
- **Identifiants** : `cuid()` — pas UUID v4 explicite (écart possible vs standard interne « UUID » produit).
- **RLS** : `sql/rls.sql` active RLS sur tables clés + politiques `tenantId = current_setting('app.current_tenant')`. **`PrismaService` ne exécute aucun `SET`** → RLS **non opérationnelle** tant que le runtime n’injecte pas le setting (voir ADR-0002).

### 1.4 Artefacts « mobile »

| Artefact | Technologie | Rôle |
|----------|-------------|------|
| Dossier `mobile/` | Absent | — |
| `pubspec.yaml`, `.dart` | Aucun | Pas de Flutter |
| `design-system/` | React + TS | Composants MVP RH (`EmployeeCard`, `MobileDataTable`, formulaires, tokens) — **cible intégration web admin**, pas binaire store |
| `canvases/*.canvas.tsx` | Cursor Canvas | Présentation / spec visuelle design system |

### 1.5 Infra & outillage

- **Docker Compose** : absent du dépôt (écart avec vision « Docker Compose en dev »).
- **`.env.example`** : DB, JWT, Stripe webhook, S3, Redis — cohérent Nest.

---

## 2. Cartographie API (synthèse)

| Méthode | Chemin (sous `/api/v1`) | Garde typique | Remarque audit |
|---------|-------------------------|---------------|----------------|
| POST | `/auth/login` | Aucune | Corps : email, password, tenantId |
| POST | `/auth/refresh`, `/auth/logout` | Aucune | Refresh rotation |
| GET/POST | `/employees` | JWT + tenant + perms | OK pattern |
| POST | `/leave-requests`, `/:id/approve` | JWT + tenant + perms | Seed incomplet (§4) |
| GET | `/billing/subscription` | JWT + tenant + perms | |
| POST | `/billing/webhook` | **JWT + tenant + perms (classe)** | **P0** : Stripe ne peut pas appeler (voir ADR-0003) |
| — | Autres modules | À valider fichier par fichier | Même risque pour tout webhook futur |

---

## 3. Multi-tenant — analyse

**Forces** : `tenantId` sur les tables métier ; services utilisent `where: { tenantId }` ; guard vérifie cohérence header vs JWT.

**Faiblesses** :

1. RLS scriptée mais **non reliée** aux requêtes Prisma (pas de `SET LOCAL`).
2. Tenant résolu par **header client** `x-tenant-id` — surface d’erreur si client malveillant envoie un header différent du JWT : **refusé** si `user.tenantId` défini (bon), mais dépend de la bonne population du JWT.
3. Webhook billing : si corrigé en public, le **tenant** doit être inféré depuis les métadonnées Stripe → mapping `providerCustomerId` / `providerSubscriptionId` (déjà présents sur `Subscription`).

---

## 4. Anomalies et dettes identifiées (priorité)

### P0 — Bloquant production / intégration

| ID | Description |
|----|-------------|
| P0-1 | `POST /billing/webhook` hérite de `JwtAuthGuard` et `TenantContextGuard` au niveau classe → **incompatible** appels Stripe. |
| P0-2 | RLS PostgreSQL **ineffective** sans `app.current_tenant` par transaction. |

### P1 — Bloquant fonctionnel ou sécurité

| ID | Description |
|----|-------------|
| P1-1 | Seed `prisma/seed.ts` : permissions listées sans **`leave.write`** alors que `LeaveController` exige `@RequirePermissions("leave.write")` → création de demande **refusée** pour tout rôle seedé. |
| P1-2 | JWT secrets avec repli `?? "dev-secret"` / `"dev-refresh-secret"` dans le code → risque **exposition** si variables d’environnement absentes en prod. |
| P1-3 | ~~Aucun test automatisé~~ — corrigé : `npm test`, `npm run test:int`, CI GitHub. |

### P2 — Métier / produit (hors bug code immédiat)

| ID | Description |
|----|-------------|
| P2-1 | Contrats : `currency` défaut **EUR** vs exigence **XOF** par défaut reporting BF. |
| P2-2 | Aucune logique CNSS / IUTS / SMIG / congés 2,5 j/mois dans ce repo — normal pour socle actuel, **à tracer** avant module paie. |

---

## 5. Conformité vision documentaire (écart)

| Exigence documentaire | Statut dans le dépôt |
|------------------------|----------------------|
| Flutter + Riverpod + Hive + GoRouter | Absent |
| Django 5 + DRF + Celery | Absent |
| Docker Compose dev | **Présent** (`docker-compose.yml` racine, DB `eva_test`) |
| Fuseau / format date côté API | Non centralisé (DTO dates ISO classiques) |

---

## 6. Recommandations immédiates (hors scope rédaction ADR)

1. Corriger l’exposition du webhook selon **ADR-0003**.  
2. Implémenter le contexte DB tenant selon **ADR-0002**.  
3. Corriger le seed (ajouter permission `leave.write` + liaison rôle owner).  
4. Retirer ou durcir les secrets par défaut JWT (fail-fast si env manquante en prod).  
5. Ajouter `npm test` + tests minimum auth / tenant / webhook.

---

## 7. Trace audit

- Méthode : inventaire `Glob` + `Grep` + lecture fichiers clés listés ci-dessus.  
- Prochaine révision recommandée : après correction P0 et première suite de tests.

---

## 8. Correctifs livrés dans le dépôt (2026-05-02)

| Réf. audit | Mesure |
|-------------|--------|
| P0-1 | `POST /billing/webhook` déplacé vers `BillingWebhookController` sans garde JWT ; `@Public()` pour compatibilité futur `APP_GUARD` ; logique dans `BillingWebhookService` avec transaction + `set_config` avant mise à jour `Subscription`. |
| P0-2 | `TenantContextGuard` alimente `AsyncLocalStorage` ; `PrismaService` applique un middleware `$use` qui exécute `set_config('app.current_tenant', …)` avant les opérations Prisma nommées ; `AuditService.record` utilise une transaction avec `set_config` (chemins sans ALS, ex. admin). |
| P1-1 | Seed : permission **`leave.write`** ajoutée. |
| P1-2 | `assertJwtSecretsForProduction()` au boot ; `getJwtAccessSecret` / `getJwtRefreshSecret` sans fallback faible en production. |
| P1-3 | Scripts `npm test` / `npm run test:cov`, Jest + specs signature Stripe et secrets JWT. |
| P2-1 | Schéma Prisma : devise par défaut des contrats **`XOF`**. |
| Infra | `docker-compose.yml` racine, `backend/Dockerfile`, CI GitHub `backend-ci.yml` (+ Postgres service + `npm run test:int`). |
| Mobile / packaging | Dossier `mobile/` (Flutter + Riverpod + GoRouter + Dio + Hive), `design-system/package.json` + `tsconfig.json`, `legacy/django/README.md`, `README.md` racine. |
| Webhook Stripe | Correction du chemin d’identifiant d’abonnement (`data.object.id` pour `customer.subscription.updated`). |
| S0-5 intégration | `test/integration/app.integration.spec.ts`, `test/integration/fixture.ts`, `jest.integration.config.cjs`, `npm run test:int` ; base **`eva_test`** (Docker + CI). |
| HTTP sémantique | `200 OK` pour login / refresh / logout et pour le webhook Stripe. |
