-- ============================================================================
-- ARCHIVO: sql/BusinessQueries.sql
-- BASE DE DATOS: saasCloudDb
-- CASO 8: CLOUD NATIVE - OPERACIONES CRÍTICAS Y CONSULTAS REPRESENTATIVAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- OPERACIÓN CRÍTICA 1: ONBOARDING ATÓMICO ZERO-DOWNTIME DE UN NUEVO CLIENTE
-- ----------------------------------------------------------------------------
BEGIN;

INSERT INTO "tenants" (
    "tenantId", "orgSlug", "orgName", "planCode", "isolationMode",
    "status", "regionPreference", "rateLimitRps", "maxDbConnections", "settings"
) VALUES (
    '018f1a00-0000-7000-8000-000000001389',
    'org-1389-salud-integral',
    'Organizacion Salud Integral S.A.S.',
    'PRO',
    'POOL',
    'ACTIVE',
    'us-east-1',
    150,
    25,
    '{"timezone": "America/Bogota", "currency": "USD", "features": ["customWorkflows", "auditExport"]}'::JSONB
) ON CONFLICT ("tenantId") DO NOTHING;

INSERT INTO "tenantUsers" (
    "tenantId", "userId", "email", "fullName", "role", "isActive", "mfaEnabled"
) VALUES (
    '018f1a00-0000-7000-8000-000000001389',
    '018f1a00-0001-7000-8000-000000000001',
    'admin@saludintegral.co',
    'Dra. Camila Mendoza',
    'OWNER',
    TRUE,
    TRUE
) ON CONFLICT ("tenantId", "email") DO NOTHING;

INSERT INTO "auditEvents" (
    "tenantId", "eventId", "actorUserId", "eventType", "entityName", "entityId", "payload"
)
SELECT
    '018f1a00-0000-7000-8000-000000001389',
    '018f1a00-0009-7000-8000-000000000001',
    '018f1a00-0001-7000-8000-000000000001',
    'TENANT_PROVISIONED',
    'tenants',
    '018f1a00-0000-7000-8000-000000001389',
    '{"planCode": "PRO", "zeroDowntime": true}'::JSONB
WHERE NOT EXISTS (  -- idempotente: no duplica el evento si el script se ejecuta otra vez
    SELECT 1 FROM "auditEvents"
    WHERE "tenantId" = '018f1a00-0000-7000-8000-000000001389'
      AND "eventId"  = '018f1a00-0009-7000-8000-000000000001'
);

COMMIT;

-- ----------------------------------------------------------------------------
-- OPERACIÓN CRÍTICA 2: CREACIÓN IDEMPOTENTE DE ORDEN + CONTROL DE PRESUPUESTO
-- ----------------------------------------------------------------------------
BEGIN;
SET LOCAL ROLE "saasAppRuntime";
SET LOCAL app.currentTenantId = '018f1a00-0000-7000-8000-000000000001';

WITH "insertedOrder" AS (
    INSERT INTO "workOrders" (
        "tenantId", "orderId", "projectId", "assignedUserId",
        "idempotencyKey", "title", "priority", "status", "amountUsd", "customAttributes"
    ) VALUES (
        '018f1a00-0000-7000-8000-000000000001',
        '018f1a00-0003-7000-8000-000000009901',
        '018f1a00-0002-7000-8000-000000000001',
        '018f1a00-0001-7000-8000-000000000001',
        'idem-ord-2026-10-20-0009901',
        'Renovacion de licencias de telemetria clinica',
        'HIGH',
        'IN_PROGRESS',
        1250.00,
        '{"costCenter": "CC-BOG-04", "slaHours": 12}'::JSONB
    )
    ON CONFLICT ("tenantId", "idempotencyKey") DO NOTHING
    RETURNING "tenantId", "projectId", "amountUsd"
)
UPDATE "projects" p
SET "budgetConsumed" = p."budgetConsumed" + io."amountUsd",
    "version" = p."version" + 1,
    "updatedAt" = NOW()
FROM "insertedOrder" io
WHERE p."tenantId" = io."tenantId"
  AND p."projectId" = io."projectId";

COMMIT;

-- ----------------------------------------------------------------------------
-- OPERACIÓN CRÍTICA 3: ACTUALIZACIÓN CONCURRENTE CON BLOQUEO OPTIMISTA (OCC)
-- ----------------------------------------------------------------------------
BEGIN;
SET LOCAL ROLE "saasAppRuntime";
SET LOCAL app.currentTenantId = '018f1a00-0000-7000-8000-000000000001';

UPDATE "workOrders"
SET "status" = 'COMPLETED',
    "version" = "version" + 1,
    "updatedAt" = NOW()
WHERE "tenantId" = '018f1a00-0000-7000-8000-000000000001'
  AND "orderId"  = '018f1a00-0003-7000-8000-000000009901'
  AND "version"  = 1;

COMMIT;

-- ----------------------------------------------------------------------------
-- CONSULTA REPRESENTATIVA 4: DASHBOARD OPERATIVO CO-LOCALIZADO (SINGLE-SHARD)
-- ----------------------------------------------------------------------------
SELECT
    wo."orderId",
    wo."title",
    wo."priority",
    wo."status",
    wo."amountUsd",
    p."projectCode",
    p."name" AS "projectName",
    u."fullName" AS "assignedTo",
    wo."createdAt"
FROM "workOrders" wo
JOIN "projects" p
  ON wo."tenantId" = p."tenantId" AND wo."projectId" = p."projectId"
LEFT JOIN "tenantUsers" u
  ON wo."tenantId" = u."tenantId" AND wo."assignedUserId" = u."userId"
WHERE wo."tenantId" = '018f1a00-0000-7000-8000-000000000001'
  AND wo."status" IN ('PENDING', 'IN_PROGRESS')
ORDER BY wo."createdAt" DESC
LIMIT 50;

-- ----------------------------------------------------------------------------
-- CONSULTA REPRESENTATIVA 5: BÚSQUEDA POR ATRIBUTOS PERSONALIZADOS (JSONB GIN)
-- ----------------------------------------------------------------------------
SELECT
    "orderId",
    "title",
    "priority",
    "customAttributes"->>'costCenter' AS "costCenter",
    ("customAttributes"->>'slaHours')::INT AS "slaHours"
FROM "workOrders"
WHERE "tenantId" = '018f1a00-0000-7000-8000-000000000001'
  AND "customAttributes" @> '{"costCenter": "CC-BOG-04"}'::JSONB;
