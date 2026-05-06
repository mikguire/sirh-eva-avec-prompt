-- Enable RLS on tenant-scoped tables
ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

-- App sets this each request:
-- SET app.current_tenant = '<tenant-id>';

CREATE POLICY tenant_employee_policy ON "Employee"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_leave_request_policy ON "LeaveRequest"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_document_policy ON "Document"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_audit_log_policy ON "AuditLog"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_subscription_policy ON "Subscription"
  USING ("tenantId" = current_setting('app.current_tenant', true));

CREATE POLICY tenant_notification_policy ON "Notification"
  USING ("tenantId" = current_setting('app.current_tenant', true));
