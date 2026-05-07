# Compliance BF — Sign-off packet

Statut: `READY_FOR_REVIEW`
Dernière mise à jour: `2026-05-07`
Référence normative: `docs/compliance-bf.md`
Changelog réglementaire: `docs/compliance-bf-changelog.md`

## 1) Objectif

Ce packet centralise les décisions à valider par Métier/Juridique/DAF pour lever les points `A_VALIDER_JURIDIQUE` bloquants go-live légal.

## 2) Décisions attendues (obligatoires)

| ID | Sujet | Décision attendue | Choix | Impact technique |
|---|---|---|---|---|
| DEC-01 | CNSS patronale | L'assiette `round(brut * 0.16)` sans plafond est-elle validée ? | [ ] Oui / [ ] Non | Si Non: ajouter plafond employeur + migration paramètres |
| DEC-02 | Règle d'arrondi | Convention unique d'arrondi monétaire (arrondi mathématique à l'unité) validée ? | [ ] Oui / [ ] Non | Si Non: implémenter convention par rubrique et tests dédiés |
| DEC-03 | Coexistence retenues | Ordre de calcul final entre retenue 1%, FSP, AMU et retenues obligatoires validé ? | [ ] Oui / [ ] Non | Si Non: revoir séquence normative et moteur |

## 3) Preuves QA attendues pour signature

- PV de calcul manuel sur 3 profils: bas salaire, salaire médian, salaire élevé.
- Reconciliation moteur vs tableur référence sur:
  - CNSS salariale/patronale,
  - IUTS brut/net,
  - abattements/exonérations,
  - net final.
- Scénarios multi-retenues (`1%`, FSP, AMU, autres) avec ordre explicite.
- Trace de non-régression sur le cas de référence (`docs/compliance-bf.md`, section 8).

## 4) Check-list de validation formelle

| Domaine | Responsable | Validation | Date | Signature |
|---|---|---|---|---|
| Métier Paie |  | [ ] |  |  |
| Juridique social/fiscal |  | [ ] |  |  |
| DAF / Comptabilité |  | [ ] |  |  |
| Tech Lead backend |  | [ ] |  |  |
| Orchestrator |  | [ ] |  |  |

## 5) Verdict go-live légal

- [ ] **GO**: toutes les décisions DEC-01..03 validées + preuves QA attachées.
- [ ] **NO-GO**: au moins une décision non tranchée.

Commentaires / réserves:

- 
- 
- 
