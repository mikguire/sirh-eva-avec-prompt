# EVA Backend

Backend SaaS RH multi-tenant base with NestJS + Prisma + PostgreSQL.

## Covered domains

- Multi-tenant data model (`tenant_id` enforced in business tables)
- Auth foundation (`/auth/login`, JWT access/refresh)
- Refresh token rotation with persisted sessions (`UserSession`)
- RBAC (roles, permissions, endpoint-level guards)
- Employees APIs (`GET/POST /employees`)
- Leave APIs (`POST /leave-requests`, `POST /leave-requests/:id/approve`)
- Billing API (`GET /billing/subscription`)
- Stripe webhook (`POST /billing/webhook`) : **route publique** (sans JWT ni `x-tenant-id`), authentification par en-tête `Stripe-Signature` + `STRIPE_WEBHOOK_SECRET`, idempotence `lastWebhookEventId`, mise à jour subscription dans une transaction avec `set_config('app.current_tenant', …)` pour la RLS
- Files upload presign endpoint (`POST /files/presign-upload`)
- Notifications queue endpoints (`POST /notifications`, `POST /notifications/dispatch`)
- BullMQ async processing (`npm run worker:notifications`)
- Admin API (`GET /admin/tenants`)
- Admin impersonation endpoint (`POST /admin/impersonate`) with audit trail
- Audit logs (`GET /audit-logs`, automatic writes on employee creation)
- Notifications and subscriptions tables in Prisma schema
- OpenAPI docs at `/api/docs`
- Erreurs HTTP au format **RFC 7807** (`application/problem+json`, filtre global — voir `src/common/http/problem-details.filter.ts` et [ADR-0004](../docs/adr/0004-reponses-erreur-rfc7807.md))
- Rate limiting **Throttler** : **150 req/min/IP** par défaut ; routes **`/auth/*`** (login, refresh, logout) **25 req/min/IP** ; webhook Stripe exclu — [ADR-0005](../docs/adr/0005-rate-limiting-global.md)
- **`TRUST_PROXY`** : si `true` ou `1`, Express applique **`trust proxy`** (une couche) pour que le Throttler et l’IP client derrière Nginx/Traefik utilisent **`X-Forwarded-For`** — voir `.env.example`

## Project layout

```txt
backend/
  prisma/
    schema.prisma
    seed.ts
  src/
    common/
      auth/
      rbac/
      tenancy/
      audit/
    modules/
      auth/
      employees/
      leave/
      files/
      notifications/
      audit/
      billing/
      admin/
```

## Quick start

1. Copy env:
   - `cp .env.example .env`
   - En prod derrière reverse-proxy de confiance : `TRUST_PROXY=true` (voir [ADR-0005](../docs/adr/0005-rate-limiting-global.md))
2. Install:
   - `npm install`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Schéma PostgreSQL (migrations versionnées sous `prisma/migrations/`) :
   - Base **vide** ou alignée CI : `npm run prisma:migrate:deploy`
   - Développement (créer / ajuster des migrations) : `npm run prisma:migrate` (`prisma migrate dev`)
   - Si la base locale a été créée **uniquement** avec `db push` et que les tables existent déjà : repartir sur une base vide **ou**, après vérification du schéma, `npx prisma migrate resolve --applied 20260204120000_init`
5. Seed roles/permissions:
   - `npm run prisma:seed`
6. Start API:
   - `npm run start:dev`  
   - **Prisma** : contexte tenant en base via **extension `$extends`** (`set_config` + requête dans une **`$transaction` batch** sur la même connexion — successeur de **`$use`**, compatible Prisma **≥ 6.14**). La version dans **`package.json`/`package-lock.json`** peut être montée après **`npm install`** + **`npm test`** / **`npm run test:int`**.
7. Start notification worker (separate process):
   - `npm run worker:notifications`
8. Tests unitaires :
   - `npm test`
9. Couverture (seuil global lignes ≥ 48 %, voir `jest.config.cjs`) :
   - `npm run test:cov`
10. **CI GitHub Actions** (`.github/workflows/backend-ci.yml`) :
    - Job **unit-build** : `npm ci`, `prisma generate`, **`npm run build`**, **`npm run test:cov`** (même suite Jest que `npm test`, avec couverture — pas de Postgres).
    - Job **integration-tests** (après succès du précédent) : Postgres 16 en service, puis **`npm run test:int`** (`migrate deploy` + seed + Jest intégration). En CI, **`SKIP_INT` n’est pas défini** — les tests d’intégration sont **obligatoires**.
11. Tests d’intégration (PostgreSQL requis, ex. `docker compose up -d --wait` + base `eva_test`) :
   - `npm run test:integration` (alias conservé: `npm run test:int`)  
  - Le script exécute automatiquement : **db check TCP + authentification** → **`prisma migrate deploy`** → **`prisma seed`** → **Jest integration**.
   - **`DATABASE_URL` pour l’intégration** : par défaut **`postgresql://postgres:postgres@127.0.0.1:5432/eva_test`** (aligné sur `docker-compose.yml`), pour éviter qu’un `DATABASE_URL` métier dans **`backend/.env`** ne fasse échouer la suite (**P1000**). Surcharge : **`INTEGRATION_DATABASE_URL`** (variable d’environnement).
   - **`backend/.env`** reste chargé pour JWT / Stripe / autres secrets ; seule l’URL Postgres des tests d’intégration suit la règle ci-dessus.
   - En cas d’échec **P1000 (Authentication failed)**, vérifiez que Postgres tourne (`docker compose up -d`) et que **`INTEGRATION_DATABASE_URL`** (si défini) correspond aux identifiants du conteneur (`EVA_POSTGRES_*`).
  - Si la base n’est pas joignable **ou** si les identifiants ne correspondent pas, `npm run db:check` échoue avec une erreur actionnable (URL masquée, hôte/port visés + action Docker suggérée).  
   - Sans Postgres local : **`SKIP_INT=1 npm run test:integration`** saute toute la suite (utile pour un contrôle rapide du pipeline sans Docker).
   - Scénarios sécurité/conformité couverts: auth nominale + rotation refresh (ancien token invalide), isolement tenant (`x-tenant-id` vs JWT), refus RBAC (`payroll.simulate`), rejet webhook Stripe signature invalide, et simulation paie BF (champs métier attendus).

## Example API calls

### Login

`POST /api/v1/auth/login`

```json
{
  "email": "owner@acme.fr",
  "password": "MyStrongPassword1!",
  "tenantId": "ten_acme"
}
```

### Refresh token

`POST /api/v1/auth/refresh`

```json
{
  "refreshToken": "<refresh-token>"
}
```

### Create employee

`POST /api/v1/employees` with headers:
- `Authorization: Bearer <token>`
- `x-tenant-id: ten_acme`

```json
{
  "workEmail": "lea.martin@acme.fr",
  "firstName": "Lea",
  "lastName": "Martin",
  "hireDate": "2026-05-01"
}
```

### Approve leave request

`POST /api/v1/leave-requests/lr_123/approve` with headers:
- `Authorization: Bearer <token>`
- `x-tenant-id: ten_acme`

### Presign upload

`POST /api/v1/files/presign-upload` with headers:
- `Authorization: Bearer <token>`
- `x-tenant-id: ten_acme`

```json
{
  "fileName": "contract-lea.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 380000
}
```

### Admin impersonation

`POST /api/v1/admin/impersonate` with headers:
- `Authorization: Bearer <platform-admin-token>`

```json
{
  "tenantId": "ten_acme",
  "userId": "usr_123"
}
```

## Security runbook

- Rate limiting & proxy en prod : [docs/runbook/AGENT10-rate-limiting-et-proxy.md](../docs/runbook/AGENT10-rate-limiting-et-proxy.md) ; chaque **429** émet un log **`Logger.warn`** avec préfixe `rate_limited` et `eva.http_status=429` (grep / alertes).
- **RLS PostgreSQL** : appliquer **`sql/rls.sql` sur chaque environnement** (dev / staging / prod). Prisma + Nest posent le **contexte** `app.current_tenant` ; **ils ne remplacent pas** l’activation des politiques en base. Après **chaque changement de schéma** susceptible d’impacter la RLS, **revoir et réappliquer** (ou adapter) ce script — voir [ADR-0002](../docs/adr/0002-rls-prisma-set-tenant.md) annexe.
- **Migrations Prisma** : baseline **`prisma/migrations/`** ; flux **`migrate deploy` → seed → `sql/rls.sql`** sur chaque env ([ADR-0002](../docs/adr/0002-rls-prisma-set-tenant.md)). **`npm run test:int`** applique **`migrate deploy`** avant seed. Nouvelles évolutions : **`migrate dev`** + commit SQL (éviter **`db push`** sur branches partagées).
- **Prisma / RLS** : **`$use` retiré** au profit de **`$extends`** + **`$transaction` batch** ([doc migrations middleware → extensions](https://github.com/prisma/prisma/issues/27891)). Monter **`prisma` / `@prisma/client`** (ex. **6.19+**) après **`npm install`** et batteries de tests.
- Configure strong JWT secrets in `.env` (en **production**, `NODE_ENV=production`, secrets obligatoires et **≥ 32 caractères** — le serveur refuse de démarrer sinon).
- Configure `STRIPE_WEBHOOK_SECRET` and verify webhook signature.
- Ensure Nest runs with raw body enabled for `/billing/webhook` signature checks.
- Les routes métier authentifiées exigent `x-tenant-id` (via `TenantContextGuard`) ; **le webhook Stripe est une exception** documentée (ADR-0003).
- Use dedicated IAM credentials for S3 presigning and least-privilege bucket policy.
- Configure `REDIS_URL` for BullMQ workers and monitor failed jobs.
