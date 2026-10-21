-- ============================================================================
-- ARCHIVO: sql/ShardingAndDistribution.sql
-- BASE DE DATOS: saasCloudDb
-- CASO 8: CLOUD NATIVE - PARTICIONAMIENTO, CO-LOCALIZACIÓN Y AISLAMIENTO SILO
-- ============================================================================

SET citus.shard_count = 32;

-- Evita que Citus convierta automáticamente en "tablas locales" a las tablas que tienen
-- FK hacia saasPlans (tenants -> saasPlans). Sin esto, al crear la tabla de referencia
-- toda la cadena tenants/tenantUsers/projects/... queda local y ya no se puede distribuir.
SET citus.enable_local_reference_table_foreign_keys TO off;

-- 1. Replicar el catálogo global `saasPlans` en todos los nodos workers
SELECT create_reference_table('"saasPlans"');

-- 2. Distribuir la tabla raíz `tenants` por la clave de partición `tenantId`
SELECT create_distributed_table('"tenants"', 'tenantId');

-- 3. Distribuir las tablas hijas forzando co-localización física con `tenants`
SELECT create_distributed_table('"tenantUsers"', 'tenantId', colocate_with => '"tenants"');
SELECT create_distributed_table('"projects"',    'tenantId', colocate_with => '"tenants"');
SELECT create_distributed_table('"workOrders"',  'tenantId', colocate_with => '"tenants"');
SELECT create_distributed_table('"invoices"',    'tenantId', colocate_with => '"tenants"');
SELECT create_distributed_table('"auditEvents"', 'tenantId', colocate_with => '"tenants"');

-- 4. Función para aislar en caliente un Tenant Ballena (Enterprise) en su propio Shard y Nodo Silo
CREATE OR REPLACE FUNCTION "isolateEnterpriseTenantOnline"(
    "targetTenantId" UUID,
    "targetNodeName" TEXT,
    "targetNodePort" INT
) RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    "newShardId" BIGINT;
    "sourceNodeName" TEXT;
    "sourceNodePort" INT;
    "siloWasClosed" BOOLEAN := FALSE;
BEGIN
    SELECT isolate_tenant_to_new_shard('"tenants"', "targetTenantId", 'CASCADE')
    INTO "newShardId";

    SELECT nodename, nodeport
    INTO "sourceNodeName", "sourceNodePort"
    FROM pg_dist_placement p
    JOIN pg_dist_node n ON p.groupid = n.groupid
    WHERE p.shardid = "newShardId"
    LIMIT 1;

    IF "sourceNodeName" IS NOT NULL AND ("sourceNodeName" <> "targetNodeName" OR "sourceNodePort" <> "targetNodePort") THEN
        -- El nodo Silo está marcado con shouldhaveshards = false para que la distribución
        -- normal no ubique clientes Pool en él. Se habilita solo durante este movimiento.
        SELECT NOT shouldhaveshards INTO "siloWasClosed"
        FROM pg_dist_node
        WHERE nodename = "targetNodeName" AND nodeport = "targetNodePort";

        IF "siloWasClosed" THEN
            PERFORM citus_set_node_property("targetNodeName", "targetNodePort", 'shouldhaveshards', true);
        END IF;

        PERFORM citus_move_shard_placement(
            "newShardId",
            "sourceNodeName", "sourceNodePort",
            "targetNodeName", "targetNodePort",
            -- 'block_writes': Citus no permite dos transferencias por replicación lógica
            -- (split + move) en la misma transacción. Solo se pausan las escrituras del
            -- tenant que se está aislando durante la copia; el resto de clientes sigue operando.
            'block_writes'
        );

        IF "siloWasClosed" THEN
            PERFORM citus_set_node_property("targetNodeName", "targetNodePort", 'shouldhaveshards', false);
        END IF;
    END IF;

    UPDATE "tenants"
    SET "isolationMode" = 'SILO',
        "dedicatedShardId" = "newShardId",
        "version" = "version" + 1,
        "updatedAt" = NOW()
    WHERE "tenantId" = "targetTenantId";

    RETURN "newShardId";
END;
$$;
