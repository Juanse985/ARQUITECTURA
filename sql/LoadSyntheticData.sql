-- ============================================================================
-- ARCHIVO: sql/LoadSyntheticData.sql
-- BASE DE DATOS: saasCloudDb
-- CASO 8: CLOUD NATIVE - CARGA DE LOS DATOS SINTÉTICOS (data/*.csv) EN EL CLÚSTER CITUS
-- ----------------------------------------------------------------------------
-- Se ejecuta con psql dentro del contenedor citusCoordinator, donde la carpeta
-- data/ está montada en /saasData (ver docker/docker-compose.yml).
-- Los CSV generados por scripts/SyntheticData.py no traen todas las columnas del
-- modelo (userId, title, orgName, ...); aquí se cargan en tablas temporales y se
-- completan los campos derivados de forma determinística.
-- ============================================================================

-- 1. Tablas temporales con la forma exacta de cada CSV --------------------------
CREATE TEMP TABLE "stgCatalog" (
    "tenantId" UUID, "orgSlug" TEXT, "orgName" TEXT, "industry" TEXT, "planCode" TEXT,
    "isolationMode" TEXT, "regionPreference" TEXT, "rateLimitRps" INT,
    "estimatedUsers" INT, "estimatedDailyOrders" INT, "assignedShardId" INT
);
CREATE TEMP TABLE "stgTenants" (
    "tenantId" UUID, "orgSlug" TEXT, "planCode" TEXT, "shardId" INT,
    "primaryNode" TEXT, "replicaNode" TEXT
);
CREATE TEMP TABLE "stgUsers" ("tenantId" UUID, "email" TEXT, "role" TEXT, "planCode" TEXT);
CREATE TEMP TABLE "stgProjects" (
    "tenantId" UUID, "projectId" UUID, "projectCode" TEXT, "name" TEXT, "budgetAllocated" NUMERIC
);
CREATE TEMP TABLE "stgWorkOrders" (
    "tenantId" UUID, "orderId" UUID, "projectId" UUID, "idempotencyKey" TEXT,
    "priority" TEXT, "amountUsd" NUMERIC, "costCenter" TEXT
);
CREATE TEMP TABLE "stgInvoices" (
    "tenantId" UUID, "invoiceId" UUID, "orderId" UUID, "invoiceNumber" TEXT,
    "subtotalUsd" NUMERIC, "taxUsd" NUMERIC, "totalUsd" NUMERIC, "orderStatus" TEXT
);

\copy "stgCatalog"    FROM '/saasData/TenantsCatalog5000.csv' WITH (FORMAT csv, HEADER true)
\copy "stgTenants"    FROM '/saasData/Tenants.csv'            WITH (FORMAT csv, HEADER true)
\copy "stgUsers"      FROM '/saasData/Users.csv'              WITH (FORMAT csv, HEADER true)
\copy "stgProjects"   FROM '/saasData/Projects.csv'           WITH (FORMAT csv, HEADER true)
\copy "stgWorkOrders" FROM '/saasData/WorkOrders.csv'         WITH (FORMAT csv, HEADER true)
\copy "stgInvoices"   FROM '/saasData/Invoices.csv'           WITH (FORMAT csv, HEADER true)

BEGIN;

-- 2. tenants: las 120 organizaciones activas, con sus datos del catálogo de 5.000 ---
--    Todas arrancan en modo POOL; las ENTERPRISE se aíslan al nodo Silo con
--    "isolateEnterpriseTenantOnline" (ver sql/ClusterDemo.sql).
INSERT INTO "tenants" (
    "tenantId", "orgSlug", "orgName", "planCode", "isolationMode", "status",
    "regionPreference", "rateLimitRps", "maxDbConnections", "settings"
)
SELECT t."tenantId", t."orgSlug", c."orgName", t."planCode", 'POOL', 'ACTIVE',
       c."regionPreference", c."rateLimitRps",
       CASE t."planCode" WHEN 'ENTERPRISE' THEN 100 WHEN 'PRO' THEN 25 ELSE 10 END,
       jsonb_build_object('industry', c."industry", 'targetIsolation', c."isolationMode",
                          'estimatedUsers', c."estimatedUsers")
FROM "stgTenants" t
JOIN "stgCatalog" c ON c."tenantId" = t."tenantId";

-- 3. tenantUsers: el userId se deriva del email (UUID v5 determinístico) ----------
INSERT INTO "tenantUsers" ("tenantId", "userId", "email", "fullName", "role", "isActive", "mfaEnabled")
SELECT u."tenantId",
       uuid_generate_v5(u."tenantId", u."email"),
       u."email",
       'Owner ' || split_part(split_part(u."email", '@', 2), '.', 1),
       u."role", TRUE, (u."planCode" <> 'FREE')
FROM "stgUsers" u;

-- 4. projects: budgetConsumed = suma de sus órdenes (cumple chkBudgetNotExceeded) ---
INSERT INTO "projects" ("tenantId", "projectId", "projectCode", "name", "budgetAllocated", "budgetConsumed", "status")
SELECT p."tenantId", p."projectId", p."projectCode", p."name", p."budgetAllocated",
       COALESCE(w."consumed", 0), 'IN_PROGRESS'
FROM "stgProjects" p
LEFT JOIN (
    SELECT "tenantId", "projectId", SUM("amountUsd") AS "consumed"
    FROM "stgWorkOrders" GROUP BY 1, 2
) w ON w."tenantId" = p."tenantId" AND w."projectId" = p."projectId";

-- 5. workOrders: estado tomado de la factura asociada (si existe) -----------------
INSERT INTO "workOrders" (
    "tenantId", "orderId", "projectId", "idempotencyKey", "title", "priority",
    "status", "amountUsd", "customAttributes"
)
SELECT w."tenantId", w."orderId", w."projectId", w."idempotencyKey",
       'Orden ' || w."idempotencyKey",
       w."priority",
       COALESCE(i."orderStatus", 'PENDING'),
       w."amountUsd",
       jsonb_build_object('costCenter', w."costCenter",
                          'slaHours', CASE w."priority" WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 12
                                                        WHEN 'MEDIUM' THEN 24 ELSE 48 END)
FROM "stgWorkOrders" w
LEFT JOIN "stgInvoices" i ON i."tenantId" = w."tenantId" AND i."orderId" = w."orderId";

-- 6. invoices: COMPLETED -> PAID; el resto queda UNPAID -----------------------------
INSERT INTO "invoices" (
    "tenantId", "invoiceId", "orderId", "idempotencyKey", "invoiceNumber",
    "subtotalUsd", "taxUsd", "totalUsd", "paymentStatus", "paidAt"
)
SELECT i."tenantId", i."invoiceId", i."orderId", 'idem-' || i."invoiceNumber", i."invoiceNumber",
       i."subtotalUsd", i."taxUsd", i."subtotalUsd" + i."taxUsd",
       CASE WHEN i."orderStatus" = 'COMPLETED' THEN 'PAID' ELSE 'UNPAID' END,
       CASE WHEN i."orderStatus" = 'COMPLETED' THEN NOW() END
FROM "stgInvoices" i;

-- 7. Organización de demostración usada por sql/BusinessQueries.sql ---------------
INSERT INTO "tenants" ("tenantId", "orgSlug", "orgName", "planCode", "isolationMode", "status", "rateLimitRps", "maxDbConnections")
VALUES ('018f1a00-0000-7000-8000-000000000001', 'org-demo-clinica-bogota', 'Clinica Demo Bogota S.A.S.', 'PRO', 'POOL', 'ACTIVE', 150, 25);

INSERT INTO "tenantUsers" ("tenantId", "userId", "email", "fullName", "role", "mfaEnabled")
VALUES ('018f1a00-0000-7000-8000-000000000001', '018f1a00-0001-7000-8000-000000000001',
        'owner@clinicademo.co', 'Andres Demo', 'OWNER', TRUE);

INSERT INTO "projects" ("tenantId", "projectId", "projectCode", "name", "budgetAllocated", "budgetConsumed", "status")
VALUES ('018f1a00-0000-7000-8000-000000000001', '018f1a00-0002-7000-8000-000000000001',
        'PRJ-DEMO-01', 'Telemetria clinica', 50000.00, 0.00, 'IN_PROGRESS');

-- 8. Evento de auditoría por cada organización cargada --------------------------
INSERT INTO "auditEvents" ("tenantId", "eventId", "eventType", "entityName", "entityId", "payload")
SELECT "tenantId", uuid_generate_v5("tenantId", 'TENANT_PROVISIONED'), 'TENANT_PROVISIONED',
       'tenants', "tenantId"::TEXT, jsonb_build_object('planCode', "planCode", 'source', 'LoadSyntheticData')
FROM "tenants";

COMMIT;

-- 9. Resumen de la carga --------------------------------------------------------
SELECT 'tenants' AS "tableName", COUNT(*) AS "totalRows" FROM "tenants"
UNION ALL SELECT 'tenantUsers', COUNT(*) FROM "tenantUsers"
UNION ALL SELECT 'projects',    COUNT(*) FROM "projects"
UNION ALL SELECT 'workOrders',  COUNT(*) FROM "workOrders"
UNION ALL SELECT 'invoices',    COUNT(*) FROM "invoices"
UNION ALL SELECT 'auditEvents', COUNT(*) FROM "auditEvents";
