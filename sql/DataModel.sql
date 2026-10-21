-- ============================================================================
-- ARCHIVO: sql/DataModel.sql
-- BASE DE DATOS: saasCloudDb
-- CASO 8: CLOUD NATIVE - PLATAFORMA SAAS MULTICLIENTE (5.000 ORGANIZACIONES)
-- MOTOR OBJETIVO: PostgreSQL 16 + Citus 12.1 (Nomenclatura camelCase)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- En Docker, la extensión citus y el registro de los workers los hace
-- docker/initCluster/00-InitSaasCluster.sh antes de ejecutar este archivo.
CREATE EXTENSION IF NOT EXISTS citus;

-- ----------------------------------------------------------------------------
-- 1. TABLA DE REFERENCIA GLOBAL: saasPlans (Catálogo Replicado en Todos los Nodos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "saasPlans" (
    "planCode"           VARCHAR(32) PRIMARY KEY,
    "planName"           VARCHAR(100) NOT NULL,
    "isolationStrategy"  VARCHAR(20) NOT NULL CHECK ("isolationStrategy" IN ('POOL', 'BRIDGE', 'SILO')),
    "maxUsers"           INT NOT NULL CHECK ("maxUsers" > 0),
    "maxRequestsPerSec"  INT NOT NULL CHECK ("maxRequestsPerSec" > 0),
    "storageQuotaGb"     INT NOT NULL CHECK ("storageQuotaGb" > 0),
    "monthlyPriceUsd"    NUMERIC(10, 2) NOT NULL CHECK ("monthlyPriceUsd" >= 0),
    "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO "saasPlans" ("planCode", "planName", "isolationStrategy", "maxUsers", "maxRequestsPerSec", "storageQuotaGb", "monthlyPriceUsd")
VALUES
    ('FREE',       'Starter Cloud Pool',     'POOL',   10,    25,   5,    0.00),
    ('PRO',        'Business Growth Pool',   'POOL',   100,   150,  100,  299.00),
    ('ENTERPRISE', 'Enterprise Dedicated',   'SILO',   10000, 1500, 5000, 2499.00)
ON CONFLICT ("planCode") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. TABLA RAÍZ DISTRIBUIDA: tenants (Organizaciones Clientes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tenants" (
    "tenantId"           UUID PRIMARY KEY,
    -- NOTA CITUS: una restricción UNIQUE en una tabla distribuida debe incluir la
    -- columna de distribución ("tenantId"). Por eso "orgSlug" no lleva UNIQUE global:
    -- su unicidad la valida el servicio de onboarding (provisionTenant) antes de insertar,
    -- y el índice "idxTenantsOrgSlug" (abajo) acelera la búsqueda por slug.
    "orgSlug"            VARCHAR(80) NOT NULL,
    "orgName"            VARCHAR(200) NOT NULL,
    "planCode"           VARCHAR(32) NOT NULL REFERENCES "saasPlans"("planCode"),
    "isolationMode"      VARCHAR(20) NOT NULL DEFAULT 'POOL' CHECK ("isolationMode" IN ('POOL', 'BRIDGE', 'SILO')),
    "dedicatedShardId"   BIGINT NULL,
    "status"             VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('PROVISIONING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    "regionPreference"   VARCHAR(32) NOT NULL DEFAULT 'us-east-1',
    "rateLimitRps"       INT NOT NULL DEFAULT 25 CHECK ("rateLimitRps" > 0),
    "maxDbConnections"   INT NOT NULL DEFAULT 10 CHECK ("maxDbConnections" > 0),
    "schemaVersion"      INT NOT NULL DEFAULT 1,
    "settings"           JSONB NOT NULL DEFAULT '{}'::JSONB,
    "version"            INT NOT NULL DEFAULT 1,
    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. TABLA DISTRIBUIDA CO-LOCALIZADA: tenantUsers (Usuarios por Organización)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "tenantUsers" (
    "tenantId"           UUID NOT NULL,
    "userId"             UUID NOT NULL,
    "email"              VARCHAR(255) NOT NULL,
    "fullName"           VARCHAR(150) NOT NULL,
    "role"               VARCHAR(30) NOT NULL CHECK ("role" IN ('OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER')),
    "isActive"           BOOLEAN NOT NULL DEFAULT TRUE,
    "mfaEnabled"         BOOLEAN NOT NULL DEFAULT FALSE,
    "customAttributes"   JSONB NOT NULL DEFAULT '{}'::JSONB,
    "version"            INT NOT NULL DEFAULT 1,
    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("tenantId", "userId"),
    UNIQUE ("tenantId", "email"),
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 4. TABLA DISTRIBUIDA CO-LOCALIZADA: projects (Proyectos Operativos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "projects" (
    "tenantId"           UUID NOT NULL,
    "projectId"          UUID NOT NULL,
    "projectCode"        VARCHAR(50) NOT NULL,
    "name"               VARCHAR(200) NOT NULL,
    "budgetAllocated"    NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK ("budgetAllocated" >= 0),
    "budgetConsumed"     NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK ("budgetConsumed" >= 0),
    "status"             VARCHAR(25) NOT NULL DEFAULT 'OPEN' CHECK ("status" IN ('OPEN', 'IN_PROGRESS', 'ON_HOLD', 'CLOSED')),
    "customAttributes"   JSONB NOT NULL DEFAULT '{}'::JSONB,
    "version"            INT NOT NULL DEFAULT 1,
    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("tenantId", "projectId"),
    UNIQUE ("tenantId", "projectCode"),
    CONSTRAINT "chkBudgetNotExceeded" CHECK ("budgetConsumed" <= "budgetAllocated"),
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("tenantId") ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 5. TABLA DISTRIBUIDA CO-LOCALIZADA: workOrders (Órdenes de Trabajo)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "workOrders" (
    "tenantId"           UUID NOT NULL,
    "orderId"            UUID NOT NULL,
    "projectId"          UUID NOT NULL,
    "assignedUserId"     UUID NULL,
    "idempotencyKey"     VARCHAR(128) NOT NULL,
    "title"              VARCHAR(250) NOT NULL,
    "priority"           VARCHAR(15) NOT NULL CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    "status"             VARCHAR(25) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    "amountUsd"          NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK ("amountUsd" >= 0),
    "customAttributes"   JSONB NOT NULL DEFAULT '{}'::JSONB,
    "version"            INT NOT NULL DEFAULT 1,
    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("tenantId", "orderId"),
    UNIQUE ("tenantId", "idempotencyKey"),
    FOREIGN KEY ("tenantId", "projectId") REFERENCES "projects"("tenantId", "projectId") ON DELETE RESTRICT,
    -- NOTA CITUS: no se admite ON DELETE SET NULL cuando la FK incluye la columna de
    -- distribución ("tenantId"). Se usa RESTRICT: los usuarios no se borran, se
    -- desactivan con "isActive" = FALSE (borrado lógico), conservando la trazabilidad.
    FOREIGN KEY ("tenantId", "assignedUserId") REFERENCES "tenantUsers"("tenantId", "userId") ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 6. TABLA DISTRIBUIDA CO-LOCALIZADA: invoices (Facturas y Pagos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "invoices" (
    "tenantId"           UUID NOT NULL,
    "invoiceId"          UUID NOT NULL,
    "orderId"            UUID NOT NULL,
    "idempotencyKey"     VARCHAR(128) NOT NULL,
    "invoiceNumber"      VARCHAR(60) NOT NULL,
    "subtotalUsd"        NUMERIC(12, 2) NOT NULL CHECK ("subtotalUsd" >= 0),
    "taxUsd"             NUMERIC(12, 2) NOT NULL CHECK ("taxUsd" >= 0),
    "totalUsd"           NUMERIC(12, 2) NOT NULL CHECK ("totalUsd" = "subtotalUsd" + "taxUsd"),
    "paymentStatus"      VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK ("paymentStatus" IN ('UNPAID', 'PAID', 'REFUNDED', 'VOID')),
    "version"            INT NOT NULL DEFAULT 1,
    "issuedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "paidAt"             TIMESTAMPTZ NULL,
    PRIMARY KEY ("tenantId", "invoiceId"),
    UNIQUE ("tenantId", "invoiceNumber"),
    UNIQUE ("tenantId", "idempotencyKey"),
    FOREIGN KEY ("tenantId", "orderId") REFERENCES "workOrders"("tenantId", "orderId") ON DELETE RESTRICT
);

-- ----------------------------------------------------------------------------
-- 7. TABLA DISTRIBUIDA CO-LOCALIZADA: auditEvents (Auditoría Inmutable)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "auditEvents" (
    "tenantId"           UUID NOT NULL,
    "eventId"            UUID NOT NULL,
    "actorUserId"        UUID NULL,
    "eventType"          VARCHAR(64) NOT NULL,
    "entityName"         VARCHAR(64) NOT NULL,
    "entityId"           VARCHAR(64) NOT NULL,
    "payload"            JSONB NOT NULL DEFAULT '{}'::JSONB,
    "clientIp"           VARCHAR(45) NULL,
    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("tenantId", "eventId", "createdAt")
);

-- ----------------------------------------------------------------------------
-- 8. ÍNDICES COMPUESTOS Y GIN BASADOS EN PATRONES DE ACCESO
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "idxTenantsOrgSlug"
    ON "tenants" ("orgSlug");

CREATE INDEX IF NOT EXISTS "idxWorkOrdersTenantStatusPriority"
    ON "workOrders" ("tenantId", "status", "priority", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idxWorkOrdersTenantProject"
    ON "workOrders" ("tenantId", "projectId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "idxWorkOrdersCustomAttributesGin"
    ON "workOrders" USING GIN ("customAttributes" jsonb_path_ops);

CREATE INDEX IF NOT EXISTS "idxInvoicesTenantStatusIssued"
    ON "invoices" ("tenantId", "paymentStatus", "issuedAt" DESC);

CREATE INDEX IF NOT EXISTS "idxAuditEventsTenantCreated"
    ON "auditEvents" ("tenantId", "createdAt" DESC);
