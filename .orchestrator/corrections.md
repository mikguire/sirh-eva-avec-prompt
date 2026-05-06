## 2026-04-30 10:08 UTC - ORCHESTRATOR

- fix: Enforced tenant consistency in `TenantContextGuard` by rejecting requests where `x-tenant-id` does not match JWT `tenantId`.
- fix: Corrected leave creation permission from `leave.read` to `leave.write` in leave controller.
- note: Git repository is not initialized in this workspace, so commit `fix(orchestrator): ...` could not be created.

## 2026-05-05 17:16 UTC - ORCHESTRATOR

- infra: Initialized Git repository at workspace root for traceability.
- note: Stripe webhook hardening (signature verification + raw body + secret env) is already present in current backend codebase; no additional hotfix required.
