import { assertJwtSecretsForProduction } from "./jwt-secrets";

describe("assertJwtSecretsForProduction", () => {
  let savedNodeEnv: string | undefined;
  let savedAccess: string | undefined;
  let savedRefresh: string | undefined;

  beforeAll(() => {
    savedNodeEnv = process.env.NODE_ENV;
    savedAccess = process.env.JWT_ACCESS_SECRET;
    savedRefresh = process.env.JWT_REFRESH_SECRET;
  });

  afterEach(() => {
    if (savedNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = savedNodeEnv;
    }
    if (savedAccess === undefined) {
      delete process.env.JWT_ACCESS_SECRET;
    } else {
      process.env.JWT_ACCESS_SECRET = savedAccess;
    }
    if (savedRefresh === undefined) {
      delete process.env.JWT_REFRESH_SECRET;
    } else {
      process.env.JWT_REFRESH_SECRET = savedRefresh;
    }
  });

  it("does not throw outside production", () => {
    process.env.NODE_ENV = "development";
    expect(() => assertJwtSecretsForProduction()).not.toThrow();
  });

  it("throws in production when JWT secrets are missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    expect(() => assertJwtSecretsForProduction()).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("throws in production when secrets are too short", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_ACCESS_SECRET = "short";
    process.env.JWT_REFRESH_SECRET = "short";
    expect(() => assertJwtSecretsForProduction()).toThrow(/at least 32/);
  });
});
