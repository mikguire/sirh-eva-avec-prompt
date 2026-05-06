# Handoff Technique — Agent 8 (API Conges BF MVP V1)

Reference PRD: `docs/prd/PRD-CONGES-BF-MVP-V1.md`  
Statut: implementation contract  
Deadline sprint: 2026-06-07

---

## 1) Contrat de donnees (DTO/API)

## 1.1 Enums metier API

- `LeaveStatus`: `DRAFT | SUBMITTED | APPROVED | REJECTED | CANCELLED | CLOSED`
- `LeaveTypeCode`: `PAID_LEAVE | SICK_LEAVE | SPECIAL_LEAVE | UNPAID_LEAVE`

## 1.2 CreateLeaveRequestDto

```ts
type CreateLeaveRequestDto = {
  employeeId: string; // required
  leaveTypeId: string; // required
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string; // ISO date YYYY-MM-DD
  reason?: string; // optional, max 1000
  submitNow?: boolean; // default false, if true create as SUBMITTED
};
```

Validations:

- `startDate <= endDate` sinon `EV_LEAVE_INVALID_DATE_RANGE`
- `employeeId` scope tenant
- `leaveTypeId` scope tenant
- raison obligatoire si type = `SPECIAL_LEAVE` (si politique tenant l'exige)

## 1.3 Transition DTOs

```ts
type SubmitLeaveRequestDto = { comment?: string };
type ApproveLeaveRequestDto = { comment?: string };
type RejectLeaveRequestDto = { reason: string }; // required
type CancelLeaveRequestDto = { reason?: string };
type CloseLeaveRequestDto = { reason?: string }; // admin/job
```

## 1.4 LeaveRequestResponse

```ts
type LeaveRequestResponse = {
  id: string;
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED" | "CLOSED";
  startDate: string; // ISO
  endDate: string; // ISO
  requestedDays: number; // 1 decimal
  approvedDays: number | null;
  consumedDays: number; // for partial cancel
  reason: string | null;
  approverId: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
```

## 1.5 LeaveBalanceResponse

```ts
type LeaveBalanceResponse = {
  employeeId: string;
  asOfDate: string; // YYYY-MM-DD
  acquiredDays: number; // 1 decimal
  carriedDays: number; // 1 decimal
  consumedDays: number; // 1 decimal
  availableDays: number; // 1 decimal
  expiredDays: number; // 1 decimal
};
```

---

## 2) Machine d'etats (single source of truth)

Transitions autorisees:

- `DRAFT -> SUBMITTED`
- `SUBMITTED -> APPROVED`
- `SUBMITTED -> REJECTED`
- `REJECTED -> DRAFT`
- `APPROVED -> CANCELLED`
- `APPROVED -> CLOSED`
- `CANCELLED -> CLOSED`

Regles:

- `CLOSED` terminal.
- toute transition non autorisee => `EV_LEAVE_TRANSITION_FORBIDDEN`.
- `APPROVED -> CANCELLED`:
  - employe: seulement avant `startDate`,
  - RH/admin: avant ou apres `startDate` (annulation partielle autorisee).

---

## 3) Endpoints MVP et permissions

Base path: `/api/v1`

### `POST /leave-requests`

- Perm: `leave.write`
- Cree en `DRAFT` (ou `SUBMITTED` si `submitNow=true`)

### `GET /leave-requests`

- Perm: `leave.read`
- Filtre scope role:
  - employe: soi
  - manager: equipe
  - RH/admin/superadmin: tenant
  - comptable: lecture tenant (sans actions workflow)

### `GET /leave-requests/:id`

- Perm: `leave.read`
- Scope strict tenant + role scope

### `POST /leave-requests/:id/submit`

- Perm: `leave.write`
- Transition `DRAFT -> SUBMITTED`

### `POST /leave-requests/:id/approve`

- Perm: `leave.approve`
- Transition `SUBMITTED -> APPROVED`

### `POST /leave-requests/:id/reject`

- Perm: `leave.approve`
- Transition `SUBMITTED -> REJECTED`

### `POST /leave-requests/:id/cancel`

- Perm: `leave.cancel` (ou `leave.write` owner + policy)
- Transition `APPROVED -> CANCELLED`

### `POST /leave-requests/:id/close`

- Perm: `leave.close`
- Transition `APPROVED|CANCELLED -> CLOSED`

### `GET /leave-balances/me`

- Perm: `leave.balance.read.self`

### `GET /leave-balances/:employeeId`

- Perm: `leave.balance.read.team` ou `leave.balance.read.all`

---

## 4) Mapping erreurs `problem+json` / `ev:code` par endpoint

Codes transverses:

- 400 `EV_LEAVE_INVALID_DATE_RANGE`
- 400 `EV_LEAVE_DOCUMENT_REQUIRED`
- 403 `EV_LEAVE_FORBIDDEN_SCOPE`
- 404 `EV_NOT_FOUND`
- 409 `EV_LEAVE_OVERLAP`
- 409 `EV_LEAVE_INSUFFICIENT_BALANCE`
- 409 `EV_LEAVE_NOT_APPROVABLE`
- 409 `EV_LEAVE_TRANSITION_FORBIDDEN`
- 409 `EV_LEAVE_ALREADY_CLOSED`
- 409 `EV_UNIQUE_VIOLATION` (si contrainte metier/tech)

Par endpoint:

- `POST /leave-requests`: invalid date, document required, insufficient balance, overlap.
- `POST /:id/submit`: transition forbidden, forbidden scope.
- `POST /:id/approve`: not approvable, transition forbidden, forbidden scope.
- `POST /:id/reject`: not approvable, transition forbidden, forbidden scope.
- `POST /:id/cancel`: transition forbidden, already closed, forbidden scope.
- `POST /:id/close`: already closed, transition forbidden, forbidden scope.

---

## 5) Regles calcul implementables

## 5.1 Fonction acquisition mensuelle

```ts
function acquiredForMonth(joursEligibles: number, joursDansMois: number): number {
  const brute = 2.5 * (joursEligibles / joursDansMois);
  return Math.ceil(brute * 10) / 10;
}
```

## 5.2 Fonction solde disponible

```ts
function available(acquired: number, carried: number, consumed: number): number {
  return round1(acquired + carried - consumed);
}
```

Note:

- `round1(x) = Math.round(x * 10) / 10` (affichage + stockage normalise decimal 1).

## 5.3 Calcul duree demandee (MVP V1)

- Jours ouvrables lundi-vendredi uniquement.
- Feries automatiques: non inclus V1.

---

## 6) Multi-tenant et securite (checklist implementation)

- Guard `JwtAuthGuard` + `TenantContextGuard` + `PermissionsGuard`.
- Tous `find/update` Prisma avec `tenantId` explicite.
- Rejet cross-tenant silencieux (`404` prefere pour enumeration resistance).
- Audit log sur create/submit/approve/reject/cancel/close.
- `requestId` obligatoire dans logs.

---

## 7) Plan de migration backend depuis etat actuel

Etat actuel module:

- statuts Prisma: `PENDING/APPROVED/REJECTED/CANCELLED`
- endpoints: `POST /leave-requests`, `POST /:id/approve`

Plan:

1. Introduire nouveaux statuts API + compat mapping legacy `PENDING -> SUBMITTED`.
2. Ajouter colonnes necessaires:
  - `updatedAt`, `requestedDays`, `approvedDays`, `consumedDays`,
  - `rejectionReason`, `cancelledAt`, `closedAt`.
3. Ajouter endpoints transitions manquants.
4. Ajouter controles overlap/solde/justificatif.
5. Ajouter endpoints soldes.
6. Completer tests unit + integration (min 20 scenarios PRD).

---

## 8) Tests minimaux CI obligatoires (Agent 8)

- 1 test nominal + 1 test limite + 1 test refus d'acces pour chaque action workflow.
- assertions RFC7807:
  - `Content-Type=application/problem+json`
  - presence `ev:code`.
- test cross-tenant sur chaque endpoint write/read detail.
- test precision arrondi au dixieme (fevrier, 30, 31 jours).

---

## 9) Definition of done API

Agent 8 peut marquer done quand:

1. Tous endpoints section 3 exposes en OpenAPI.
2. Toutes erreurs section 4 documentees avec exemples.
3. Machine d'etats section 2 enforcee serveur.
4. Couverture tests module leave >= 70% et scenarios critiques PRD couverts.
5. Aucun acces cross-tenant possible en lecture/edition.