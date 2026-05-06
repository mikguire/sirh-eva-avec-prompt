# Parametres du moteur de paie — EVA SIRH (norme metier)

## 1. Portee et reference normative

Ce document devient la reference de calcul paie Burkina Faso pour EVA SIRH.
Il remplace les hypotheses precedentes et reprend les regles "version Micky"
fournies par l'utilisateur (abattements, exonerations, plafond CNSS 800 000 FCFA,
base IUTS a la centaine).

Note projet:
- Les chemins `sirh/eva-rh.html` et `sirh/sql_files/*` cites dans la norme source ne sont pas presents dans ce repository.
- Dans ce repo, la cible d'implementation reste le backend Nest/Prisma (`backend/src/modules/payroll-bf`), avec alignement fonctionnel strict sur cette norme.

## 2. Parametres obligatoires

### 2.1 CNSS
- CNSS salariale: `5.5%`
- CNSS patronale: `16%`
- Plafond assiette CNSS salariale: `800_000 FCFA` / mois
- Formule salariale: `round(min(brut, 800_000) * 0.055)` (max theorique 44 000)
- Formule patronale EVA: `round(brut * 0.16)` (pas de plafond applique dans la norme EVA)

### 2.2 IUTS
- Tranches progressives:
  - `0 - 30_000`: `0%`
  - `30_001 - 50_000`: `12.1%`
  - `50_001 - 80_000`: `13.9%`
  - `80_001 - 120_000`: `15.7%`
  - `120_001 - 170_000`: `18.4%`
  - `170_001 - 250_000`: `21.7%`
  - `> 250_000`: `25%`
- Reduction charges de famille appliquee a l'IUTS brut:
  - 0 charge: `0%`
  - 1 charge: `8%`
  - 2 charges: `10%`
  - 3 charges: `12%`
  - 4+ charges: `14%`
- Nombre de charges = `min(4, conjoint_a_charge + nombre_enfants)`
- Conjoint a charge si situation matrimoniale in `{marie, marie(e), pacse, concubinage}` (insensible casse/accents).
- IUTS net: `max(0, round(iuts_brut * (1 - taux_reduction)))`
- Abattement enfants sur base IUTS: `min(3, nb_enfants) * 5_000`
- Base barreme IUTS: arrondi a la centaine inferieure `floor(RNI / 100) * 100` (et non millier).

### 2.3 TPA
- Taux: `3%`
- Base: masse salariale brute de campagne
- Formule: `round(masse_brute * 0.03)` avec repartition prorata brut

### 2.4 Abattements et exonerations
- Abattement frais professionnels:
  - Cadre superieur: `20%`
  - Non cadre: `25%`
- Base abattement FP: salaire de base + prime anciennete + heures sup + salaire supplementaire (selon modelisation).
- Exonerations indemnites:
  - Logement = `min(round(20% * brut), 75_000, montant_verse)`
  - Fonction = `min(round(5% * brut), 50_000, montant_verse)`
  - Transport = `min(5% * (brut - cnss_salariale), 30_000, montant_verse)` (pas d'arrondi intermediaire sur le produit avant min)

### 2.5 Retenue 1%
- Taux: `1%`
- Base: net apres CNSS salariale + IUTS net (avant retenue)
- Formule: `round(base * 0.01)`

### 2.6 CARFO (public)
- Taux par defaut: `8%`
- Base: salaire de base/indiciaire
- Applicable uniquement au secteur public

## 3. Ordre de calcul normatif

1. Calcul du brut (base + primes + indemnites + postes modelises)
2. Base CNSS salariale = `min(brut, 800_000)`
3. CNSS salariale
4. CNSS patronale
5. Exonerations indemnites (logement/fonction/transport)
6. Abattement forfaitaire FP
7. Base imposable IUTS (RNI):
   - `max(0, brut - exonerations - cnss_salariale - abattement_fp - abattement_enfants)`
   - puis arrondi centaine inferieure
8. IUTS brut progressif
9. IUTS net (reduction charges)
10. Net avant retenue 1% = `brut - cnss_salariale - iuts_net`
11. Retenue 1%
12. Net a payer final = net avant retenue 1% - autres retenues activees

## 4. Parametres a porter dans le backend actuel

Dans `backend/src/modules/payroll-bf` et `backend/prisma`:
- Changer plafond CNSS de `1_000_000` a `800_000`.
- Changer tranches IUTS vers le bareme ci-dessus.
- Integrer reduction charges famille et abattement enfants (`5_000`, max 3).
- Integrer exonerations logement/fonction/transport selon min(%, plafond, verse).
- Integrer regles cadre/non-cadre (20%/25%) et base d'abattement FP.
- Conserver devise `XOF` et arrondis entiers coherents.

## 5. Validation juridique (A_VALIDER_JURIDIQUE)

Les points ci-dessous restent a confirmer metier/juridique avant prod:
1. Confirmation officielle des taux CNSS (5.5% / 16%) et du plafond 800 000.
2. Validation legale des tranches IUTS et reductions charges famille.
3. Confirmation des plafonds d'exoneration (75k/50k/30k) et formule transport.
4. Confirmation de l'arrondi "a l'entier le plus proche" applique a chaque etape cible.
5. Confirmation coexistence retenue 1%, FSP, AMU et ordre final de deduction.

## 6. Exemple de reference

Le cas de reference fourni (base 200k, primes 10k, logement 50k, transport 20k, 2 enfants, non cadre) doit etre encode comme test de non-regression prioritaire dans les tests backend.

