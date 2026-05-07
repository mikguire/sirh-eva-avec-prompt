import { ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";
import { createHmac } from "crypto";
import dotenv from "dotenv";
import * as path from "path";
import request from "supertest";

import { StripeSignatureService } from "../../src/common/webhooks/stripe-signature.service";
import { AppModule } from "../../src/app.module";
import { seedIntegrationWorld, tearDownIntegrationWorld, type IntegrationWorld } from "./fixture";

const backendRoot = path.join(__dirname, "..", "..");
dotenv.config({ path: path.join(backendRoot, ".env") });

/** Aligné sur docker-compose racine : postgres/postgres, DB eva_test, port hôte 5432 par défaut */
const DEFAULT_INTEGRATION_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/eva_test";

process.env.DATABASE_URL =
  process.env.INTEGRATION_DATABASE_URL?.trim() || DEFAULT_INTEGRATION_DATABASE_URL;

const prismaCli = path.join(backendRoot, "node_modules", ".bin", "prisma");
const tsNodeCli = path.join(backendRoot, "node_modules", ".bin", "ts-node");

function stripeSignature(secret: string, rawBody: string, timestamp = "1500000000"): string {
  const payload = `${timestamp}.${rawBody}`;
  const v1 = createHmac("sha256", secret).update(payload).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

function redactDatabaseUrl(url: string | undefined): string {
  if (!url) {
    return "(non défini)";
  }
  return url.replace(/^(postgresql:\/\/[^:]+:)[^@]+(@)/i, "$1***$2");
}

function prismaMigrateDeployOrThrow(dbEnv: NodeJS.ProcessEnv): void {
  const r = spawnSync(prismaCli, ["migrate", "deploy"], {
    cwd: backendRoot,
    env: dbEnv,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const prismaOutput = [r.stdout?.trim(), r.stderr?.trim()].filter(Boolean).join("\n") || "(vide)";
  if (r.status === 0) {
    return;
  }
  const dbUrl = redactDatabaseUrl(process.env.DATABASE_URL);
  const hints: string[] = [];
  if (prismaOutput.includes("P1000")) {
    hints.push(
      "P1000 : mauvais utilisateur/mot de passe PostgreSQL — ajuster DATABASE_URL (backend/.env chargé au démarrage) ou `docker compose up -d`."
    );
  }
  if (prismaOutput.includes("P3015")) {
    hints.push("P3015 : dossier de migration incomplet (fichier migration.sql manquant) dans prisma/migrations.");
  }
  if (hints.length === 0) {
    hints.push("Voir la sortie Prisma ci-dessus ; vérifier DATABASE_URL et prisma/migrations.");
  }
  throw new Error(
    [
      `Integration: prisma migrate deploy failed (exit ${r.status}).`,
      `DATABASE_URL (mot de passe masqué) : ${dbUrl}`,
      "",
      "Sortie Prisma :",
      prismaOutput,
      "",
      ...hints
    ].join("\n")
  );
}

function prismaSeedOrThrow(dbEnv: NodeJS.ProcessEnv): void {
  const r = spawnSync(tsNodeCli, ["prisma/seed.ts"], {
    cwd: backendRoot,
    env: dbEnv,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const out = [r.stdout?.trim(), r.stderr?.trim()].filter(Boolean).join("\n") || "(vide)";
  if (r.status === 0) {
    return;
  }
  throw new Error(
    `Integration: prisma seed failed after migrate deploy (exit ${r.status}).\nSortie :\n${out}`
  );
}

const describeIntegration = process.env.SKIP_INT === "1" ? describe.skip : describe;

describeIntegration("Integration (HTTP + DB)", () => {
  const prisma = new PrismaClient();
  let app: import("@nestjs/common").INestApplication;
  let world: IntegrationWorld | undefined;
  let stripeSecret: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me-in-env-32chars";
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me-in-env-32chars";
    const envStripe = process.env.STRIPE_WEBHOOK_SECRET;
    stripeSecret =
      envStripe && envStripe.trim() !== ""
        ? envStripe.trim()
        : "whsec_test_integration_32_characters__";
    process.env.STRIPE_WEBHOOK_SECRET = stripeSecret;
    process.env.NODE_ENV = "test";

    const dbEnv = { ...process.env };
    prismaMigrateDeployOrThrow(dbEnv);
    prismaSeedOrThrow(dbEnv);

    world = await seedIntegrationWorld(prisma);

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (world) {
      await tearDownIntegrationWorld(prisma, world);
    }
    await prisma.$disconnect();
  });

  it("POST /auth/login returns 401 as RFC 7807 problem on bad password", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: "WrongPassword9!",
        tenantId: world!.tenantId
      })
      .expect(401);

    expect(String(res.headers["content-type"])).toContain("application/problem+json");
    expect(res.body).toMatchObject({
      status: 401,
      title: "Unauthorized",
      instance: "/api/v1/auth/login"
    });
    expect(typeof res.body.detail).toBe("string");
  });

  it("POST /auth/login returns tokens", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it("POST /leave-requests creates a request with leave.write", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    const start = "2026-06-01";
    const end = "2026-06-05";

    const res = await request(app.getHttpServer())
      .post("/api/v1/leave-requests")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", world!.tenantId)
      .send({
        employeeId: world!.employeeId,
        leaveTypeId: world!.leaveTypeId,
        startDate: start,
        endDate: end,
        reason: "intégration"
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe("PENDING");
  });

  it("GET /leave-balances/me returns accrued BF paid leave for linked employee", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .get("/api/v1/leave-balances/me")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", world!.tenantId)
      .expect(200);

    expect(typeof res.body.accruedPaidDays).toBe("number");
    expect(res.body.accruedPaidDays).toBeGreaterThan(0);
    expect(typeof res.body.availablePaidDays).toBe("number");
    expect(res.body.syncedThroughYearMonth).toMatch(/^\d{4}-\d{2}$/);
  });

  it("GET /leave-balances/me returns 403 without leave.balance.read permission", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.limitedUserEmail,
        password: world!.limitedUserPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    await request(app.getHttpServer())
      .get("/api/v1/leave-balances/me")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", world!.tenantId)
      .expect(403);
  });

  it("POST /billing/webhook accepts valid Stripe signature without JWT", async () => {
    const eventId = `evt_integration_${Date.now()}`;
    const rawBody = JSON.stringify({
      id: eventId,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: world!.stripeSubscriptionId,
          status: "active",
          current_period_start: 1700000000,
          current_period_end: 1702592000
        }
      }
    });

    const sig = stripeSignature(stripeSecret, rawBody);
    expect(() => new StripeSignatureService().verify(sig, rawBody)).not.toThrow();

    const res = await request(app.getHttpServer())
      .post("/api/v1/billing/webhook")
      .set("stripe-signature", sig)
      .set("Content-Type", "application/json")
      .send(rawBody);

    if (res.status !== 200) {
      throw new Error(`webhook debug ${res.status}: ${JSON.stringify(res.body)}`);
    }

    const updated = await prisma.subscription.findUnique({
      where: { id: world!.subscriptionId }
    });
    expect(updated?.lastWebhookEventId).toBe(eventId);
    expect(updated?.status).toBe("ACTIVE");
  });

  it("POST /billing/webhook rejects invalid signature with problem+json", async () => {
    const rawBody = JSON.stringify({ id: "evt_bad", type: "ping" });
    const res = await request(app.getHttpServer())
      .post("/api/v1/billing/webhook")
      .set("stripe-signature", "t=1,v1=deadbeef")
      .set("Content-Type", "application/json")
      .send(rawBody)
      .expect(401);

    expect(String(res.headers["content-type"])).toContain("application/problem+json");
    expect(res.body).toMatchObject({ status: 401 });
  });

  it("POST /auth/refresh returns new tokens", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const refreshToken = login.body.refreshToken as string;
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(refreshToken);

    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(401);
  });

  it("POST /auth/refresh fails after logout", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const refreshToken = login.body.refreshToken as string;
    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .send({ refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(401);
  });

  it("POST /leave-requests returns 401 when x-tenant-id does not match JWT", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    await request(app.getHttpServer())
      .post("/api/v1/leave-requests")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", "cldifferenttenantfromjwt")
      .send({
        employeeId: world!.employeeId,
        leaveTypeId: world!.leaveTypeId,
        startDate: "2026-07-01",
        endDate: "2026-07-03"
      })
      .expect(401);
  });

  it("POST /payroll-bf/simulate returns expected Burkina Faso fields", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .post("/api/v1/payroll-bf/simulate")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", world!.tenantId)
      .send({
        payrollDate: "2026-06-01",
        employeeRegime: "PRIVE",
        baseSalaryXof: 200000,
        taxableBonusXof: 10000,
        legalProfileId: world!.payrollLegalProfileId
      })
      .expect(201);

    expect(res.body).toMatchObject({
      currency: "XOF",
      legalVersionId: "BF-2026-01"
    });
    expect(typeof res.body.grossTaxableXof).toBe("number");
    expect(typeof res.body.cnssEmployeeXof).toBe("number");
    expect(typeof res.body.cnssEmployerXof).toBe("number");
    expect(typeof res.body.iutsXof).toBe("number");
    expect(typeof res.body.netPayXof).toBe("number");
    expect(typeof res.body.smigCompliance).toBe("boolean");
  });

  it("POST /payroll-bf/simulate denies user without payroll.simulate permission", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.limitedUserEmail,
        password: world!.limitedUserPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    await request(app.getHttpServer())
      .post("/api/v1/payroll-bf/simulate")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", world!.tenantId)
      .send({
        payrollDate: "2026-06-01",
        employeeRegime: "PRIVE",
        baseSalaryXof: 200000,
        legalProfileId: world!.payrollLegalProfileId
      })
      .expect(403);
  });

  it("GET /employees lists employees for tenant", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .get("/api/v1/employees")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", world!.tenantId)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((e: { workEmail?: string }) => e.workEmail === "employee-int@eva.test")).toBe(true);
  });

  it("GET /employees returns 401 problem+json on cross-tenant header mismatch", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .get("/api/v1/employees")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", "tenant_cross_denied")
      .expect(401);

    expect(String(res.headers["content-type"])).toContain("application/problem+json");
    expect(res.body).toMatchObject({
      status: 401,
      title: "Unauthorized",
      instance: "/api/v1/employees"
    });
  });

  it("GET /audit-logs returns problem-aware list for audit.read", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .get("/api/v1/audit-logs?limit=10")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", world!.tenantId)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("GET /admin/tenants lists tenants for tenant.manage", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .get("/api/v1/admin/tenants")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((t: { slug?: string }) => t.slug === world!.tenantSlug)).toBe(true);
  });

  it("GET /billing/subscription returns subscription for billing.manage", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .get("/api/v1/billing/subscription")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", world!.tenantId)
      .expect(200);

    expect(res.body.providerSubscriptionId).toBe(world!.stripeSubscriptionId);
  });

  it("GET /billing/subscription returns 401 problem+json on cross-tenant header mismatch", async () => {
    const login = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: world!.userEmail,
        password: world!.userPassword,
        tenantId: world!.tenantId
      })
      .expect(200);

    const token = login.body.accessToken as string;
    const res = await request(app.getHttpServer())
      .get("/api/v1/billing/subscription")
      .set("Authorization", `Bearer ${token}`)
      .set("x-tenant-id", "tenant_cross_denied")
      .expect(401);

    expect(String(res.headers["content-type"])).toContain("application/problem+json");
    expect(res.body).toMatchObject({
      status: 401,
      title: "Unauthorized",
      instance: "/api/v1/billing/subscription"
    });
  });

  it("POST /auth/login returns 429 as RFC 7807 when auth throttle is exceeded", async () => {
    const body = {
      email: world!.userEmail,
      password: "WrongPassword9!",
      tenantId: world!.tenantId
    };
    let saw429 = false;
    for (let i = 0; i < 40; i++) {
      const res = await request(app.getHttpServer()).post("/api/v1/auth/login").send(body);
      if (res.status === 429) {
        saw429 = true;
        expect(String(res.headers["content-type"])).toContain("application/problem+json");
        expect(res.body).toMatchObject({
          status: 429,
          title: "Too Many Requests",
          instance: "/api/v1/auth/login"
        });
        expect(typeof res.body.detail).toBe("string");
        break;
      }
      expect(res.status).toBe(401);
    }
    expect(saw429).toBe(true);
  });
});
