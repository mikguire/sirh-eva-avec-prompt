# ADR-0007 : Strategie de convergence Django legacy vers socle actuel

Date : 2026-05-05
Statut : Accepte
Decideur : Chef d'Orchestre (validation finale : Mickael)

## Contexte

La cible produit declare un backend Django/DRF multi-tenant deja existant, mais le socle executable du repo est un backend NestJS/Prisma en production engineering.
Une reecriture immediate vers Django violerait la regle "pas de re-ecriture sans ROI > 3x".
En parallele, ignorer le legacy Django est risqué sur la conformite RH/paie BF si des regles y sont deja implementees.

Agents concernes : Agent 1, Agent 5, Agent 8, Agent 9, Agent 10.

## Options envisagees

Option A — Migration totale immediate vers Django/DRF
Pour : alignement direct avec la stack cible.
Contre : cout eleve, interruption delivery, risque regression securite/tenancy, ROI non prouve.

Option B — Maintenir Nest comme runtime principal et integrer progressivement le legacy Django comme source metier verifiee (specs, baremes, tests de non-regression)
Pour : preserve la velocite, limite le risque produit, capitalise le legacy sans big-bang.
Contre : periode transitoire avec double referentiel a gouverner strictement.

Option C — Double run durable (Nest et Django en production)
Pour : continuité potentielle.
Contre : complexite operationnelle et cout trop importants pour une equipe de cette taille.

## Decision

Option B retenue.

Nest reste le socle runtime principal pour V1/V2. Le legacy Django est traite comme reference metier a auditer et importer de facon gouvernee
(regles, jeux de tests, specs API, baremes legaux), sans bascule big-bang.
Toute extraction fonctionnelle du legacy vers le socle actuel passe par tickets traces dans PLANNING et validation QA transverse.

## Consequences

Positives :
- Pas de gel delivery.
- Reduction du risque de re-ecriture massive.
- Conservation du capital metier historique si disponible.

Negatives / dette :
- Besoin d'un protocole de comparaison Nest vs legacy (regles, resultats, cas limites).
- Charge supplementaire sur Agent 5 et Agent 8 pour maintenir l'alignement.

Impact sur agents :
- Agent 5 : formaliser "legacy parity matrix" par module.
- Agent 8 : implementer tests de non-regression metier adosses a la matrice.
- Agent 9 : playbook incident ecart de calcul legacy vs courant.
- Agent 10 : surveiller KPI de divergence en pre-prod.

## Criteres de reevaluation

- Legacy Django indisponible ou inexploitable apres audit formel.
- ROI documente > 3x pour migration complete vers Django.
- Contraintes client/contractuelles imposant stack Django unique en production.
