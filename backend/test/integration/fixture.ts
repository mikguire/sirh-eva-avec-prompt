import * as argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

export type IntegrationWorld = {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  userEmail: string;
  userPassword: string;
  limitedUserEmail: string;
  limitedUserPassword: string;
  employeeId: string;
  leaveTypeId: string;
  planId: string;
  subscriptionId: string;
  stripeSubscriptionId: string;
  payrollLegalProfileId: string;
};

const TEST_EMAIL = "integration@eva.test";
const TEST_PASSWORD = "TestPass12!";
const LIMITED_TEST_EMAIL = "integration-limited@eva.test";
const LIMITED_TEST_PASSWORD = "TestPass12!";
const TEST_SLUG = "eva-integration-test";
const STRIPE_SUB_ID = "sub_integration_test_001";
const LIMITED_ROLE_ID = "role_int_limited";

/**
 * Prépare un tenant + utilisateur owner (toutes permissions seed) + employé + type de congé + abonnement Stripe fictif.
 * Appeler après `prisma db push` et `prisma db seed` (ou équivalent permissions / rôle owner).
 */
export async function seedIntegrationWorld(prisma: PrismaClient): Promise<IntegrationWorld> {
  const employeeReadPermission = await prisma.permission.findUnique({ where: { key: "employee.read" } });
  if (!employeeReadPermission) {
    throw new Error("Missing permission 'employee.read'. Run prisma seed first.");
  }
  await prisma.role.upsert({
    where: { id: LIMITED_ROLE_ID },
    update: {
      name: "integration-limited",
      description: "Integration limited role"
    },
    create: {
      id: LIMITED_ROLE_ID,
      name: "integration-limited",
      description: "Integration limited role",
      isSystem: false
    }
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: LIMITED_ROLE_ID } });
  await prisma.rolePermission.create({
    data: {
      roleId: LIMITED_ROLE_ID,
      permissionId: employeeReadPermission.id
    }
  });

  await prisma.subscription.deleteMany({ where: { plan: { code: "plan_int_test" } } });
  await prisma.plan.deleteMany({ where: { code: "plan_int_test" } });
  await prisma.leaveRequest.deleteMany({ where: { tenant: { slug: TEST_SLUG } } });
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: TEST_SLUG } });
  if (existingTenant) {
    await prisma.payrollBfIutsBracket.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.payrollBfSimulation.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.payrollBfLegalVersion.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.payrollBfLegalProfile.deleteMany({ where: { tenantId: existingTenant.id } });
  }
  await prisma.subscription.deleteMany({ where: { tenant: { slug: TEST_SLUG } } });
  await prisma.employee.deleteMany({ where: { tenant: { slug: TEST_SLUG } } });
  await prisma.leaveType.deleteMany({ where: { tenant: { slug: TEST_SLUG } } });
  await prisma.tenantUser.deleteMany({ where: { tenant: { slug: TEST_SLUG } } });
  await prisma.tenant.deleteMany({ where: { slug: TEST_SLUG } });
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  await prisma.user.deleteMany({ where: { email: LIMITED_TEST_EMAIL } });

  const passwordHash = await argon2.hash(TEST_PASSWORD);
  const limitedPasswordHash = await argon2.hash(LIMITED_TEST_PASSWORD);
  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      passwordHash,
      firstName: "Int",
      lastName: "Egration",
      status: "ACTIVE"
    }
  });
  const limitedUser = await prisma.user.create({
    data: {
      email: LIMITED_TEST_EMAIL,
      passwordHash: limitedPasswordHash,
      firstName: "Limited",
      lastName: "User",
      status: "ACTIVE"
    }
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: "Tenant intégration",
      slug: TEST_SLUG,
      status: "ACTIVE"
    }
  });

  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      roleId: "role_owner",
      status: "ACTIVE"
    }
  });
  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      userId: limitedUser.id,
      roleId: LIMITED_ROLE_ID,
      status: "ACTIVE"
    }
  });

  const leaveType = await prisma.leaveType.create({
    data: {
      tenantId: tenant.id,
      code: "CP",
      label: "Congés payés",
      defaultDays: 25
    }
  });

  const employee = await prisma.employee.create({
    data: {
      tenantId: tenant.id,
      workEmail: "employee-int@eva.test",
      firstName: "Emp",
      lastName: "Loyee",
      hireDate: new Date("2024-01-15"),
      status: "ACTIVE"
    }
  });

  const plan = await prisma.plan.create({
    data: {
      code: "plan_int_test",
      displayName: "Plan test intégration",
      monthlyPriceCents: 1000,
      yearlyPriceCents: 10000,
      maxEmployees: 50
    }
  });

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const subscription = await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: plan.id,
      status: "TRIALING",
      providerCustomerId: "cus_test_integration",
      providerSubscriptionId: STRIPE_SUB_ID,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd
    }
  });

  const legalProfile = await prisma.payrollBfLegalProfile.create({
    data: {
      tenantId: tenant.id,
      code: "BF-DEFAULT",
      label: "Burkina Faso - Profil integration",
      currency: "XOF"
    }
  });
  const legalVersion = await prisma.payrollBfLegalVersion.create({
    data: {
      tenantId: tenant.id,
      legalProfileId: legalProfile.id,
      legalVersionId: "BF-2026-01",
      effectiveStart: new Date("2026-01-01T00:00:00.000Z"),
      effectiveEnd: null,
      cnssEmployeeRate: "0.055",
      cnssEmployerRate: "0.16",
      cnssCeilingXof: 1_000_000,
      carfoEmployeeRate: "0.08",
      carfoEmployerRate: "0.12",
      carfoEnabledRegimes: ["PUBLIC_CARFO"],
      smigXof: 45_000,
      smigControlEnabled: true,
      roundingMode: "ROUND_HALF_UP"
    }
  });
  await prisma.payrollBfIutsBracket.createMany({
    data: [
      { tenantId: tenant.id, legalVersionId: legalVersion.id, ordinal: 1, lowerBoundXof: 0, upperBoundXof: 30_000, rate: "0.00" },
      { tenantId: tenant.id, legalVersionId: legalVersion.id, ordinal: 2, lowerBoundXof: 30_000, upperBoundXof: 50_000, rate: "0.12" },
      { tenantId: tenant.id, legalVersionId: legalVersion.id, ordinal: 3, lowerBoundXof: 50_000, upperBoundXof: 80_000, rate: "0.20" },
      { tenantId: tenant.id, legalVersionId: legalVersion.id, ordinal: 4, lowerBoundXof: 80_000, upperBoundXof: null, rate: "0.25" }
    ]
  });

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    userId: user.id,
    userEmail: TEST_EMAIL,
    userPassword: TEST_PASSWORD,
    limitedUserEmail: LIMITED_TEST_EMAIL,
    limitedUserPassword: LIMITED_TEST_PASSWORD,
    employeeId: employee.id,
    leaveTypeId: leaveType.id,
    planId: plan.id,
    subscriptionId: subscription.id,
    stripeSubscriptionId: STRIPE_SUB_ID,
    payrollLegalProfileId: legalProfile.id
  };
}

export async function tearDownIntegrationWorld(prisma: PrismaClient, world: IntegrationWorld): Promise<void> {
  await prisma.leaveRequest.deleteMany({ where: { tenantId: world.tenantId } });
  await prisma.payrollBfSimulation.deleteMany({ where: { tenantId: world.tenantId } });
  await prisma.payrollBfIutsBracket.deleteMany({ where: { tenantId: world.tenantId } });
  await prisma.payrollBfLegalVersion.deleteMany({ where: { tenantId: world.tenantId } });
  await prisma.payrollBfLegalProfile.deleteMany({ where: { tenantId: world.tenantId } });
  await prisma.userSession.deleteMany({ where: { userId: world.userId } });
  await prisma.userSession.deleteMany({ where: { user: { email: LIMITED_TEST_EMAIL } } });
  await prisma.subscription.deleteMany({ where: { tenantId: world.tenantId } });
  await prisma.employee.deleteMany({ where: { tenantId: world.tenantId } });
  await prisma.leaveType.deleteMany({ where: { tenantId: world.tenantId } });
  await prisma.tenantUser.deleteMany({ where: { tenantId: world.tenantId } });
  await prisma.tenant.delete({ where: { id: world.tenantId } });
  await prisma.plan.deleteMany({ where: { id: world.planId } });
  await prisma.user.delete({ where: { id: world.userId } });
  await prisma.user.deleteMany({ where: { email: LIMITED_TEST_EMAIL } });
}
