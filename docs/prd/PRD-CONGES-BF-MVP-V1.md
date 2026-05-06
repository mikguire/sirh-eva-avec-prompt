# PRD — Module Conges BF (MVP V1)

Statut: Ready for build (propose)  
Owner produit: Agent 5 (delegation S2-1)  
Periode sprint: S2 (2026-05-25 -> 2026-06-07)  
Date cible livraison: 2026-06-07  
Fuseau de reference: Africa/Ouagadougou (UTC+0)

---

## 1) Resume executif

Ce PRD definit le module **Conges Burkina Faso** de SIRH EVA pour MVP V1 avec un niveau de precision directement implementable pour:
- Agent 8 (API/backend),
- Agent 2 (ecrans mobile/web),
- Agent 6 (Design System),
- Agent 7 (implementation app).

Le module couvre la regle legale critique de conges payes: **2,5 jours ouvrables acquis par mois de service** avec gestion des cas d'entree/sortie en cours de mois, validation manager/RH, justificatifs et audit complet.  
Le document est volontairement normatif pour eviter les interpretations divergentes entre backend et clients.

---

## 2) Objectifs metier

1. Garantir la conformite BF sur les conges payes en V1.
2. Fournir un workflow unifie demande -> validation -> cloture traçable.
3. Eliminer les divergences de calcul entre API, mobile et web admin.
4. Assurer un cloisonnement multi-tenant strict sans fuite inter-entreprise.
5. Rendre toutes les regles critiques testables en Given/When/Then.

---

## 3) Perimetre

### 3.1 In scope (MVP V1)

- Demande de conge employe (brouillon/soumission/annulation).
- Validation manager et/ou RH selon politique tenant.
- Calcul et exposition des soldes:
  - acquisition mensuelle 2,5 j,
  - prorata entree/sortie mois,
  - consommation,
  - reports et plafonds.
- Controle eligibilite par type de conge.
- Gestion des pieces justificatives selon type.
- Notifications in-app + email sur evenements workflow.
- API REST `/api/v1/leave-requests` et endpoints soldes associes.
- Erreurs conformes RFC7807 + `ev:code`.
- Journal d'audit des actions sensibles.

### 3.2 Out of scope (MVP V1)

- Calcul paie, valorisation monetaire des jours, indemnites.
- Moteur de planning horaire complexe (rotation/shift).
- Integration officielle SYSCOHADA export comptable conges.
- IA predictive absentéisme.
- Offline-first complet sur flux conges.

---

## 4) Hypotheses (explicites)

1. Le socle tenancy/RLS/JWT/RBAC est deja en production (cf. STANDARDS + ADR-0002/0005).
2. La base de donnees stocke en UTC ISO; affichage en `JJ/MM/AAAA`.
3. Le cycle d'acquisition legal est mensuel et alimente un "compte de conges payes".
4. Les types de conges non payes (maladie, exceptionnel, maternite...) n'alimentent pas le compte de conges payes sauf parametrage explicite futur via moteur reglementaire versionne.
5. Toute regle legale nouvelle passe par versionnement date d'effet (ADR-0006).

---

## 5) Regles legales BF (normatives MVP V1)

## 5.1 Regle centrale

- Acquisition conges payes: **2,5 jours ouvrables / mois de service effectif**.

## 5.2 Prorata entree/sortie (norme d'implementation)

Pour lever toute ambiguite entre agents, MVP V1 retient l'algorithme unique:

- `joursDansMois = nb jours calendaires du mois (28/29/30/31)`
- `joursEligibles = nb jours calendaires employs sous contrat actif dans le mois`
- `acquisitionBrute = 2.5 * (joursEligibles / joursDansMois)`
- `acquisitionArrondie = arrondi au 1/10 superieur` (ceil au dixieme)
  - Exemple: 1.21 -> 1.3 ; 1.20 -> 1.2.

Justification produit:
- favorise le respect legal sans perte employee par sous-arrondi,
- facilite la lisibilite UX (1 decimal),
- deterministe et testable.

## 5.3 Consommation et soldes

- Une demande approuvee debite le solde "consomme" immediatement.
- Une annulation avant date de debut recrédite integralement.
- Une annulation apres debut suit regle:
  - jours deja passes = consommes,
  - jours restants = recrédites.

## 5.4 Report et plafond (MVP V1)

- Report automatique de fin d'exercice active par tenant.
- Plafond de report configurable par tenant, par defaut `30.0` jours.
- Les jours excedant le plafond sont places en statut `expired` (non consommables) avec trace audit.

## 5.5 Cas particuliers couverts

- Entree en cours de mois.
- Sortie en cours de mois.
- Entree et sortie dans le meme mois.
- Fevrier bissextile.
- Contrat rompu en cours de demande (demande passe en revue RH obligatoire).

---

## 6) Roles et permissions (matrice normative)

Roles cibles: `superadmin`, `admin entreprise`, `RH`, `manager`, `comptable`, `employe`.

| Action | superadmin | admin entreprise | RH | manager | comptable | employe |
|---|---|---|---|---|---|---|
| Consulter politiques conges tenant | Oui | Oui | Oui | Lecture limite equipe | Lecture | Non |
| Creer type de conge | Oui | Oui | Oui | Non | Non | Non |
| Demander un conge pour soi | Oui (impersonation encadree) | Oui | Oui | Oui | Oui | Oui |
| Demander un conge pour un employe | Oui | Oui | Oui | Oui (equipe seulement) | Non | Non |
| Soumettre un brouillon | Oui | Oui | Oui | Oui | Non | Oui |
| Approuver | Oui | Oui | Oui | Oui (equipe seulement) | Non | Non |
| Rejeter | Oui | Oui | Oui | Oui (equipe seulement) | Non | Non |
| Annuler demande employee | Oui | Oui | Oui | Oui (equipe) | Non | Oui (si proprietaire) |
| Cloturer administrativement | Oui | Oui | Oui | Non | Non | Non |
| Consulter soldes globaux | Oui | Oui | Oui | Equipe seulement | Lecture finance (sans details sensibles) | Soi uniquement |
| Export conges (CSV/API) | Oui | Oui | Oui | Equipe | Oui | Non |

Contraintes transverses:
- Toujours scoped tenant (`x-tenant-id` + JWT coherent).
- Aucun role ne peut lire/modifier un enregistrement hors tenant.
- Le role `comptable` est lecture/extraction uniquement (pas de validation).

---

## 7) Workflow et etats

Etats metier imposes:
- `DRAFT` (brouillon)
- `SUBMITTED` (soumis)
- `APPROVED` (approuve)
- `REJECTED` (rejete)
- `CANCELLED` (annule)
- `CLOSED` (cloture)

Transitions autorisees:
1. `DRAFT -> SUBMITTED` (employe/acteur autorise)
2. `SUBMITTED -> APPROVED` (manager/RH/admin selon politique)
3. `SUBMITTED -> REJECTED` (manager/RH/admin)
4. `APPROVED -> CANCELLED` (employe avant debut, sinon RH/admin avec regle partielle)
5. `REJECTED -> DRAFT` (owner re-ouvre et corrige)
6. `APPROVED -> CLOSED` (auto apres date fin + job quotidien)
7. `CANCELLED -> CLOSED` (cloture administrative)

Transitions interdites:
- `REJECTED -> APPROVED` direct sans nouvelle soumission.
- `CLOSED -> *` (etat terminal).

---

## 8) Regles de calcul (formules techniques)

## 8.1 Definitions

- `soldeAcquis`: somme acquisition mensuelle.
- `soldeConsomme`: somme jours approuves (ou partiellement annules).
- `soldeReporte`: reliquat annee N-1 (cappe).
- `soldeDisponible = soldeAcquis + soldeReporte - soldeConsomme`.

## 8.2 Regles de calcul

1. Acquisition executee par job mensuel tenant-aware + recalcul idempotent.
2. Recalcul historique possible via moteur reglementaire date-effective (ADR-0006).
3. Arrondi officiel V1: ceil au dixieme.
4. Validation de demande:
   - `dureeDemandee <= soldeDisponible` pour conges payes.
   - si non, erreur metier `EV_LEAVE_INSUFFICIENT_BALANCE`.
5. Chevauchement:
   - rejet si demande active chevauche dates deja approuvees.
6. Jour ouvrable V1:
   - du lundi au vendredi.
   - jours feries nationaux: hors scope automatisation V1 (voir ambiguite A2).

---

## 9) Eligibilite et justificatifs par type de conge

Types minimaux V1:
- `PAID_LEAVE` (conges payes legaux)
- `SICK_LEAVE`
- `SPECIAL_LEAVE`
- `UNPAID_LEAVE`

| Type | Eligibilite | Justificatif obligatoire | Regle solde |
|---|---|---|---|
| PAID_LEAVE | Employe actif avec anciennete > 0 jour | Non (optionnel) | Debite solde conges payes |
| SICK_LEAVE | Employe actif | Oui si > 48h | N'alimente pas/debite pas conges payes (compte distinct) |
| SPECIAL_LEAVE | Employe actif | Oui | Peut etre non debite selon sous-type |
| UNPAID_LEAVE | Employe actif | Selon politique tenant | N'impacte pas conges payes |

Regles justificatifs:
- Extensions autorisees: PDF, JPG, PNG.
- Taille max fichier: 10 MB.
- Antivirus/scan obligatoire cote backend avant validation finale.
- Justificatif manquant quand obligatoire => `EV_LEAVE_DOCUMENT_REQUIRED`.

---

## 10) Notifications (normatives)

Canaux MVP:
- In-app (obligatoire),
- Email (obligatoire sauf opt-out admin documente).

Evenements:
1. `leave.submitted` -> manager(s) + RH + employe (accuse).
2. `leave.approved` -> employe.
3. `leave.rejected` -> employe + RH.
4. `leave.cancelled` -> manager + RH + employe.
5. `leave.closed` -> employe (resume).

SLO notification (rappel standards): 99% < 2 minutes (jobs async).

---

## 11) Exigences API (ready pour Agent 8)

Base path: `/api/v1`

## 11.1 Endpoints cibles MVP

- `POST /leave-requests` (creer brouillon/soumettre)
- `GET /leave-requests` (liste filtree)
- `GET /leave-requests/:id`
- `POST /leave-requests/:id/submit`
- `POST /leave-requests/:id/approve`
- `POST /leave-requests/:id/reject`
- `POST /leave-requests/:id/cancel`
- `POST /leave-requests/:id/close` (admin/job)
- `GET /leave-balances/me`
- `GET /leave-balances/:employeeId` (roles autorises)

## 11.2 Contraintes requetes/reponses

- Header obligatoire: `Authorization`, `x-tenant-id`, `x-request-id`.
- Date input/output:
  - API: ISO `YYYY-MM-DD` ou datetime ISO selon endpoint.
  - UI: conversion obligatoire vers `JJ/MM/AAAA`.
- Pagination sur listes (`page`, `pageSize`, `max 100`).
- Filtrage: statut, employe, type, periode.

## 11.3 Erreurs `application/problem+json` + `ev:code`

Minimum catalogue metier conges:
- `EV_LEAVE_INVALID_DATE_RANGE` -> 400
- `EV_LEAVE_OVERLAP` -> 409
- `EV_LEAVE_INSUFFICIENT_BALANCE` -> 409
- `EV_LEAVE_DOCUMENT_REQUIRED` -> 400
- `EV_LEAVE_NOT_APPROVABLE` -> 409
- `EV_LEAVE_FORBIDDEN_SCOPE` -> 403
- `EV_LEAVE_ALREADY_CLOSED` -> 409
- `EV_LEAVE_TRANSITION_FORBIDDEN` -> 409

Exemple (shape RFC7807):
- `type`, `title`, `status`, `detail`, `instance`, extension `ev:code`.

## 11.4 Audit et observabilite

- Toute transition workflow ecrit un audit log (`beforeJson`, `afterJson`, `actorUserId`, `tenantId`).
- Logs structures avec `requestId`, `tenantId`, `userId`, `route`.
- Aucune PII sensible en clair dans logs applicatifs.

---

## 12) Exigences UI/UX (ready pour Agents 2, 6, 7)

## 12.1 Ecrans MVP

Mobile employe:
- Mes soldes (acquis/consomme/disponible/reporte)
- Nouvelle demande (dates, type, raison, pieces)
- Historique demandes + timeline statut

Web admin/RH/manager:
- Liste demandes filtrees
- Detail demande + actions (approuver/rejeter/annuler/cloturer)
- Vue soldes equipe + exports
- Parametrage politique conges (report/plafond/approbation)

## 12.2 UX comportementale

- Affichage et saisie dates en `JJ/MM/AAAA`.
- Messages d'erreur relies a `ev:code` (FR par defaut, EN secondaire).
- Badge statut DS obligatoire: Draft/Subm./Approved/Rejected/Cancelled/Closed.
- Timeline de validation obligatoire sur ecran detail.

## 12.3 Accessibilite et i18n

- Web: WCAG 2.1 AA (focus visible, labels, navigation clavier, contraste).
- Mobile: cibles tactiles >= 44px et compatibilite lecteur d'ecran.
- FR par defaut, EN secondaire avec cles i18n stables.

---

## 13) Securite, multi-tenant, non-regression

1. Toute requete sur ressources conges applique filtre `tenantId`.
2. Guards RBAC verifies sur chaque action workflow.
3. Tentative cross-tenant => 403/404 sans fuite d'information.
4. Rate limit global conforme STANDARDS.
5. RLS conserve comme dernier rempart base de donnees.

---

## 14) Plan de tests d'acceptation (Given/When/Then)

## 14.1 Metier (regles conges)

1) Acquisition mois complet  
Given employe actif du 1er au 31  
When batch mensuel execute  
Then acquisition = 2.5 jours.

2) Entree en milieu de mois (31 jours)  
Given entree le 16/01/2026  
When batch janvier execute  
Then acquisition = ceil(2.5 * 16/31, 0.1) = 1.3.

3) Sortie en milieu de mois  
Given sortie le 10/04/2026  
When batch avril execute  
Then acquisition = ceil(2.5 * 10/30, 0.1) = 0.9.

4) Entree + sortie meme mois  
Given actif du 10 au 20 inclus  
When batch mois execute  
Then acquisition = ceil(2.5 * 11/joursMois, 0.1).

5) Fevrier bissextile  
Given annee bissextile fevrier (29 jours)  
When batch execute  
Then formule utilise 29 jours.

6) Solde insuffisant  
Given solde disponible 2.0  
When employe soumet 4 jours payes  
Then erreur 409 `EV_LEAVE_INSUFFICIENT_BALANCE`.

7) Chevauchement  
Given demande approuvee du 10 au 12  
When nouvelle demande 11 au 13  
Then rejet 409 `EV_LEAVE_OVERLAP`.

8) Annulation avant debut  
Given demande approuvee debutant demain  
When employe annule  
Then statut `CANCELLED` et recrédit total.

9) Annulation apres debut  
Given demande approuvee commencee hier  
When RH annule aujourd'hui  
Then jours passes consommes, jours futurs recrédites.

10) Rejet puis nouvelle soumission  
Given demande `REJECTED`  
When employe corrige et resoumet  
Then nouveau cycle via `DRAFT -> SUBMITTED`.

## 14.2 Permissions / securite

11) Manager hors equipe  
Given manager A et employe non rattache  
When manager A tente approve  
Then 403 `EV_LEAVE_FORBIDDEN_SCOPE`.

12) Comptable tente approbation  
Given role comptable  
When appel `/approve`  
Then 403 refus.

13) Employe consulte solde d'un autre  
Given employe standard  
When `GET /leave-balances/:employeeId` autre personne  
Then 403/404 sans fuite.

14) Cross-tenant id connu  
Given id requete d'un tenant B  
When utilisateur tenant A appelle detail  
Then 404 ou 403 sans details metier.

## 14.3 API / RFC7807 / regression

15) Date invalide  
Given `startDate > endDate`  
When POST demande  
Then 400 problem+json avec `EV_LEAVE_INVALID_DATE_RANGE`.

16) Transition interdite  
Given requete `CLOSED`  
When action `approve`  
Then 409 `EV_LEAVE_ALREADY_CLOSED` ou `EV_LEAVE_TRANSITION_FORBIDDEN`.

17) Justificatif obligatoire manquant  
Given type `SICK_LEAVE` > 48h  
When soumission sans piece  
Then 400 `EV_LEAVE_DOCUMENT_REQUIRED`.

18) Non-regression status legacy  
Given ancienne valeur DB `PENDING`  
When migration et lecture API  
Then mappee proprement vers `SUBMITTED` ou conservee via strategie de compatibilite documentee.

19) Notification envoyee  
Given demande soumise  
When event `leave.submitted`  
Then notif in-app + email creees sous 2 minutes.

20) Audit trail complet  
Given approbation manager  
When transition `SUBMITTED -> APPROVED`  
Then audit contient actor, before, after, tenant, requestId.

---

## 15) Jeu de cas legaux minimaux (>=15)

Liste de reference execution QA (minimum):
1. Mois plein 31 jours -> 2.5
2. Mois plein 30 jours -> 2.5
3. Fevrier 28 jours -> 2.5
4. Fevrier 29 jours -> 2.5
5. Entree J+1 du mois
6. Entree milieu mois
7. Sortie fin mois-1 jour
8. Sortie milieu mois
9. Entree + sortie meme mois
10. Solde exactement egal demande
11. Solde inferieur de 0.1
12. Demande chevauchante partielle
13. Demande chevauchante totale
14. Annulation avant debut
15. Annulation en cours de conge
16. Report avec plafond non atteint
17. Report avec depassement plafond
18. Changement manager pendant demande soumise

---

## 16) Glossaire metier

- **Conge paye**: absence remuneree avec droits acquis.
- **Acquisition**: droits gagnes sur une periode (ici mensuelle).
- **Prorata**: fraction de droit selon temps de presence dans le mois.
- **Solde disponible**: jours encore posables.
- **Report**: transfert de reliquat d'un exercice a l'autre.
- **Plafond de report**: limite max reportable.
- **Justificatif**: piece documentaire requise pour certains types.
- **Cloture**: etat final verrouille d'une demande terminee.
- **Workflow**: sequence d'etats et validations.
- **Tenant**: entreprise cliente isolee logiquement et en base.

---

## 17) Tracabilite normative (STANDARDS + ADR)

| Exigence PRD | Source |
|---|---|
| API versionnee `/api/v1` | STANDARDS section API |
| Erreurs `application/problem+json` + `ev:code` | STANDARDS section API + ADR-0004 |
| Regle legale 2,5 j/mois | STANDARDS section Conformite BF |
| Versionnement date d'effet des regles | STANDARDS section Conformite BF + ADR-0006 |
| Multi-tenant strict, RLS, tenant guard | STANDARDS section Multi-tenant + ADR-0002 |
| SLO latence/disponibilite/notif | STANDARDS section SLO/SLI |
| Accessibilite WCAG/mobile a11y | STANDARDS section Accessibilite/perf |
| Format date JJ/MM/AAAA, timezone Africa/Ouagadougou | STANDARDS section i18n/locale |

---

## 18) Ambiguites a arbitrer par Mickael (max 3)

### A1 — Unite legale "jours ouvrables" vs parametrage local entreprise

Question: faut-il figer V1 sur lundi-vendredi pour tous tenants, ou autoriser un calendrier ouvrable tenant-specifique des V1?  
Proposition Agent 5: figer lundi-vendredi en MVP pour eviter divergence et respecter deadline S2; ouvrir ADR evolution V2.

### A2 — Gestion des jours feries nationaux BF dans le decompte

Question: les jours feries doivent-ils etre automatiquement exclus du decompte des conges payes en V1?  
Proposition Agent 5: non en V1 (hors scope moteur calendrier feries), avec mention claire UI et ticket V2.

### A3 — Priorite d'approbation manager vs RH en cas de conflit

Question: si manager rejette et RH approuve quasi simultanement, quelle autorite prevaut?  
Proposition Agent 5: "dernier evenement valide horodate + role priority RH > manager" pour eviter blocages operationnels.

---

## 19) Ready for build (validation de passage)

Ce PRD est **Ready for build** si:
1. Agent 8 confirme mapping endpoints + `ev:code` + transitions.
2. Agent 2/6 valident etats UI et composants statut/timeline.
3. Agent 7 confirme parcours bout-en-bout mobile/web sans regle implicite.
4. Les 20 scenarios Given/When/Then sont integres au plan QA CI.

Definition of done S2-1:
- 100% regles critiques testables,
- zero ambiguite sur acquisition/prorata (hors A1-A3 explicitement escaladees),
- coherence role/permissions/workflow.

