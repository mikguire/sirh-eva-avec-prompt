-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN "deductsPaidBalance" BOOLEAN NOT NULL DEFAULT false;

UPDATE "LeaveType"
SET "deductsPaidBalance" = true
WHERE UPPER("code") IN ('CP', 'PAID_LEAVE', 'CONGES_PAYES');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "linkedUserId" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex (unicité user-lié au sein du tenant ; plusieurs NULL autorisés côté PG)
CREATE UNIQUE INDEX "Employee_tenantId_linkedUserId_key" ON "Employee"("tenantId", "linkedUserId");

-- CreateTable
CREATE TABLE "TenantLeavePolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "acquisitionRatePerFullMonth" DECIMAL(4,2) NOT NULL DEFAULT 2.5,
    "carryOverEnabled" BOOLEAN NOT NULL DEFAULT true,
    "carryOverCapDays" DECIMAL(5,1) NOT NULL DEFAULT 30.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantLeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePaidLeaveBalance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "carriedOverDays" DECIMAL(7,1) NOT NULL DEFAULT 0,
    "expiredCarryDays" DECIMAL(7,1) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePaidLeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeavePaidAcquisition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "daysInMonth" INTEGER NOT NULL,
    "eligibleCalendarDays" INTEGER NOT NULL,
    "rawAcquisition" DECIMAL(10,6) NOT NULL,
    "acquiredDays" DECIMAL(6,1) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeavePaidAcquisition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantLeavePolicy_tenantId_key" ON "TenantLeavePolicy"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePaidLeaveBalance_employeeId_key" ON "EmployeePaidLeaveBalance"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "LeavePaidAcquisition_tenantId_employeeId_year_month_key" ON "LeavePaidAcquisition"("tenantId", "employeeId", "year", "month");

-- CreateIndex
CREATE INDEX "EmployeePaidLeaveBalance_tenantId_idx" ON "EmployeePaidLeaveBalance"("tenantId");

-- CreateIndex
CREATE INDEX "LeavePaidAcquisition_tenantId_employeeId_idx" ON "LeavePaidAcquisition"("tenantId", "employeeId");

-- CreateIndex (soldes / demandes actives)
CREATE INDEX "LeaveRequest_tenantId_employeeId_status_idx" ON "LeaveRequest"("tenantId", "employeeId", "status");

-- AddForeignKey
ALTER TABLE "TenantLeavePolicy" ADD CONSTRAINT "TenantLeavePolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePaidLeaveBalance" ADD CONSTRAINT "EmployeePaidLeaveBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePaidLeaveBalance" ADD CONSTRAINT "EmployeePaidLeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePaidAcquisition" ADD CONSTRAINT "LeavePaidAcquisition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePaidAcquisition" ADD CONSTRAINT "LeavePaidAcquisition_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
