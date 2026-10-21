#!/usr/bin/env bash
# ============================================================================
# ARCHIVO: docker/initCluster/InitSaasCluster.sh
# BASE DE DATOS: saasCloudDb
# CASO 8: CLOUD NATIVE - INICIALIZACIÓN DEL CLÚSTER CITUS (equivale a un Job de Kubernetes)
# ----------------------------------------------------------------------------
# Lo ejecuta el servicio `clusterInitializer` de docker-compose.yml cuando los 4 nodos
# (coordinador + 3 workers) ya están arriba. Pasos:
#   1. Espera a que cada nodo acepte conexiones y tenga la extensión citus.
#   2. Registra el coordinador y los workers (el Silo queda cerrado a shards "Pool").
#   3. Ejecuta los scripts de sql/ en el orden correcto y carga los CSV de data/.
# Es idempotente: si el clúster ya fue inicializado, no hace nada.
# ============================================================================
set -euo pipefail

coordinatorHost="${COORDINATOR_HOST:-citusCoordinator}"
workerHosts="${WORKER_HOSTS:-nodeAz1Pool nodeAz2Pool nodeAz3Silo}"
siloHost="${SILO_HOST:-nodeAz3Silo}"
dbName="${POSTGRES_DB:-saasCloudDb}"
dbUser="${POSTGRES_USER:-postgres}"
sqlDir="${SAAS_SQL_DIR:-/saasSql}"
export PGPASSWORD="${POSTGRES_PASSWORD:?Falta POSTGRES_PASSWORD}"
appPassword="${SAAS_APP_PASSWORD:?Falta SAAS_APP_PASSWORD}"

logStep() { echo "[$(date '+%H:%M:%S')] $*"; }

psqlOn() {
    local host="$1"; shift
    psql -h "$host" -p 5432 -U "$dbUser" -d "$dbName" -v ON_ERROR_STOP=1 --no-psqlrc -q "$@"
}

waitForNode() {
    local host="$1"
    for attempt in $(seq 1 90); do
        if psqlOn "$host" -tAc "SELECT 1 FROM pg_extension WHERE extname = 'citus'" 2>/dev/null | grep -q 1; then
            logStep "Nodo $host listo."
            return 0
        fi
        sleep 2
    done
    logStep "ERROR: el nodo $host no respondió a tiempo."
    exit 1
}

runSqlFile() {
    logStep "Ejecutando $1 ..."
    psqlOn "$coordinatorHost" -f "$sqlDir/$1"
}

runSqlFileQuiet() {
    logStep "Ejecutando $1 ..."
    psqlOn "$coordinatorHost" -f "$sqlDir/$1" > /dev/null
}

logStep "=== Inicializando clúster Citus '$dbName' ==="
for nodeHost in $coordinatorHost $workerHosts; do
    waitForNode "$nodeHost"
done

alreadyDone=$(psqlOn "$coordinatorHost" -tAc \
    "SELECT COUNT(*) FROM pg_dist_partition WHERE logicalrelid::TEXT = '\"workOrders\"'")
if [ "$alreadyDone" = "1" ]; then
    logStep "El clúster ya estaba inicializado. No se hace nada."
    exit 0
fi

logStep "Registrando coordinador y workers ..."
psqlOn "$coordinatorHost" -v pgPassword="$PGPASSWORD" -v dbUser="$dbUser" <<'SQL'
-- Credenciales que usa Citus para conectarse entre nodos (nodeid 0 = todos los nodos)
INSERT INTO pg_dist_authinfo (nodeid, rolename, authinfo)
VALUES (0, :'dbUser', 'password=' || :'pgPassword')
ON CONFLICT DO NOTHING;
SELECT citus_set_coordinator_host('citusCoordinator', 5432);
SQL

for workerHost in $workerHosts; do
    psqlOn "$coordinatorHost" -c "SELECT citus_add_node('$workerHost', 5432);" > /dev/null
    logStep "Worker $workerHost registrado."
done

# El nodo Silo queda reservado para clientes ENTERPRISE aislados.
psqlOn "$coordinatorHost" -c \
    "SELECT citus_set_node_property('$siloHost', 5432, 'shouldhaveshards', false);" > /dev/null
logStep "Nodo $siloHost reservado como Silo (shouldhaveshards = false)."

runSqlFile DataModel.sql
runSqlFileQuiet ShardingAndDistribution.sql
runSqlFile TenantSecurityRls.sql

logStep "Habilitando login del rol de aplicación saasAppRuntime ..."
psqlOn "$coordinatorHost" -v appPassword="$appPassword" <<'SQL'
-- Citus abre las conexiones a los workers con el rol actual: saasAppRuntime necesita LOGIN.
ALTER ROLE "saasAppRuntime" WITH LOGIN PASSWORD :'appPassword';
INSERT INTO pg_dist_authinfo (nodeid, rolename, authinfo)
VALUES (0, 'saasAppRuntime', 'password=' || :'appPassword')
ON CONFLICT DO NOTHING;
SQL

runSqlFile LoadSyntheticData.sql
runSqlFileQuiet BusinessQueries.sql
runSqlFile SchemaMigration.sql

logStep "Distribución final de shards por nodo:"
psqlOn "$coordinatorHost" -c "
    SELECT n.nodename AS \"nodeName\", COUNT(*) AS \"shardPlacements\"
    FROM pg_dist_placement p JOIN pg_dist_node n USING (groupid)
    GROUP BY 1 ORDER BY 1;"

logStep "=== Clúster saasCloudDb listo. Conéctate por PgBouncer en localhost:6432 ==="
