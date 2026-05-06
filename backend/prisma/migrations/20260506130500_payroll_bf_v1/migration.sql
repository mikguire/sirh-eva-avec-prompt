-- CreateTable
CREATE TABLE "public"."PayrollBfLegalProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollBfLegalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PayrollBfLegalVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalProfileId" TEXT NOT NULL,
    "legalVersionId" TEXT NOT NULL,
    "effectiveStart" TIMESTAMP(3) NOT NULL,
    "effectiveEnd" TIMESTAMP(3),
    "cnssEmployeeRate" DECIMAL(6,5) NOT NULL,
    "cnssEmployerRate" DECIMAL(6,5) NOT NULL,
    "cnssCeilingXof" INTEGER NOT NULL,
    "carfoEmployeeRate" DECIMAL(6,5) NOT NULL,
    "carfoEmployerRate" DECIMAL(6,5) NOT NULL,
    "carfoEnabledRegimes" TEXT[],
    "smigXof" INTEGER NOT NULL,
    "smigControlEnabled" BOOLEAN NOT NULL DEFAULT true,
    "roundingMode" TEXT NOT NULL DEFAULT 'ROUND_HALF_UP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollBfLegalVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PayrollBfIutsBracket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalVersionId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "lowerBoundXof" INTEGER NOT NULL,
    "upperBoundXof" INTEGER,
    "rate" DECIMAL(6,5) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollBfIutsBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PayrollBfSimulation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "payrollDate" TIMESTAMP(3) NOT NULL,
    "employeeRegime" TEXT NOT NULL,
    "legalProfileId" TEXT NOT NULL,
    "legalVersionId" TEXT NOT NULL,
    "baseSalaryXof" INTEGER NOT NULL,
    "taxableBonusXof" INTEGER NOT NULL,
    "taxableOvertimeXof" INTEGER NOT NULL,
    "nontaxableAllowanceXof" INTEGER NOT NULL,
    "grossXof" INTEGER NOT NULL,
    "cnssEmployeeXof" INTEGER NOT NULL,
    "cnssEmployerXof" INTEGER NOT NULL,
    "iutsXof" INTEGER NOT NULL,
    "carfoEmployeeXof" INTEGER NOT NULL,
    "carfoEmployerXof" INTEGER NOT NULL,
    "netXof" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollBfSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollBfLegalProfile_tenantId_code_key" ON "public"."PayrollBfLegalProfile"("tenantId", "code");

-- CreateIndex
CREATE INDEX "PayrollBfLegalProfile_tenantId_idx" ON "public"."PayrollBfLegalProfile"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollBfLegalVersion_tenantId_legalVersionId_key" ON "public"."PayrollBfLegalVersion"("tenantId", "legalVersionId");

-- CreateIndex
CREATE INDEX "PayrollBfLegalVersion_tenantId_legalProfileId_effectiveStart_effectiveEnd_idx" ON "public"."PayrollBfLegalVersion"("tenantId", "legalProfileId", "effectiveStart", "effectiveEnd");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollBfIutsBracket_legalVersionId_ordinal_key" ON "public"."PayrollBfIutsBracket"("legalVersionId", "ordinal");

-- CreateIndex
CREATE INDEX "PayrollBfIutsBracket_tenantId_legalVersionId_idx" ON "public"."PayrollBfIutsBracket"("tenantId", "legalVersionId");

-- CreateIndex
CREATE INDEX "PayrollBfSimulation_tenantId_createdAt_idx" ON "public"."PayrollBfSimulation"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."PayrollBfLegalProfile" ADD CONSTRAINT "PayrollBfLegalProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayrollBfLegalVersion" ADD CONSTRAINT "PayrollBfLegalVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayrollBfLegalVersion" ADD CONSTRAINT "PayrollBfLegalVersion_legalProfileId_fkey" FOREIGN KEY ("legalProfileId") REFERENCES "public"."PayrollBfLegalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayrollBfIutsBracket" ADD CONSTRAINT "PayrollBfIutsBracket_legalVersionId_fkey" FOREIGN KEY ("legalVersionId") REFERENCES "public"."PayrollBfLegalVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayrollBfSimulation" ADD CONSTRAINT "PayrollBfSimulation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayrollBfSimulation" ADD CONSTRAINT "PayrollBfSimulation_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayrollBfSimulation" ADD CONSTRAINT "PayrollBfSimulation_legalVersionId_fkey" FOREIGN KEY ("legalVersionId") REFERENCES "public"."PayrollBfLegalVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
