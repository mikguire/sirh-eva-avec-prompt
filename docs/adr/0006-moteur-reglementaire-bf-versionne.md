# ADR-0006 : Moteur reglementaire BF versionne par date d'effet

Date : 2026-05-05
Statut : Accepte
Decideur : Chef d'Orchestre (validation finale : Mickael)

## Contexte

Les modules paie/conges RH Burkina Faso doivent rester conformes dans le temps (CNSS, IUTS, SMIG, CARFO, droit du travail). Les baremes changent regulierement. Un calcul "en dur" dans le code cree un risque de non-conformite silencieuse et de regressions historiques.

Agents concernes : Agent 5 (PRD), Agent 8 (Backend/API), Agent 7 (Code Starter), Agent 9 (Debugging), Agent 10 (Lancement).

## Options envisagees

Option A — Baremes hardcodes dans le code applicatif
Pour : implementation rapide.
Contre : dette forte, mise a jour risquee, audit legal difficile.

Option B — Tables reglementaires versionnees (effective_start/effective_end) + moteur de calcul deterministe testable
Pour : tracabilite, recalcul historique, changement reglementaire sans redeploiement majeur.
Contre : complexite modele + migration donnees + discipline produit/ops.

Option C — Service externe paie
Pour : transfert d'une partie du risque legal.
Contre : cout recurrent, dependance fournisseur, personnalisation BF/UEMOA limitee.

## Decision

Option B retenue.

Les regles CNSS/IUTS/SMIG/CARFO et conges legaux sont stockees dans des tables versionnees par date d'effet.
Le moteur applique la version en vigueur a la date de paie (ou date de reference) avec calcul deterministe et tests de non-regression.
Le code n'embarque pas de baremes reglementaires en dur, hors constantes techniques.

## Consequences

Positives :
- Auditabilite forte (qui a calcule quoi, avec quelle version reglementaire).
- Recalcul historique possible en cas de controle.
- Maitrise du risque legal et des regressions.

Negatives / dette :
- Modelisation plus lourde (tables, seed, administration des baremes).
- Besoin d'un workflow de validation metier avant activation d'une nouvelle version.

Impact sur agents :
- Agent 5 : definir schema de verite metier + cas limites.
- Agent 8 : implementer tables versionnees et moteur.
- Agent 7 : exposer UI de simulation avec explication detaillee du calcul.
- Agent 9 : ajouter playbook incident "ecart de paie".
- Agent 10 : ajouter runbook go-live legal (checklist avant cloture mensuelle).

## Criteres de reevaluation

- Si plus de 3 evolutions reglementaires majeures/an rendent le maintien interne trop couteux.
- Si un partenaire externe offre une couverture BF/UEMOA verifiable avec SLA superieur.
- Si les exigences d'audit client imposent un moteur certifie tiers.
