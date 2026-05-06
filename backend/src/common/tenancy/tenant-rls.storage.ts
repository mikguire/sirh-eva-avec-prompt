import { AsyncLocalStorage } from "async_hooks";

export type TenantRlsStore = {
  tenantId: string;
};

/**
 * Contexte tenant pour aligner les requêtes Prisma avec RLS (`app.current_tenant`).
 * Rempli par TenantContextGuard après validation du header + JWT.
 */
export const tenantRlsStorage = new AsyncLocalStorage<TenantRlsStore>();
