-- ============================================================================
-- ARCHIVO: sql/SchemaMigration.sql
-- BASE DE DATOS: saasCloudDb
-- CASO 8: CLOUD NATIVE - MIGRACIÓN DE ESQUEMA ZERO-DOWNTIME (EXPAND & CONTRACT)
-- ============================================================================

SET lock_timeout = '2s';
SET statement_timeout = '30s';

-- FASE 1: EXPAND (Agregar columna nullable sin bloquear lecturas ni escrituras)
ALTER TABLE "workOrders"
    ADD COLUMN IF NOT EXISTS "slaDeadlineAt" TIMESTAMPTZ NULL;

ALTER TABLE "workOrders"
    DROP CONSTRAINT IF EXISTS "chkSlaDeadlineAfterCreation";

ALTER TABLE "workOrders"
    ADD CONSTRAINT "chkSlaDeadlineAfterCreation"
    CHECK ("slaDeadlineAt" IS NULL OR "slaDeadlineAt" >= "createdAt") NOT VALID;

-- FASE 2: BACKFILL POR LOTES CONTROLADOS (UN LOTE = UNA ORGANIZACIÓN)
-- NOTA CITUS: `SELECT ... FOR UPDATE SKIP LOCKED` sobre varios shards no está soportado.
-- En su lugar se recorre organización por organización: cada UPDATE filtra por "tenantId",
-- toca un solo shard (router query), bloquea pocas filas y se confirma (COMMIT) de inmediato,
-- así el resto de clientes sigue operando durante la migración.
DO $$
DECLARE
    "currentTenant" UUID;
BEGIN
    FOR "currentTenant" IN SELECT "tenantId" FROM "tenants" ORDER BY "tenantId" LOOP
        UPDATE "workOrders"
        -- Se calcula en UTC: `timestamptz + interval` es STABLE y Citus no lo permite en UPDATE distribuidos.
        SET "slaDeadlineAt" = (("createdAt" AT TIME ZONE 'UTC') + INTERVAL '24 hours') AT TIME ZONE 'UTC'
        WHERE "tenantId" = "currentTenant"
          AND "slaDeadlineAt" IS NULL;
        COMMIT;
    END LOOP;
END
$$;

-- FASE 3: VALIDATE & CONTRACT
ALTER TABLE "workOrders"
    VALIDATE CONSTRAINT "chkSlaDeadlineAfterCreation";

UPDATE "tenants"
SET "schemaVersion" = 2,
    "updatedAt" = NOW()
WHERE "schemaVersion" < 2;
