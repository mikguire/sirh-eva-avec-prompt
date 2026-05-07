# Conformite paie BF — version metier exploitable

Date de gel metier: `2026-05-06`  
Statut du document: `RELEASE_CANDIDATE_METIER`

## 1) Portee

Ce document est la reference metier/juridique pour le calcul paie Burkina Faso dans EVA SIRH.
Il distingue explicitement:
- `CONFIRMEE`: regle executable et testable par QA.
- `A_VALIDER_JURIDIQUE`: point bloque avant validation humaine formelle.

Le suivi des changements reglémentaires est historise dans `docs/compliance-bf-changelog.md`.

Pack de validation formelle: `docs/compliance-bf-signoff-packet.md`.

## 2) Parametres CONFIRMES (executables QA)

### 2.1 CNSS

| Parametre | Valeur figee | Regle testable |
|---|---:|---|
| Taux CNSS salariale | `5.5%` | `cnss_salariale = round(min(brut, 800_000) * 0.055)` |
| Taux CNSS patronale (mode EVA) | `16%` | `cnss_patronale = round(brut * 0.16)` |
| Plafond assiette CNSS salariale | `800_000 FCFA/mois` | le plafond ne s'applique qu'a la part salariale |

### 2.2 IUTS

#### Bareme progressif confirme

| Tranche base IUTS | Taux |
|---|---:|
| `0 - 30_000` | `0%` |
| `30_001 - 50_000` | `12.1%` |
| `50_001 - 80_000` | `13.9%` |
| `80_001 - 120_000` | `15.7%` |
| `120_001 - 170_000` | `18.4%` |
| `170_001 - 250_000` | `21.7%` |
| `> 250_000` | `25%` |

#### Charges de famille confirmees

| Nombre de charges | Reduction appliquee a l'IUTS brut |
|---:|---:|
| `0` | `0%` |
| `1` | `8%` |
| `2` | `10%` |
| `3` | `12%` |
| `4+` | `14%` |

Regles associees:
- `charges = min(4, conjoint_a_charge + nombre_enfants)`.
- Conjoint a charge si statut matrimonial dans `{marie, marie(e), pacse, concubinage}` (insensible casse/accents).
- `iuts_net = max(0, round(iuts_brut * (1 - taux_reduction)))`.
- Abattement enfants IUTS: `min(3, nb_enfants) * 5_000`.
- Base barème IUTS: `floor(RNI / 100) * 100` (arrondi a la centaine inferieure).

### 2.3 Abattements et exonerations

| Parametre | Valeur figee | Regle testable |
|---|---:|---|
| Abattement FP cadre superieur | `20%` | applique a la base d'abattement FP |
| Abattement FP non cadre | `25%` | applique a la base d'abattement FP |
| Base abattement FP | `salaire_base + prime_anciennete + heures_sup + salaire_supplementaire` | valeurs issues de la modelisation paie |
| Exoneration logement | `20%` plafond `75_000` | `min(round(0.20 * brut), 75_000, montant_verse)` |
| Exoneration fonction | `5%` plafond `50_000` | `min(round(0.05 * brut), 50_000, montant_verse)` |
| Exoneration transport | `5%` plafond `30_000` | `min(0.05 * (brut - cnss_salariale), 30_000, montant_verse)` sans arrondi intermediaire |

### 2.4 TPA, retenue 1%, CARFO

| Rubrique | Valeur figee | Regle testable |
|---|---:|---|
| TPA | `3%` | `tpa = round(masse_brute_campagne * 0.03)` puis repartition prorata brut |
| Retenue 1% | `1%` | `retenue_1 = round((net_avant_retenue_1) * 0.01)` |
| CARFO (secteur public) | `8%` | applique sur salaire de base/indiciaire, uniquement agents publics |

## 3) Ordre de calcul CONFIRME (sequence de reference QA)

1. Calcul du `brut`.
2. Calcul de la base CNSS salariale: `min(brut, 800_000)`.
3. Calcul `cnss_salariale`.
4. Calcul `cnss_patronale` (mode EVA).
5. Calcul exonerations (`logement`, `fonction`, `transport`).
6. Calcul abattement FP.
7. Calcul RNI: `max(0, brut - exonerations - cnss_salariale - abattement_fp - abattement_enfants)`.
8. Arrondi base IUTS: `floor(RNI / 100) * 100`.
9. Calcul IUTS brut progressif.
10. Calcul IUTS net (reduction charges).
11. Calcul net avant retenue 1%: `brut - cnss_salariale - iuts_net`.
12. Calcul retenue 1%.
13. Calcul net final: `net_avant_retenue_1 - autres_retenues_activees`.

## 4) Points A_VALIDER_JURIDIQUE (blocants go-live legal)

| Sujet | Point exact a valider | Impact si non valide |
|---|---|---|
| CNSS patronale | L'absence de plafond sur la part patronale (`round(brut * 0.16)`) est-elle juridiquement recevable dans tous les cas ? | risque de non-conformite cotisations employeur |
| Regle d'arrondi global | "round" = arrondi mathematique a l'entier le plus proche pour toutes les rubriques monetaires ? | ecarts de paie et de declaration |
| Coexistence retenues | Ordre et coexistence de `retenue 1%`, `FSP`, `AMU` et autres retenues obligatoires | net final potentiellement incorrect |

## 5) Checklist de validation metier signable

Statut: `A_COMPLETER_PAR_METIER_ET_JURIDIQUE`

| Item | Critere de validation (testable) | Evidence attendue | Statut | Signature/Date |
|---|---|---|---|---|
| CNSS | verifier `5.5%`, `16%`, plafond salarial `800_000`, formule patronale EVA | jeu de cas avec brut `<`, `=`, `>` 800k | [ ] | |
| IUTS | verifier tranches, reductions charges, abattement enfants max 3, base a la centaine inferieure | PV de calcul manuel + extraction QA | [ ] | |
| CARFO | verifier `8%` sur base indiciaire et uniquement secteur public | cas public vs prive | [ ] | |
| SMIG | verifier qu'aucun bulletin final ne passe sous la contrainte SMIG applicable (si regle activee metier) | controle lot paie + seuil officiel annexe | [ ] | |
| Arrondis | verifier la convention unique d'arrondi sur chaque rubrique cible | tableau de reconciliation calculatrice/outil | [ ] | |
| Ordre des calculs | verifier sequence normative section 3 sans permutation | test de non-regression sur cas de reference | [ ] | |
| Coexistence retenues | verifier ordre et cumul conformes section 3 et points section 4 (1%, FSP, AMU, autres) | scenario QA multi-retenues + arbitrage juridique | [ ] | |

## 6) Sign-off (signature metier / juridique)

Objectif: constat formel sur la **norme figee** de ce document, independamment de l'implementation technique.

| Domaine | Criteres de validation (testables QA) | Valide |
|---|---|:---:|
| **CNSS** | Conformite section 2.1: `5.5%` salariale sur `min(brut, 800_000)`, `16%` patronale mode EVA, arrondis tels que decrits. | [ ] |
| **IUTS** | Conformite section 2.2: bareme progressif, charges famille `0/8/10/12/14%`, abattement enfants (max 3), base `floor(RNI/100)*100`. | [ ] |
| **CARFO** | Conformite section 2.4: `8%` sur base indiciaire, **uniquement** secteur public; absence sur cas prive. | [ ] |
| **SMIG** | Si regle SMIG activee metier: **aucun** net en dessous du seuil officiel en vigueur (controle lot + piece annexe au seuil). | [ ] |
| **Arrondis** | Convention unique d'arrondi entier (voir section 4 si non encore levee) + reconciliation avec extrait QA rubrique par rubrique. | [ ] |
| **Ordre de calcul** | Application stricte de la sequence section 3, sans permutation ni saut d'etape. | [ ] |
| **Coexistence retenues** | Ordre et cumul des retenues (y compris `1%`, FSP, AMU, autres obligatoires) conformes a section 3 et arbitrage section 4 une fois leve. | [ ] |

Engagement signataire (a completer):

| Champ | Valeur |
|---|---|
| **Nom** |  |
| **Fonction** (metier / juridique / DAF / RH) |  |
| **Date** |  |
| **Signature** |  |

## 7) Fige dans ce document vs A_VALIDER_JURIDIQUE

**Parametres et regles deja figes (executables QA; gel metier du document)** - non exhaustif, voir sections 2 a 3:

| Zone | Reference |
|---|---|
| CNSS salariale / patronale / plafond | Section 2.1 |
| Bareme IUTS, charges, abattements enfants, base centaine | Section 2.2 |
| Abattements FP, exonerations logement/fonction/transport | Section 2.3 |
| TPA `3%`, retenue `1%`, CARFO `8%` public | Section 2.4 |
| Sequence d'ordre de calcul de reference | Section 3 |

**Reste explicitement `A_VALIDER_JURIDIQUE` (bloquant go-live legal tant que non leve)** - detail section 4:

| Sujet | Test / preuve attendue cote QA |
|---|---|
| CNSS patronale sans plafond (mode EVA) | Jeux de cas `brut` eleve + accord ecrit sur l'assiette patronale |
| Convention d'arrondi **unique** sur toutes rubriques monetaires | Matrice rubrique x methode d'arrondi signee + egalite avec declarations |
| Coexistence et ordre des retenues (`1%`, FSP, AMU, autres) | Scenarios multi-retenues + decision juridique sur cumul et ordre |

## 8) Cas de reference obligatoire

Le cas suivant reste obligatoire pour QA non-regression:
- Base `200_000`, primes `10_000`, logement `50_000`, transport `20_000`, `2` enfants, non cadre.

