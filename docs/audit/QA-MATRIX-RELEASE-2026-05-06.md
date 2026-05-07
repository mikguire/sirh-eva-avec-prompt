# QA matrix — release backend (2026-05-06)

Agent: **AGENT_QA_RELEASE_CI**. Objectif: CI release backend, couverture unitaire par domaines critiques, actions suivantes.

## CI GitHub Actions

| Élément | Statut |
|--------|--------|
| Workflow | `.github/workflows/backend-ci.yml` |
| Job **unit-build** | `npm ci` → `prisma generate` → **`npm run build`** → **`npm run test:cov`** (équiv. **`npm test`** + seuils couverture, sans Postgres) |
| Job **integration-tests** | **`npm run test:int`** après succès de unit-build, service **Postgres 16** ; pas de `SKIP_INT` en CI |
| Blockers connus | Aucun au moment de l’audit : `npm run test:cov` OK localement (exit 0) ; intégration non rejouée localement sans Postgres |

## Couverture unitaire (jest `--coverage`, 2026-05-06)

Seuils globaux (`jest.config.cjs`) : branches ≥ 32 %, fonctions ≥ 45 %, lignes/statements ≥ 48 %.  
Mesure locale : **All files ~70 % statements / ~69 % lines** (au-dessus des seuils).

| Zone (répertoires `src`) | Couverture observée (ordre de grandeur) | Verdict | Actions suivantes |
|--------------------------|----------------------------------------|---------|-------------------|
| **auth** (`modules/auth`, `common/auth`) | Contrôleurs/services/auth guard élevés ; `jwt.strategy.ts` **0 %** | **Partiel** | Ajouter spec ou couvrir via tests intégration sur flux JWT |
| **tenancy** (`common/tenancy`) | Guard + RLS storage **OK** ; `tenant-context.decorator.ts` **~33 %** lignes | **Partiel** | Spec sur décorateur (erreurs / absence de contexte) |
| **rbac** (`common/rbac`) | Guard + decorator **~100 %** lignes | **OK** | Maintenir lors des nouvelles permissions |
| **employees** (`modules/employees`) | **100 %** controller/service/DTO | **OK** | — |
| **leave** (`modules/leave`) | **100 %** controller/service/DTO | **OK** | — |
| **billing** (`modules/billing`) | Controllers forts ; `billing-webhook.service` branches **~33 %** | **Partiel** | Compléter branches métier (idempotence, erreurs Stripe) |
| **payroll-bf** (`modules/payroll-bf`) | Calculator/service **OK** ; `payroll-bf.controller.ts` **0 %** ; DTO réponse **0 %** | **Partiel** | Spec controller HTTP ou renforcer intégration `payroll.simulate` |

## Gaps transverses (hors tableau modules)

- **`prisma/prisma.service.ts`** : faible couverture (logique `$extends` / transactions) — acceptable si sécurisé par **tests d’intégration** ; à surveiller lors des montées Prisma.
- **Contrôleurs sans spec unitaire** : `admin.controller`, `audit`, `files`, `notifications`, `payroll-bf` — risque réduit si E2E/intégration couvrent les routes critique ; sinon ajouter specs ciblées.

## Références

- `backend/README.md` — commandes `npm test`, `npm run test:cov`, `test:integration` / `SKIP_INT=1`.
- `backend/jest.config.cjs` — seuils et `collectCoverageFrom`.
