import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissionKeys = [
  "employee.read",
  "employee.write",
  "leave.read",
  "leave.write",
  "leave.approve",
  "payroll.simulate",
  "billing.manage",
  "audit.read",
  "tenant.manage"
];

async function main(): Promise<void> {
  for (const key of permissionKeys) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, description: key }
    });
  }

  const ownerRole = await prisma.role.upsert({
    where: { id: "role_owner" },
    update: {},
    create: {
      id: "role_owner",
      name: "owner",
      description: "Tenant owner",
      isSystem: true
    }
  });

  const perms = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } }
  });

  for (const permission of perms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: ownerRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: ownerRole.id,
        permissionId: permission.id
      }
    });
  }

  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    return;
  }

  const legalProfile = await prisma.payrollBfLegalProfile.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: "BF-DEFAULT"
      }
    },
    update: {
      label: "Burkina Faso - Profil par defaut",
      currency: "XOF"
    },
    create: {
      tenantId: tenant.id,
      code: "BF-DEFAULT",
      label: "Burkina Faso - Profil par defaut",
      currency: "XOF"
    }
  });

  const versions = [
    {
      legalVersionId: "BF-2025-01",
      effectiveStart: new Date("2025-01-01T00:00:00.000Z"),
      effectiveEnd: new Date("2026-01-01T00:00:00.000Z"),
      cnssEmployeeRate: "0.05",
      cnssEmployerRate: "0.15",
      cnssCeilingXof: 1_000_000,
      carfoEmployeeRate: "0.08",
      carfoEmployerRate: "0.12",
      carfoEnabledRegimes: ["PUBLIC_CARFO"],
      smigXof: 45_000,
      smigControlEnabled: true,
      roundingMode: "ROUND_HALF_UP",
      iutsBrackets: [
        { ordinal: 1, lowerBoundXof: 0, upperBoundXof: 30_000, rate: "0.00" },
        { ordinal: 2, lowerBoundXof: 30_000, upperBoundXof: 60_000, rate: "0.10" },
        { ordinal: 3, lowerBoundXof: 60_000, upperBoundXof: null, rate: "0.20" }
      ]
    },
    {
      legalVersionId: "BF-2026-01",
      effectiveStart: new Date("2026-01-01T00:00:00.000Z"),
      effectiveEnd: null,
      cnssEmployeeRate: "0.055",
      cnssEmployerRate: "0.16",
      cnssCeilingXof: 800_000,
      carfoEmployeeRate: "0.08",
      carfoEmployerRate: "0.12",
      carfoEnabledRegimes: ["PUBLIC_CARFO"],
      smigXof: 45_000,
      smigControlEnabled: true,
      roundingMode: "ROUND_HALF_UP",
      iutsBrackets: [
        { ordinal: 1, lowerBoundXof: 0, upperBoundXof: 30_000, rate: "0.00" },
        { ordinal: 2, lowerBoundXof: 30_000, upperBoundXof: 50_000, rate: "0.121" },
        { ordinal: 3, lowerBoundXof: 50_000, upperBoundXof: 80_000, rate: "0.139" },
        { ordinal: 4, lowerBoundXof: 80_000, upperBoundXof: 120_000, rate: "0.157" },
        { ordinal: 5, lowerBoundXof: 120_000, upperBoundXof: 170_000, rate: "0.184" },
        { ordinal: 6, lowerBoundXof: 170_000, upperBoundXof: 250_000, rate: "0.217" },
        { ordinal: 7, lowerBoundXof: 250_000, upperBoundXof: null, rate: "0.25" }
      ]
    }
  ];

  for (const version of versions) {
    const upsertedVersion = await prisma.payrollBfLegalVersion.upsert({
      where: {
        tenantId_legalVersionId: {
          tenantId: tenant.id,
          legalVersionId: version.legalVersionId
        }
      },
      update: {
        legalProfileId: legalProfile.id,
        effectiveStart: version.effectiveStart,
        effectiveEnd: version.effectiveEnd,
        cnssEmployeeRate: version.cnssEmployeeRate,
        cnssEmployerRate: version.cnssEmployerRate,
        cnssCeilingXof: version.cnssCeilingXof,
        carfoEmployeeRate: version.carfoEmployeeRate,
        carfoEmployerRate: version.carfoEmployerRate,
        carfoEnabledRegimes: version.carfoEnabledRegimes,
        smigXof: version.smigXof,
        smigControlEnabled: version.smigControlEnabled,
        roundingMode: version.roundingMode
      },
      create: {
        tenantId: tenant.id,
        legalProfileId: legalProfile.id,
        legalVersionId: version.legalVersionId,
        effectiveStart: version.effectiveStart,
        effectiveEnd: version.effectiveEnd,
        cnssEmployeeRate: version.cnssEmployeeRate,
        cnssEmployerRate: version.cnssEmployerRate,
        cnssCeilingXof: version.cnssCeilingXof,
        carfoEmployeeRate: version.carfoEmployeeRate,
        carfoEmployerRate: version.carfoEmployerRate,
        carfoEnabledRegimes: version.carfoEnabledRegimes,
        smigXof: version.smigXof,
        smigControlEnabled: version.smigControlEnabled,
        roundingMode: version.roundingMode
      }
    });

    await prisma.payrollBfIutsBracket.deleteMany({
      where: { legalVersionId: upsertedVersion.id }
    });
    await prisma.payrollBfIutsBracket.createMany({
      data: version.iutsBrackets.map((bracket) => ({
        tenantId: tenant.id,
        legalVersionId: upsertedVersion.id,
        ordinal: bracket.ordinal,
        lowerBoundXof: bracket.lowerBoundXof,
        upperBoundXof: bracket.upperBoundXof,
        rate: bracket.rate
      }))
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
