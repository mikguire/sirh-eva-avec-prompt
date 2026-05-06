# ADR-0007 : Convergence backend legacy Django et socle API actuel

Date : 2026-05-05
Statut : Propose
Decideur : Chef d'Orchestre (validation finale : Mickael)

## Contexte

La vision cible impose Django/DRF comme backend historique a conserver, alors que le depot operationnel actuel est sur NestJS/Prisma avec des fondations multi-tenant deja en place.
Une reecriture immediate vers Django casserait le rythme de livraison V1 et introduirait un risque calendrier/qualite eleve.
Le legacy Django n'est pas encore auditable dans ce repo (code source non present ici).

Agents concernes : 1, 5, 7, 8, 9, 10.

## Options envisagees

Option A — Reprise immediate full Django/DRF
Pour : alignement strict avec la stack cible historique.
Contre : rework massif, dette de migration, risque de regression et retard majeur V1.

Option B — Continuer 100 % sur socle actuel et abandonner l'option Django
Pour : vitesse et simplicite d'execution.
Contre : perte potentielle de logique metier deja validee en legacy (CNSS/IUTS/SMIG/CARFO).

Option C — Convergence progressive ("strangler")
Pour : maintenir la livraison sur socle actuel, auditer/importer le legacy Django module par module, et ne migrer que les domaines au ROI > 3x.
Contre : complexite de gouvernance (double referentiel temporaire), besoin d'une discipline ADR stricte.

## Decision

Option C recommandee.

On garde le socle actuel pour delivrer V1 sans rupture, tout en lançant un audit formel du legacy Django et une matrice de convergence par domaine (auth, employes, conges, paie).
Chaque bascule de domaine vers Django (ou conservation Nest) sera decidee par ADR avec ROI explicite et plan de migration/tests.
Aucune reecriture globale n'est autorisee sans validation explicite Mickael.

## Consequences

Positives :
- V1 continue sans blocage architecture.
- Capital metier legacy preservable de facon selective.
- Risque legal reduit sur modules paie si legacy contient deja des regles conformes.

Negatives / dette :
- Gouvernance plus lourde a court terme.
- Besoin d'outils de comparaison fonctionnelle entre legacy et socle actuel.

Impact sur agents :
- Agent 8 : produit une matrice endpoint/modeles "legacy vs actuel".
- Agent 5 : maintient une source de verite fonctionnelle unique (PRD) independante de la techno.
- Agent 1 : arbitre la priorisation business des domaines a converger.
- Agent 9 : prepare plan anti-regression lors de toute bascule.

## Criteres de reevaluation

- Legacy Django audite et couverture metier objectivement superieure sur >= 2 domaines critiques.
- Cout estime d'entretien double stack > benefice fonctionnel.
- Exigence client/partenaire imposant une stack backend unique.
