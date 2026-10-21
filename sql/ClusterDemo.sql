-- ============================================================================
-- ARCHIVO: sql/ClusterDemo.sql
-- BASE DE DATOS: saasCloudDb
-- CASO 8: CLOUD NATIVE - DEMOSTRACIÓN EN VIVO SOBRE EL CLÚSTER CITUS REAL (DOCKER)
-- ----------------------------------------------------------------------------
-- Ejecutar (desde la carpeta DATA-ARCHITECTURE/docker):
--   docker compose exec citusCoordinator psql -U postgres -d saasCloudDb -f /saasSql/ClusterDemo.sql
-- Se puede ejecutar varias veces.
-- ============================================================================
\pset footer off
\echo
\echo '=== 1. TOPOLOGÍA: coordinador + 3 workers en 3 zonas de disponibilidad ==='
SELECT nodeid AS "nodeId", nodename AS "nodeName", nodeport AS "nodePort",
       CASE WHEN groupid = 0 THEN 'coordinator' ELSE 'worker' END AS "nodeRole",
       shouldhaveshards AS "acceptsPoolShards", isactive AS "isActive"
FROM pg_dist_node ORDER BY nodeid;

\echo
\echo '=== 2. TABLAS DISTRIBUIDAS Y CO-LOCALIZACIÓN (mismo colocationId = mismos shards) ==='
SELECT table_name AS "tableName", citus_table_type AS "tableType",
       distribution_column AS "distributionColumn", colocation_id AS "colocationId",
       shard_count AS "shardCount"
FROM citus_tables ORDER BY colocation_id, table_name::TEXT;

\echo
\echo '=== 3. DISTRIBUCIÓN DE SHARDS Y FILAS DE workOrders POR NODO ==='
SELECT nodename AS "nodeName", COUNT(*) AS "workOrderShards",
       pg_size_pretty(SUM(shard_size)) AS "dataSize"
FROM citus_shards WHERE table_name = '"workOrders"'::regclass
GROUP BY 1 ORDER BY 1;

\echo
\echo '=== 4. CONSULTA CO-LOCALIZADA DE UN TENANT = UN SOLO SHARD (Router Query) ==='
EXPLAIN (COSTS OFF)
SELECT wo."orderId", p."projectCode"
FROM "workOrders" wo
JOIN "projects" p ON p."tenantId" = wo."tenantId" AND p."projectId" = wo."projectId"
WHERE wo."tenantId" = '018f1a00-0000-7000-8000-000000000001';

\echo
\echo '=== 5. AISLAMIENTO ROW-LEVEL SECURITY (rol saasAppRuntime) ==='
SELECT "tenantId" AS "otherTenantId" FROM "tenants"
WHERE "tenantId" <> '018f1a00-0000-7000-8000-000000000001' AND "planCode" = 'PRO'
ORDER BY "orgSlug" LIMIT 1 \gset

BEGIN;
SET LOCAL ROLE "saasAppRuntime";
SET LOCAL app.currentTenantId = '018f1a00-0000-7000-8000-000000000001';
SELECT 'Tenant demo ve sus propios proyectos' AS "testCase", COUNT(*) AS "visibleRows" FROM "projects"
UNION ALL
SELECT 'Tenant demo intenta leer otro tenant', COUNT(*) FROM "projects" WHERE "tenantId" = :'otherTenantId';
COMMIT;

BEGIN;
SET LOCAL ROLE "saasAppRuntime";
SELECT 'Sesión SIN tenant (fail-closed)' AS "testCase", COUNT(*) AS "visibleRows" FROM "workOrders";
COMMIT;

\echo
\echo '=== 6. AISLAMIENTO EN CALIENTE DE UN TENANT ENTERPRISE AL NODO SILO ==='
\timing on
DO $$
DECLARE
    "whaleTenantId" UUID;
    "whaleSlug" TEXT;
    "newShardId" BIGINT;
BEGIN
    SELECT "tenantId", "orgSlug" INTO "whaleTenantId", "whaleSlug"
    FROM "tenants"
    WHERE "planCode" = 'ENTERPRISE' AND "dedicatedShardId" IS NULL
    ORDER BY "orgSlug" LIMIT 1;

    IF "whaleTenantId" IS NULL THEN
        RAISE NOTICE 'Todos los tenants ENTERPRISE ya están aislados.';
    ELSE
        "newShardId" := "isolateEnterpriseTenantOnline"("whaleTenantId", 'nodeAz3Silo', 5432);
        RAISE NOTICE 'Tenant % aislado en el shard dedicado % (nodeAz3Silo)', "whaleSlug", "newShardId";
    END IF;
END
$$;
\timing off

SELECT t."orgSlug", t."isolationMode", t."dedicatedShardId", s.nodename AS "currentNode",
       (SELECT COUNT(*) FROM "workOrders" w WHERE w."tenantId" = t."tenantId") AS "workOrders"
FROM "tenants" t
JOIN citus_shards s ON s.shardid = t."dedicatedShardId"
WHERE t."isolationMode" = 'SILO'
ORDER BY t."orgSlug";

\echo
\echo '=== 7. TOTALES DEL CLÚSTER ==='
SELECT (SELECT COUNT(*) FROM "tenants")    AS "tenants",
       (SELECT COUNT(*) FROM "projects")   AS "projects",
       (SELECT COUNT(*) FROM "workOrders") AS "workOrders",
       (SELECT COUNT(*) FROM "invoices")   AS "invoices",
       (SELECT MAX("schemaVersion") FROM "tenants") AS "schemaVersion";
