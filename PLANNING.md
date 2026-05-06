# SIRH EVA — PLANNING.md

_Dernière mise à jour : 2026-05-05 · Chef d’Orchestre · Validation finale : Mickael_

## 1. État réel du programme (source de vérité)

- Ce repo est piloté sur un backend `NestJS + Prisma + PostgreSQL + Redis` et un `mobile/` Flutter présent.
- Le legacy `Django/DRF` reste une source métier potentielle externe, non fusionnée dans ce repo (ADR-0001).
- Les fondations sécurité/tenancy (RLS, webhook Stripe, RFC7807, throttling) sont cadrées et implémentées (ADR-0002 à 0005).
- Le cadre paie/conformité est tranché : moteur réglementaire BF versionné par date d'effet (ADR-0006).
- La convergence avec le legacy Django est tranchée : intégration progressive sans réécriture big-bang (ADR-0007).
- Le prochain goulot critique n’est plus l’infrastructure, mais la livraison métier BF testée (congés, paie, conformité).

## 2. Roadmap globale (V1, V2, V3) avec cibles

| Version | Fenêtre cible | Objectif produit | Critères de sortie |
|---|---|---|---|
| V1 (MVP exploitable) | 2026-05-11 → 2026-07-05 | Onboarding tenant, auth/RBAC, employés, congés v1, billing SaaS, audit | 0 P0/P1 ouverts, couverture modules critiques >= 70 %, runbooks prod prêts |
| V2 (opérations RH BF) | 2026-07-06 → 2026-09-13 | Présence + exports comptables SYSCOHADA + validations managers avancées | Exports validés comptable pilote, SLO API tenus 4 semaines |
| V3 (paie BF/UEMOA) | 2026-09-14 → 2026-12-20 | Moteur paie CNSS/IUTS/SMIG/CARFO, reporting multi-devise | Barèmes versionnés, tests non-régression paie, audit légal signé |

## 3. Sprints de 2 semaines (SMART)

### Sprint S1 — Stabilisation prod MVP (2026-05-11 au 2026-05-24)
**Objectif SMART** : porter la couverture des modules critiques de 48 % à 60 %, fermer les écarts de documentation API, et établir les SLO/SLI de prod.

| ID | Tâche | Owner | Statut | Dépendances |
|---|---|---|---|---|
| S1-1 | Couverture tests `auth/tenancy/rbac/employees/leave/billing` >= 60 % | Agent 8 | À faire | ADR-0002/4/5 |
| S1-2 | Runbook incidents P1 (auth indisponible, fuite tenant, webhook backlog) | Agent 10 | À faire | S1-1 |
| S1-3 | Catalogue erreurs métier `ev:code` v1 + OpenAPI | Agent 5 | À faire | ADR-0004 |
| S1-4 | Parcours mobile login → congé → approbation (test manuel scripté) | Agent 3 | À faire | S1-1, S1-3 |
| S1-5 | Legacy parity matrix Django vs socle actuel (auth, employés, congés, paie) | Agent 5 | À faire | ADR-0001, ADR-0007 |

### Sprint S2 — Conformité congés BF (2026-05-25 au 2026-06-07)
**Objectif SMART** : implémenter et prouver la règle de congés payés 2,5 j/mois avec cas d’entrée/sortie en cours de mois.

| ID | Tâche | Owner | Statut | Dépendances |
|---|---|---|---|---|
| S2-1 | PRD congés BF (règles, exceptions, pièces justificatives) | Agent 5 | En cours | Agent 1 |
| S2-2 | API accumulation congés + tests barèmes | Agent 8 | À faire | S2-1 |
| S2-3 | Écrans mobile/web de soldes et demandes congés | Agent 2 | À faire | S2-1 |
| S2-4 | Composants DS (badge statut, timeline validations) | Agent 6 | À faire | S2-3 |
| S2-5 | Implémentation app (Flutter/web) | Agent 7 | À faire | S2-2, S2-4 |

### Sprint S3 — Préparation paie BF (2026-06-08 au 2026-06-21)
**Objectif SMART** : verrouiller l’architecture paie (barèmes versionnés + simulations) sans mise en production de paie finale.

| ID | Tâche | Owner | Statut | Dépendances |
|---|---|---|---|---|
| S3-1 | ADR moteur paie (barèmes versionnés date-effective) | Chef d’Orchestre | En cours | Audit legacy |
| S3-2 | Backlog paie priorisé MoSCoW + découpage releases | Agent 1 | À faire | S3-1 |
| S3-3 | Prototype API simulation bulletin sans persist | Agent 8 | À faire | S3-1 |
| S3-4 | Jeux de tests de non-régression paie depuis legacy parity matrix | Agent 8 | À faire | S1-5, S3-1 |

## 4. Backlog MoSCoW global

### Must
- Couverture tests modules critiques >= 70 % avant merge principal.
- RLS active sur tous environnements + check de non-régression post-migration.
- Conformité congés BF (2,5 j/mois) testée et documentée.
- Journal d’audit inviolable sur actions RH sensibles (contrat, congé, paie).
- Parité métier documentée avec le legacy (ou décision d'écart validée).

### Should
- SLO API p95 < 500 ms sur endpoints listés.
- Table de correspondance `ev:code` <-> message front FR/EN.
- Dashboards incidents (429, 401, erreurs Prisma, latence DB).

### Could
- Migration `cuid` vers UUID v7 (si exigences interop/GDPR tooling).
- Read replica PostgreSQL pour analytics.

### Won't (sans ADR accepté)
- Réécriture du backend en Django.
- GraphQL public API.
- Offline-first mobile complet sur modules paie.

## 5. Graphe dépendances agents (orchestration)

```text
[1 CPO] -> [5 PRD] -> [2 UX] -> [6 Design System] -> [7 Code Starter]
                 \-> [8 Backend/API] -----------/
[3 Parcours] alimente [2 UX] et [7 Code Starter]
[10 Lancement] dépend de [7] + [8] + runbooks validés
[9 Debugging] transverse, activé en P1/P0
```

Règle stricte : une tâche = un owner unique ; les autres agents sont contributeurs, jamais copropriétaires.

## 6. Prochaine action critique (unique)

**Lancer S1-1 immédiatement** : augmenter la couverture modules critiques à 60 % avec preuve CI et rapport par module.  
Raison : c’est le verrou commun qui débloque QA transverse, release readiness, et confiance conformité.

## 7. Journal de pilotage

| Date | Événement |
|---|---|
| 2026-05-05 (3) | ADR-0007 accepté : convergence progressive Django legacy -> socle actuel, sans réécriture big-bang ; ajout S1-5 et S3-4 pour parité métier. |
| 2026-05-05 (2) | Délégation formelle S2-1 à Agent 5 : PRD Congés BF en cours (brief orchestration publié). |
| 2026-05-05 | Rebaselining du planning vers un pilotage production (roadmap datée, dépendances agents explicites, objectifs SMART par sprint). |
| 2026-05-04 | Fondations tenancy/sécurité/API stabilisées (ADR-0002 à ADR-0005) et runbooks initiaux publiés. |
