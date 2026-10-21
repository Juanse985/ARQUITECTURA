-- ============================================================================
-- ARCHIVO: sql/TenantSecurityRls.sql
-- BASE DE DATOS: saasCloudDb
-- CASO 8: CLOUD NATIVE - AISLAMIENTO MULTI-TENANT (ROW-LEVEL SECURITY + RBAC)
-- ============================================================================

-- 1. Roles con separación estricta de privilegios (Mínimo Privilegio)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saasAppRuntime') THEN
        CREATE ROLE "saasAppRuntime" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saasProvisionerAdmin') THEN
        CREATE ROLE "saasProvisionerAdmin" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE BYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saasReadonlyAuditor') THEN
        CREATE ROLE "saasReadonlyAuditor" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
END
$$;

-- 2. Permisos para el rol de ejecución de la aplicación (`saasAppRuntime`)
GRANT SELECT ON "saasPlans" TO "saasAppRuntime";
GRANT SELECT, UPDATE ON "tenants" TO "saasAppRuntime";
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenantUsers", "projects", "workOrders", "invoices" TO "saasAppRuntime";
GRANT SELECT, INSERT ON "auditEvents" TO "saasAppRuntime";

-- 3. Función Fail-Closed que obtiene `app.currentTenantId` de la sesión actual
CREATE OR REPLACE FUNCTION "currentAppTenantId"() RETURNS UUID
LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(current_setting('app.currentTenantId', true), '')::UUID;
$$;

-- 3.1 NOTA CITUS: las políticas RLS se evalúan en cada worker. Para que el valor de
--     `SET LOCAL app.currentTenantId` llegue a los workers, Citus debe propagar los SET LOCAL.
--     (Sin esto el worker ve NULL y RLS devuelve 0 filas: falla cerrado, pero inútil.)
--     Además, Citus se conecta a los workers con el rol actual, por lo que
--     saasAppRuntime necesita LOGIN; eso lo hace docker/initCluster/00-InitSaasCluster.sh
--     con la contraseña de la variable SAAS_APP_PASSWORD (no se guarda en este archivo).
ALTER DATABASE "saasCloudDb" SET citus.propagate_set_commands TO 'local';
SET citus.propagate_set_commands TO 'local';

-- 4. Habilitar y forzar Row-Level Security (RLS) en todas las tablas multi-tenant
ALTER TABLE "tenants"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants"     FORCE ROW LEVEL SECURITY;

ALTER TABLE "tenantUsers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenantUsers" FORCE ROW LEVEL SECURITY;

ALTER TABLE "projects"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects"    FORCE ROW LEVEL SECURITY;

ALTER TABLE "workOrders"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workOrders"  FORCE ROW LEVEL SECURITY;

ALTER TABLE "invoices"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices"    FORCE ROW LEVEL SECURITY;

ALTER TABLE "auditEvents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auditEvents" FORCE ROW LEVEL SECURITY;

-- 5. Políticas de aislamiento estricto por `tenantId`
DROP POLICY IF EXISTS "rlsTenantIsolationTenants" ON "tenants";
CREATE POLICY "rlsTenantIsolationTenants" ON "tenants"
    FOR ALL TO "saasAppRuntime"
    USING ("tenantId" = "currentAppTenantId"())
    WITH CHECK ("tenantId" = "currentAppTenantId"());

DROP POLICY IF EXISTS "rlsTenantIsolationUsers" ON "tenantUsers";
CREATE POLICY "rlsTenantIsolationUsers" ON "tenantUsers"
    FOR ALL TO "saasAppRuntime"
    USING ("tenantId" = "currentAppTenantId"())
    WITH CHECK ("tenantId" = "currentAppTenantId"());

DROP POLICY IF EXISTS "rlsTenantIsolationProjects" ON "projects";
CREATE POLICY "rlsTenantIsolationProjects" ON "projects"
    FOR ALL TO "saasAppRuntime"
    USING ("tenantId" = "currentAppTenantId"())
    WITH CHECK ("tenantId" = "currentAppTenantId"());

DROP POLICY IF EXISTS "rlsTenantIsolationOrders" ON "workOrders";
CREATE POLICY "rlsTenantIsolationOrders" ON "workOrders"
    FOR ALL TO "saasAppRuntime"
    USING ("tenantId" = "currentAppTenantId"())
    WITH CHECK ("tenantId" = "currentAppTenantId"());

DROP POLICY IF EXISTS "rlsTenantIsolationInvoices" ON "invoices";
CREATE POLICY "rlsTenantIsolationInvoices" ON "invoices"
    FOR ALL TO "saasAppRuntime"
    USING ("tenantId" = "currentAppTenantId"())
    WITH CHECK ("tenantId" = "currentAppTenantId"());

DROP POLICY IF EXISTS "rlsTenantIsolationAudit" ON "auditEvents";
CREATE POLICY "rlsTenantIsolationAudit" ON "auditEvents"
    FOR ALL TO "saasAppRuntime"
    USING ("tenantId" = "currentAppTenantId"())
    WITH CHECK ("tenantId" = "currentAppTenantId"());
