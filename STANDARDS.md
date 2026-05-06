# SIRH EVA — Standards techniques

_Applicable au dépôt courant. Toute exception = ADR obligatoire._

## 1. Périmètre stack (vérité dépôt)

- **Backend** : NestJS (TypeScript), Prisma, PostgreSQL, Redis, BullMQ (workers).
- **Clients cibles produit** : Flutter (mobile) + web admin (stack web à figer par ADR si différent du package `design-system` React actuel).
- **API** : préfixe `/api/v1/` ; versionnement par URL ; pas de breaking change sans bump mineur documenté.

> Si le legacy **Django/DRF** devient source de vérité pour un module, l’intégration (proxy, migration données, double écriture) est tracée uniquement via **ADR** — pas d’hypothèse implicite dans le code.

---

## 2. Conventions de nommage

| Élément | Convention | Exemple |
|---------|------------|---------|
| Branches Git | `type/scope-court` | `feat/leave-approval`, `fix/tenant-guard` |
| Commits | [Conventional Commits](https://www.conventionalcommits.org/) | `feat(auth): rotate refresh on reuse` |
| TS/JS | `camelCase` fonctions/vars, `PascalCase` classes | `leaveService`, `TenantContextGuard` |
| Fichiers Nest | `*.module.ts`, `*.controller.ts`, `*.service.ts` | aligné générateur Nest |
| Prisma models | `PascalCase` modèle, `camelCase` champs | `LeaveRequest`, `tenantId` |
| DTOs | suffixe `Dto` | `CreateLeaveRequestDto` |

---

## 3. Structure des dossiers

### Backend (Nest)

- `src/common/` — auth, rbac, tenancy, audit transverses.
- `src/modules/<domaine>/` — contrôleurs, services, DTOs du domaine.
- `prisma/` — schéma, **`migrations/`** (baseline `migrate deploy` ; nouvelles révisions via `migrate dev`), seed.
- `sql/` — scripts ops (**dont `backend/sql/rls.sql`**) versionnés : à **exécuter sur chaque base** ; à **revoir après tout changement de schéma** touchant des tables sous RLS. Prisma ne remplace pas l’activation des politiques en PostgreSQL.

### Flutter (quand ajouté au monorepo)

- Clean Architecture : `lib/core`, `lib/features/<feature>/{data,domain,presentation}`, `lib/shared`.
- State : **Riverpod** ; HTTP : **Dio** ; cache local : **Hive** ; navigation : **GoRouter**.

---

## 4. Multi-tenant (obligatoire)

1. **Toute** requête métier authentifiée porte un contexte tenant : header `x-tenant-id` + cohérence avec le JWT (`TenantContextGuard`).
2. **Toute** requête Prisma sur tables scopées inclut `where: { tenantId }` (défense en profondeur), même si RLS est actif.
3. **PostgreSQL RLS** : les politiques sont définies et activées **en base** (script **`backend/sql/rls.sql`** à appliquer par environnement, puis révisé après évolutions de schéma). L’application doit poser `app.current_tenant` (voir ADR-0002 / extension Prisma **`$extends`** + transaction batch `set_config` + requête) pour que ces politiques soient cohérentes ; sans script SQL appliqué en prod, il n’y a **pas** de RLS utile côté PG quoi que fasse Nest.

---

## 5. Sécurité

- JWT : secrets forts, durées courtes access token, refresh avec rotation et révocation persistée (`UserSession`).
- **Stripe** : vérification signature webhook sur corps brut ; idempotency des événements.
- CORS : origines explicites par environnement ; pas de `*` en prod avec credentials.
- Rate limiting : **Throttler global** (voir [ADR-0005](docs/adr/0005-rate-limiting-global.md)) — **150 req/min/IP** par défaut, **`/auth/*` (login, refresh, logout) 25 req/min/IP**, **webhook Stripe exclu** (`skipIf` + `@SkipThrottle`) ; derrière reverse-proxy de confiance : **`TRUST_PROXY=true`** pour IP client / Throttler via `X-Forwarded-For`. Exploitation : [runbook Agent 10](docs/runbook/AGENT10-rate-limiting-et-proxy.md).
- OWASP : validation stricte DTO (class-validator), pas de concat SQL brute (Prisma), chemins fichiers normalisés, S3 presign TTL court.
- **Aucun secret** dans le dépôt ; `.env.example` sans valeurs réelles.

### Exigences production (non négociables)

- Rotation secrets JWT/Stripe/S3 au moins tous les 90 jours ; procédure de rotation testée en staging.
- Politique mots de passe : min 12 caractères, blocage après 5 tentatives, déblocage par fenêtre glissante ou admin.
- Sessions refresh : device fingerprint minimal, révocation ciblée par session, invalidation globale à la demande user/admin.
- Chiffrement au repos pour sauvegardes DB et fichiers RH sensibles ; TLS 1.2+ partout.

---

## 6. API REST

- Ressources au pluriel où pertinent : `/employees`, `/leave-requests`.
- Pagination : `cursor` ou `page` + `pageSize` documenté ; taille max bornée.
- Erreurs : **RFC 7807** (`application/problem+json`) via `ProblemDetailsExceptionFilter` — champs `type`, `title`, `status`, `detail`, `instance` ; extension **`ev:code`** pour erreurs Prisma / métier (voir [ADR-0004](docs/adr/0004-reponses-erreur-rfc7807.md)).
- Idempotency : `Idempotency-Key` sur POST critiques (billing, paiements) lorsque exposé.

---

## 7. Tests & qualité

- **Cible** : couverture ≥ **70 %** sur modules `auth`, `tenancy`, `rbac`, `employees`, `leave`, `billing` (mesurée progressivement ; exception temporaire = ADR).
- Pyramide : unit (services purs) > intégration (DB test ou testcontainers si adopté) > e2e restreints sur flux signature/webhook.
- CI : `lint`, `build`, `test` obligatoires avant merge sur branche principale.

### Qualité release

- Aucun merge sur `main` sans checklist QA transverse validée par le Chef d’Orchestre.
- Toute PR modifiant paie/congés/permissions inclut au minimum : 1 test nominal, 1 test limite, 1 test refus d’accès.
- Contrat d’API : toute erreur documentée en `problem+json` avec exemple OpenAPI avant release.

---

## 8. SLO / SLI et fiabilité

- **API disponibilité (SLI)** : >= 99.5 % mensuel sur endpoints auth, employés, congés.
- **Latence API (SLI)** : p95 < 500 ms (hors exports lourds async), p99 < 1200 ms.
- **Jobs async (SLI)** : 99 % des jobs notifications traités < 2 minutes.
- **RTO / RPO** : RTO <= 4h, RPO <= 15 min sur prod.
- Toute dérive SLO répétée (2 semaines consécutives) déclenche plan de remédiation prioritaire.

---

## 9. Observabilité & erreurs

- **HTTP 429** (Throttler) : log applicatif `rate_limited` + `eva.http_status=429` (méthode + chemin, sans corps) — voir [runbook Agent 10](docs/runbook/AGENT10-rate-limiting-et-proxy.md).
- Logs JSON : niveau, timestamp, `tenantId` (si autorisé RGPD), `userId`, `requestId`, `route`.
- Sentry (ou équivalent) : DSN en env ; pas de PII dans breadcrumbs.
- Codes erreur métier documentés dans README module ou spec OpenAPI.
- Chaque requête loggue `requestId` corrélable entre API, worker et audit trail.
- Conservation logs sécurité : 12 mois minimum ; accès restreint, traçable.

---

## 10. Données, confidentialité et rétention

- Données RH sensibles (salaire, matricule national, documents contractuels) classées `confidentiel`.
- Soft delete obligatoire sur entités RH ; suppression physique via job d’archivage contrôlé.
- Rétention minimale recommandée : 10 ans pour éléments contractuels/comptables (à ajuster selon obligations client).
- Exports de données signés (horodatage, tenantId, userId initiateur) pour auditabilité.

---

## 11. Internationalisation & locale métier

- **FR** défaut, **EN** secondaire (structure ARB Flutter ; i18n Django si module Django réintégré).
- Devise par défaut **XOF** ; EUR/USD pour reporting groupe avec taux datés et source documentée.
- Dates affichées **JJ/MM/AAAA** ; fuseau **Africa/Ouagadougou** (UTC+0) — stockage UTC ISO en DB.

---

## 12. Accessibilité & performance

- Web : cible **WCAG 2.1 AA** (contraste, focus, labels, clavier).
- Mobile : tailles tactiles, lecteurs d’écran sur parcours employé critique.
- Perf : TTI mobile cible **< 3 s** sur réseau 3G simulé ; API **p95 < 500 ms** sur endpoints liste paginée (hors rapports lourds async).

---

## 13. Conformité Burkina Faso / UEMOA

- Toute évolution **paie / cotisations / impôt / retraite** : revue checklist CNSS, IUTS, SMIG, CARFO (si applicable) + référence légale ou barème daté dans spec / commentaire métier.
- **Congés payés** : règle 2,5 j/mois — implémentée dans moteur métier avec tests barème + cas limite (entrée/sortie milieu de mois).
- **SYSCOHADA** : comptes et sens d’écriture validés avec un référent comptable avant export « officiel ».
- Toute règle légale implémentée doit être versionnée par date d’effet (effective date) et tracée dans un changelog réglementaire.

---

## 14. Gouvernance ADR

- Toute décision transverse (architecture, sécurité, multi-tenant, moteur paie, offline-first, interop comptable) exige ADR.
- Chaque ADR contient critères de réévaluation et impact explicite sur au moins un agent.
- ADR non respecté en code = PR bloquée jusqu’à alignement ou nouvel ADR.

---

## 15. Checklist merge (Chef d’Orchestre / revue)

- [ ] STANDARDS + ADR respectés  
- [ ] Tests ajoutés/verts ; pas de régression modules adjacents  
- [ ] Doc README module + OpenAPI si nouveau endpoint  
- [ ] Pas de secret en dur ; validation DTO ; autorisations RBAC  
- [ ] Pas de N+1 évident ; index Prisma revus si nouvelles requêtes  
- [ ] Si paie/RH légal BF : case métier + tests associés  
- [ ] Si release prod : SLO/SLI monitorés + runbook incident à jour + rollback documenté
