# Changelog reglementaire paie BF

## 2026-05-06 — Gel metier release candidate

Type de changement: `BASELINE`

Parametres figes:
- CNSS salariale `5.5%`, CNSS patronale EVA `16%`.
- Plafond CNSS salariale `800_000 FCFA/mois`.
- Bareme IUTS:
  - `0 - 30_000`: `0%`
  - `30_001 - 50_000`: `12.1%`
  - `50_001 - 80_000`: `13.9%`
  - `80_001 - 120_000`: `15.7%`
  - `120_001 - 170_000`: `18.4%`
  - `170_001 - 250_000`: `21.7%`
  - `> 250_000`: `25%`
- Reductions charges IUTS `0/8/10/12/14%` (0 a 4+ charges).
- Abattement enfants IUTS `5_000` par enfant, max `3`.
- Base IUTS arrondie a la centaine inferieure.
- Abattement FP `20%` cadre superieur, `25%` non cadre.
- Exonerations:
  - Logement `min(round(20%*brut), 75_000, verse)`
  - Fonction `min(round(5%*brut), 50_000, verse)`
  - Transport `min(5%*(brut-cnss_salariale), 30_000, verse)`
- TPA `3%`.
- Retenue `1%`.
- CARFO public `8%`.

Points restants a validation humaine formelle:
- Confirmation juridique du non-plafonnement CNSS patronale en mode EVA.
- Confirmation de la convention d'arrondi unique ("round") sur toutes rubriques monetaires.
- Confirmation ordre/coexistence retenue 1%, FSP, AMU et autres retenues obligatoires.

Impact release:
- Reference normative exploitable QA publiee dans `docs/compliance-bf.md`.
- Go-live legal conditionne a la levee des points `A_VALIDER_JURIDIQUE`.
