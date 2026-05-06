/**
 * Secrets JWT : en production, aucun fallback — fail-fast au boot (voir main.ts).
 */

const MIN_SECRET_LENGTH = 32;

function assertStrongEnough(secret: string, name: string): void {
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters in production`);
  }
}

export function assertJwtSecretsForProduction(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  const access = process.env.JWT_ACCESS_SECRET;
  const refresh = process.env.JWT_REFRESH_SECRET;
  if (!access || !refresh) {
    throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required when NODE_ENV=production");
  }
  assertStrongEnough(access, "JWT_ACCESS_SECRET");
  assertStrongEnough(refresh, "JWT_REFRESH_SECRET");
}

export function getJwtAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is required when NODE_ENV=production");
    }
    return secret;
  }
  return secret ?? "dev-access-secret-change-me-in-env-32chars";
}

export function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret) {
      throw new Error("JWT_REFRESH_SECRET is required when NODE_ENV=production");
    }
    return secret;
  }
  return secret ?? "dev-refresh-secret-change-me-in-env-32chars";
}
