## 2026-04-30 10:08 UTC - ORCHESTRATOR DIRECTIVES

### DIRECTIVE 1 - BACKEND SECURITY (CRITICAL)
- Agent: backend-security
- Context: Stripe webhook currently accepts payload updates without cryptographic signature verification.
- Objective: Implement proper Stripe signature verification with raw request body validation and reject invalid events.
- Scope in: `backend/src/modules/billing/*`, Nest bootstrap/middleware setup for raw body, env docs.
- Scope out: Billing plan logic redesign, invoice workflows.
- Constraints: No inline imports; preserve existing API routes; fail closed on invalid signature.
- Deliverables: code + automated tests (valid signature, invalid signature, replay idempotency) + README update.
- Validation criteria: lint/build pass; webhook updates only when signature is valid; no auth token required on webhook endpoint.
- Priority: 🟠
- Deadline: 1 day

### DIRECTIVE 2 - QA/API TESTS (IMPORTANT)
- Agent: qa-backend
- Context: Backend has no visible automated test suite for auth, tenant scoping, RBAC, and leave/billing flows.
- Objective: Add baseline integration tests for critical modules.
- Scope in: `backend/src/modules/auth`, `backend/src/modules/employees`, `backend/src/modules/leave`, `backend/src/modules/billing`.
- Scope out: Frontend/design-system tests.
- Constraints: Focus on high-risk paths; keep tests deterministic.
- Deliverables: tests + npm scripts (`test`, `test:integration`) + short test runbook.
- Validation criteria: tests run in CI/local and cover tenant mismatch, permission denial, refresh rotation.
- Priority: 🟡
- Deadline: 2 days

### DIRECTIVE 3 - CONFORMITE RH BF (CRITICAL)
- Agent: backend-domain-rh
- Context: User validated compliance-first strategy for Burkina Faso payroll/legal rules before new generic features.
- Objective: Implement baseline payroll compliance domain for BF: CNSS split (5.5% employee / 16% employer), IUTS brackets configuration, CARFO, and SMIG floor checks.
- Scope in: domain module + calculation service + DTO/contracts + persistence schema/migration + API endpoints for simulation.
- Scope out: full payroll UI and accounting export integrations.
- Constraints: deterministic rounding policy documented, amounts in XOF, auditability of inputs/outputs, no hardcoded secrets.
- Deliverables: code + unit tests for all formula cases + sample fixtures + docs (`docs/compliance-bf.md`).
- Validation criteria: tests prove statutory rates and threshold behavior; API rejects salaries below SMIG when business rule enabled.
- Priority: 🟠
- Deadline: 3 days

## 2026-05-06 12:50 UTC - ORCHESTRATOR SEQUENTIAL EXECUTION PLAN

Execution mode validated by user: **sequential only**.

Order:
1. `AGENT_DOC_COMPLIANCE`
2. `AGENT_BACKEND_DOMAIN_RH`
3. `AGENT_QA_BACKEND`

Rule:
- Start next agent only after previous agent delivers final output and review passes.

## 2026-05-06 13:17 UTC - ORCHESTRATOR EXECUTION MODE UPDATE

Execution mode updated after user decision:
- Concurrency: **2 agents max in parallel** (controlled).
- Policy: run independent workstreams together; keep hard dependencies sequential.

## 2026-05-06 13:04 UTC - ORCHESTRATOR GLOBAL DELIVERY PLAN

═══════════════════════════════════════════
🎯 DIRECTIVE → [AGENT_DEVOPS_INFRA]
═══════════════════════════════════════════
CONTEXTE   : Les tests d'integration restent fragiles selon l'environnement local (DB non alignee), ce qui bloque la validation release.
OBJECTIF   : Stabiliser l'environnement local/CI pour executer `test:integration` de facon reproductible.
PÉRIMÈTRE  : INCLUS `docker-compose.yml`, `backend/.env.example`, scripts de bootstrap test DB, documentation runbook. EXCLU logique metier API.
CONTRAINTES: Pas de secrets en dur, compatibilite Mac/Linux, execution en < 5 min.
LIVRABLE   : Pipeline local reproductible (compose + migrate + seed + test:integration) + doc pas-a-pas.
CRITÈRES   : `npm run test:integration` passe sur environnement propre sans intervention manuelle.
PRIORITÉ   : 🔴
DEADLINE   : 1 jour
═══════════════════════════════════════════

═══════════════════════════════════════════
🎯 DIRECTIVE → [AGENT_BACKEND_LEAVE_BF]
═══════════════════════════════════════════
CONTEXTE   : Le planning cible la conformite conges BF (2,5 j/mois) comme livrable metier immediat.
OBJECTIF   : Implementer le moteur conges BF v1 (acquisition mensuelle, prorata entree/sortie, soldes) avec API et tests.
PÉRIMÈTRE  : INCLUS `backend/src/modules/leave/*`, modeles Prisma associes, tests unitaires/integration. EXCLU UI mobile/web.
CONTRAINTES: Multi-tenant strict, audit log sur actions critiques, RFC7807 sur erreurs metier.
LIVRABLE   : Endpoints soldes/acquisition + moteur de calcul + tests cas limites.
CRITÈRES   : Cas 2,5 j/mois verifies, prorata exact valide, couverture module leave >= 70%.
PRIORITÉ   : 🔴
DEADLINE   : 3 jours
═══════════════════════════════════════════

═══════════════════════════════════════════
🎯 DIRECTIVE → [AGENT_QA_RELEASE]
═══════════════════════════════════════════
CONTEXTE   : Les fondamentaux backend sont en place mais la release manque une preuve QA transversale consolidée.
OBJECTIF   : Produire une matrice de validation release (auth, tenancy, rbac, billing webhook, payroll-bf, leave-bf).
PÉRIMÈTRE  : INCLUS `backend/test/integration`, rapport couverture, checklist release. EXCLU nouvelles features produit.
CONTRAINTES: Tests deterministes, separation clair unit/integration, execution CI compatible.
LIVRABLE   : Rapport QA avec taux couverture par module + liste des gaps bloquants/non bloquants.
CRITÈRES   : Aucune regression P0/P1, modules critiques >= 70% ou derogation motivee.
PRIORITÉ   : 🟠
DEADLINE   : 2 jours
═══════════════════════════════════════════

═══════════════════════════════════════════
🎯 DIRECTIVE → [AGENT_PRODUCT_COMPLIANCE]
═══════════════════════════════════════════
CONTEXTE   : `docs/compliance-bf.md` contient des hypotheses juridiques explicites a valider avant production.
OBJECTIF   : Valider/ajuster les hypotheses A_VALIDER_JURIDIQUE (CNSS/IUTS/CARFO/SMIG/arrondis) et publier valeurs officielles datees.
PÉRIMÈTRE  : INCLUS `docs/compliance-bf.md`, `docs/adr/*` si impact de decisions. EXCLU implementation technique.
CONTRAINTES: Toute modification doit etre sourcee et datee, aucune ambiguite de calcul.
LIVRABLE   : Version juridiquement validee du document + changelog reglementaire.
CRITÈRES   : Zero hypothese critique non tranchee pour paie BF.
PRIORITÉ   : 🟠
DEADLINE   : 2 jours
═══════════════════════════════════════════

═══════════════════════════════════════════
🎯 DIRECTIVE → [AGENT_MOBILE_FLOW]
═══════════════════════════════════════════
CONTEXTE   : Le backend progresse plus vite que les parcours utilisateurs, risque de desalignement produit.
OBJECTIF   : Connecter et valider le parcours mobile login -> demande de conge -> approbation avec APIs actuelles.
PÉRIMÈTRE  : INCLUS `mobile/*` et contrats API existants. EXCLU refonte design system.
CONTRAINTES: Respect auth JWT + `x-tenant-id`, gestion erreurs RFC7807 cote client.
LIVRABLE   : Flux fonctionnel demonstrable + script de test manuel reproductible.
CRITÈRES   : Parcours complet execute sans blocage sur environnement de test.
PRIORITÉ   : 🟡
DEADLINE   : 4 jours
═══════════════════════════════════════════

## 2026-05-06 — Délégation utilisateur « prochaines étapes »

Mode : **2 agents max en parallèle** ; lots séquentiels pour limiter les conflits Git.

| Lot | Agents | Focus |
|-----|--------|--------|
| A | `AGENT_DEVOPS_MAKEFILE` + `AGENT_BACKEND_LEAVE_BF` | Makefile racine + chaîne intégration documentée ; moteur congés BF |
| B | `AGENT_PRODUCT_COMPLIANCE_SIGNOFF` + `AGENT_MOBILE_LEAVE_FLOW` | Doc checklist signature métier/juridique ; parcours Flutter congés |
| C | `AGENT_QA_RELEASE_CI` | Couverture, CI, matrice release (après A/B si besoin de rebasing) |
