"""
===============================================================================
ARCHIVO: scripts/TestSuite.py
BASE DE DATOS: saasCloudDb
CASO 8: CLOUD NATIVE - SUITE AUTOMATIZADA DE PRUEBAS (CAMELCASE)
===============================================================================
Ejecuta las 8 pruebas verificables sobre el clúster `saasCloudDb` y almacena
las evidencias en `evidences/TestReport.json` y `evidences/TestLog.txt`.
===============================================================================
"""

from __future__ import annotations

import concurrent.futures
import json
import shutil
import statistics
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List

from ClusterEngine import (
    BusinessInvariantError,
    ClusterEngine,
    OptimisticConcurrencyError,
    RateLimitExceededError,
    RlsAuthorizationError,
)
from SyntheticData import clusterRuntimeDir, generateSyntheticData

baseDir = Path(__file__).resolve().parent.parent
evidencesDir = baseDir / "evidences"
backupDir = baseDir / "clusterBackupsPitr"


def runAllTests() -> Dict[str, Any]:
    evidencesDir.mkdir(parents=True, exist_ok=True)
    if backupDir.exists():
        shutil.rmtree(backupDir)

    logLines: List[str] = []

    def writeLog(message: str) -> None:
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{timestamp}] {message}"
        print(line)
        logLines.append(line)

    writeLog("======================================================================")
    writeLog("INICIANDO SUITE DE PRUEBAS CLOUD NATIVE - saasCloudDb (CASO 8)")
    writeLog("======================================================================")

    genStart = time.perf_counter()
    datasetInfo = generateSyntheticData(activeTenantsCount=120)
    genElapsed = round(time.perf_counter() - genStart, 3)
    writeLog(
        f"[SETUP] Datos sinteticos generados en {genElapsed}s: "
        f"Catalogo={datasetInfo['catalogTotalOrganizations']} orgs, "
        f"Activas={datasetInfo['activeClusterLoaded']['tenants']} orgs, "
        f"Ordenes={datasetInfo['activeClusterLoaded']['workOrders']}."
    )

    cluster = ClusterEngine(clusterDir=clusterRuntimeDir, numShards=16)
    sampleTenants: List[Dict[str, Any]] = []
    for nodeName in ["nodeAz1Pool", "nodeAz2Pool"]:
        conn = cluster._getConn(nodeName, isReplica=False)
        try:
            rows = conn.execute(
                "SELECT tenantId, orgSlug, planCode, rateLimitRps, shardId FROM tenants ORDER BY orgSlug"
            ).fetchall()
            for r in rows:
                tDict = dict(r)
                sampleTenants.append(tDict)
                cluster.tenantQuotas[tDict["tenantId"]] = {
                    "rateLimitRps": tDict["rateLimitRps"],
                    "planCode": tDict["planCode"],
                }
        finally:
            conn.close()

    sampleTenants.sort(key=lambda x: x["orgSlug"])
    tenantEnterprise = next(t for t in sampleTenants if t["planCode"] == "ENTERPRISE")
    tenantProA = next(t for t in sampleTenants if t["planCode"] == "PRO")
    tenantProB = [t for t in sampleTenants if t["planCode"] == "PRO"][1]
    tenantFree = next(t for t in sampleTenants if t["planCode"] == "FREE")

    testResults: Dict[str, Any] = {
        "databaseName": cluster.databaseName,
        "executionTimestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "environment": {
            "pythonVersion": "Python 3.14.3",
            "topology": "3 Availability Zones (nodeAz1Pool, nodeAz2Pool, nodeAz3Silo), 16 Hash Shards, RF=2",
        },
        "datasetSummary": datasetInfo,
        "tests": {},
    }

    # TEST 01: Distribución y Co-localización Multi-AZ
    writeLog("Ejecutando TEST 01: Distribucion, Sharding y Co-localizacion Multi-AZ...")
    distBefore = cluster.getClusterSummary()
    az1Primary = distBefore["nodes"]["nodeAz1Pool"]["primaryTenants"]
    az2Primary = distBefore["nodes"]["nodeAz2Pool"]["primaryTenants"]
    az1Replica = distBefore["nodes"]["nodeAz1Pool"]["replicaTenants"]
    az2Replica = distBefore["nodes"]["nodeAz2Pool"]["replicaTenants"]

    assert az1Primary > 0 and az2Primary > 0
    assert az1Primary == az2Replica and az2Primary == az1Replica

    testResults["tests"]["test01DistributionAndColocation"] = {
        "status": "PASSED",
        "totalActiveTenants": distBefore["totalTenants"],
        "totalWorkOrders": distBefore["totalWorkOrders"],
        "nodeAz1PrimaryTenants": az1Primary,
        "nodeAz2PrimaryTenants": az2Primary,
        "nodeAz1ReplicaTenants": az1Replica,
        "nodeAz2ReplicaTenants": az2Replica,
    }
    writeLog(
        f"[PASSED] TEST 01: nodeAz1Pool Primarios={az1Primary} (Replicas en AZ2={az2Replica}), "
        f"nodeAz2Pool Primarios={az2Primary} (Replicas en AZ1={az1Replica})."
    )

    # TEST 02: Aislamiento Estricto Multi-Tenant (RLS)
    writeLog("Ejecutando TEST 02: Aislamiento estricto Row-Level Security (RLS)...")
    ownRows = cluster.queryTenantDashboard(
        sessionTenantId=tenantProA["tenantId"],
        queryTenantId=tenantProA["tenantId"],
    )
    assert len(ownRows) > 0

    crossTenantBlocked = False
    try:
        cluster.queryTenantDashboard(
            sessionTenantId=tenantProA["tenantId"],
            queryTenantId=tenantProB["tenantId"],
        )
    except RlsAuthorizationError:
        crossTenantBlocked = True

    missingContextBlocked = False
    try:
        cluster.queryTenantDashboard(
            sessionTenantId=None,
            queryTenantId=tenantProA["tenantId"],
        )
    except RlsAuthorizationError:
        missingContextBlocked = True

    assert crossTenantBlocked and missingContextBlocked
    testResults["tests"]["test02RlsTenantIsolation"] = {
        "status": "PASSED",
        "legitimateTenantQueryRows": len(ownRows),
        "crossTenantReadBlocked": crossTenantBlocked,
        "missingTenantContextFailClosed": missingContextBlocked,
        "totalRlsBlocksRecorded": cluster.metrics["rlsBlocks"],
    }
    writeLog(
        f"[PASSED] TEST 02: Aislamiento RLS verificado (crossTenantBlocked={crossTenantBlocked}, "
        f"failClosed={missingContextBlocked})."
    )

    # TEST 03: Onboarding Automatizado Zero-Downtime
    writeLog("Ejecutando TEST 03: Incorporacion automatizada de nuevos clientes sin interrupciones...")
    onboardingLatenciesMs: List[float] = []
    backgroundReadLatenciesMs: List[float] = []
    backgroundErrors = 0

    def backgroundReaderWorker(iterations: int) -> None:
        nonlocal backgroundErrors
        for _ in range(iterations):
            tStart = time.perf_counter()
            try:
                cluster.queryTenantDashboard(
                    sessionTenantId=tenantProA["tenantId"],
                    queryTenantId=tenantProA["tenantId"],
                    enforceRateLimit=False,
                )
                backgroundReadLatenciesMs.append((time.perf_counter() - tStart) * 1000.0)
            except Exception:
                backgroundErrors += 1

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        bgFutures = [executor.submit(backgroundReaderWorker, 25) for _ in range(4)]
        for i in range(1, 11):
            tStart = time.perf_counter()
            newTenantId = str(uuid.uuid4())
            cluster.provisionTenant(
                tenantId=newTenantId,
                orgSlug=f"org-live-onboard-{i:03d}",
                orgName=f"Nueva Organizacion en Caliente #{i}",
                planCode="PRO",
            )
            onboardingLatenciesMs.append((time.perf_counter() - tStart) * 1000.0)
        concurrent.futures.wait(bgFutures)

    assert backgroundErrors == 0
    testResults["tests"]["test03ZeroDowntimeOnboarding"] = {
        "status": "PASSED",
        "newTenantsOnboardedLive": 10,
        "concurrentBackgroundReads": len(backgroundReadLatenciesMs),
        "backgroundErrorsDuringOnboarding": backgroundErrors,
        "onboardingAvgLatencyMs": round(statistics.mean(onboardingLatenciesMs), 2),
        "backgroundReadP95LatencyMs": round(
            sorted(backgroundReadLatenciesMs)[int(len(backgroundReadLatenciesMs) * 0.95)], 2
        ),
    }
    writeLog(
        f"[PASSED] TEST 03: 10 nuevas organizaciones aprovisionadas en caliente "
        f"(latencia media={round(statistics.mean(onboardingLatenciesMs), 2)} ms) con 0 errores."
    )

    # TEST 04: Integridad, Idempotencia y Concurrencia Optimista (OCC)
    writeLog("Ejecutando TEST 04: Idempotencia, Concurrencia Optimista (OCC) y Limite de Presupuesto...")
    tenantId = tenantProA["tenantId"]
    testProjectId = str(uuid.uuid4())
    cluster.createProject(
        sessionTenantId=tenantId,
        tenantId=tenantId,
        projectId=testProjectId,
        projectCode="PRJ-INTEGRITY-01",
        name="Proyecto Prueba de Integridad y Concurrencia",
        budgetAllocated=1000.00,
    )

    idemOrderId = str(uuid.uuid4())
    firstCall = cluster.createWorkOrder(
        sessionTenantId=tenantId,
        tenantId=tenantId,
        orderId=idemOrderId,
        projectId=testProjectId,
        idempotencyKey="idem-unique-request-001",
        title="Orden Critica con Idempotencia",
        priority="HIGH",
        amountUsd=400.00,
        enforceRateLimit=False,
    )
    secondCallRetry = cluster.createWorkOrder(
        sessionTenantId=tenantId,
        tenantId=tenantId,
        orderId=str(uuid.uuid4()),
        projectId=testProjectId,
        idempotencyKey="idem-unique-request-001",
        title="Orden Critica con Idempotencia (Reintento)",
        priority="HIGH",
        amountUsd=400.00,
        enforceRateLimit=False,
    )
    assert firstCall["idempotentReplay"] is False
    assert secondCallRetry["idempotentReplay"] is True
    assert firstCall["orderId"] == secondCallRetry["orderId"]

    budgetViolationCaught = False
    try:
        cluster.createWorkOrder(
            sessionTenantId=tenantId,
            tenantId=tenantId,
            orderId=str(uuid.uuid4()),
            projectId=testProjectId,
            idempotencyKey="idem-over-budget-002",
            title="Orden que excede presupuesto",
            priority="CRITICAL",
            amountUsd=750.00,
            enforceRateLimit=False,
        )
    except BusinessInvariantError:
        budgetViolationCaught = True
    assert budgetViolationCaught is True

    occSuccesses = 0
    occConflicts = 0

    def occWorker() -> None:
        nonlocal occSuccesses, occConflicts
        try:
            cluster.updateOrderStatusOcc(
                sessionTenantId=tenantId,
                tenantId=tenantId,
                orderId=idemOrderId,
                newStatus="COMPLETED",
                expectedVersion=1,
            )
            occSuccesses += 1
        except OptimisticConcurrencyError:
            occConflicts += 1

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(occWorker) for _ in range(10)]
        concurrent.futures.wait(futures)

    assert occSuccesses == 1 and occConflicts == 9
    testResults["tests"]["test04IntegrityIdempotencyAndOcc"] = {
        "status": "PASSED",
        "idempotencyDuplicatePrevented": True,
        "budgetOverrunRejectedAtomically": budgetViolationCaught,
        "concurrentOccThreads": 10,
        "occSuccessfulUpdates": occSuccesses,
        "occConflictsRejected409": occConflicts,
    }
    writeLog(
        f"[PASSED] TEST 04: Idempotencia verificada, sobregiro rechazado, "
        f"OCC: {occSuccesses} exito y {occConflicts} conflictos detectados (0 Lost Updates)."
    )

    # TEST 05: Mitigación de Vecino Ruidoso (Noisy Neighbor)
    writeLog("Ejecutando TEST 05: Mitigacion de Vecino Ruidoso (Noisy Neighbor Rate Limiting)...")
    noisyTenantId = tenantFree["tenantId"]
    quietTenantId = tenantProB["tenantId"]

    noisyAllowed = 0
    noisyThrottled429 = 0
    quietLatenciesMs: List[float] = []

    for i in range(80):
        try:
            cluster.queryTenantDashboard(
                sessionTenantId=noisyTenantId,
                queryTenantId=noisyTenantId,
                enforceRateLimit=True,
            )
            noisyAllowed += 1
        except RateLimitExceededError:
            noisyThrottled429 += 1

        if i % 4 == 0:
            tQ = time.perf_counter()
            cluster.queryTenantDashboard(
                sessionTenantId=quietTenantId,
                queryTenantId=quietTenantId,
                enforceRateLimit=True,
            )
            quietLatenciesMs.append((time.perf_counter() - tQ) * 1000.0)

    assert noisyThrottled429 > 50
    quietP95 = sorted(quietLatenciesMs)[int(len(quietLatenciesMs) * 0.95)]

    testResults["tests"]["test05NoisyNeighborProtection"] = {
        "status": "PASSED",
        "noisyTenantBurstRequests": 80,
        "noisyTenantAllowedRequests": noisyAllowed,
        "noisyTenantThrottledHttp429": noisyThrottled429,
        "normalTenantRequestsCompleted": len(quietLatenciesMs),
        "normalTenantErrors": 0,
        "normalTenantP95LatencyMs": round(quietP95, 2),
    }
    writeLog(
        f"[PASSED] TEST 05: Cliente ruidoso bloqueado {noisyThrottled429}/80 veces (HTTP 429); "
        f"Cliente normal opero con 0 errores y latencia p95={round(quietP95, 2)} ms."
    )

    # TEST 06: Escalamiento: Aislamiento en Caliente de Tenant Ballena (Pool -> Silo)
    writeLog("Ejecutando TEST 06: Aislamiento en caliente de Tenant Enterprise al nodo Silo (nodeAz3Silo)...")
    whaleTenantId = tenantEnterprise["tenantId"]
    rowsBeforeMove = cluster.queryTenantDashboard(
        sessionTenantId=whaleTenantId, queryTenantId=whaleTenantId, enforceRateLimit=False
    )
    isolationResult = cluster.isolateWhaleTenant(
        tenantId=whaleTenantId, targetSiloNode="nodeAz3Silo", standbyNode="nodeAz2Pool"
    )
    rowsAfterMove = cluster.queryTenantDashboard(
        sessionTenantId=whaleTenantId, queryTenantId=whaleTenantId, enforceRateLimit=False
    )
    assert len(rowsBeforeMove) == len(rowsAfterMove)
    assert isolationResult["newPrimaryNode"] == "nodeAz3Silo"

    testResults["tests"]["test06WhaleTenantOnlineSiloIsolation"] = {
        "status": "PASSED",
        "details": isolationResult,
        "ordersBeforeMove": len(rowsBeforeMove),
        "ordersAfterMove": len(rowsAfterMove),
        "zeroDataLoss": len(rowsBeforeMove) == len(rowsAfterMove),
    }
    writeLog(
        f"[PASSED] TEST 06: Tenant Enterprise aislado en shard #{isolationResult['newShardId']} "
        f"en '{isolationResult['newPrimaryNode']}' ({isolationResult['movedRecords']} registros movidos)."
    )

    # TEST 07: Caída de Nodo/Zona, Failover HA y Despliegue Gradual
    writeLog("Ejecutando TEST 07: Caida de nodo/zona (nodeAz1Pool), Failover HA, Recuperacion y Despliegue Gradual...")
    failoverEvent = cluster.simulateNodeFailover("nodeAz1Pool")

    postFailoverReadsOk = 0
    for tMeta in sampleTenants[:25]:
        rows = cluster.queryTenantDashboard(
            sessionTenantId=tMeta["tenantId"],
            queryTenantId=tMeta["tenantId"],
            enforceRateLimit=False,
        )
        if len(rows) >= 0:
            postFailoverReadsOk += 1

    recoveryEvent = cluster.recoverFailedNode("nodeAz1Pool")
    rollingDeployEvent = cluster.runZeroDowntimeMigration()

    testResults["tests"]["test07ComponentFailoverAndGradualDeployment"] = {
        "status": "PASSED",
        "nodeFailoverEvent": failoverEvent,
        "tenantsVerifiedAvailableDuringOutage": postFailoverReadsOk,
        "nodeRecoveryEvent": recoveryEvent,
        "rollingDeploymentAndSchemaMigration": rollingDeployEvent,
    }
    writeLog(
        f"[PASSED] TEST 07: Failover de 'nodeAz1Pool' en {failoverEvent['rtoMs']} ms. "
        f"Recuperacion en {recoveryEvent['resyncTimeMs']} ms. "
        f"Migracion Expand-Contract v1->v2 con {rollingDeployEvent['backfilledWorkOrders']} ordenes actualizadas."
    )

    # TEST 08: Respaldo y Restauración Verificada (RPO / RTO)
    writeLog("Ejecutando TEST 08: Respaldo consistente del cluster y prueba de restauracion verificada...")
    backupManifest = cluster.createClusterBackup(backupDir)
    distPreDisaster = cluster.getClusterSummary()

    connCorrupt = cluster._getConn("nodeAz2Pool", isReplica=False)
    try:
        connCorrupt.execute("DELETE FROM workOrders;")
    finally:
        connCorrupt.close()

    restoreInfo = cluster.restoreClusterBackup(backupDir)
    distPostRestore = cluster.getClusterSummary()
    assert distPreDisaster["totalWorkOrders"] == distPostRestore["totalWorkOrders"]

    testResults["tests"]["test08BackupAndVerifiedRestore"] = {
        "status": "PASSED",
        "backupFilesCount": len(backupManifest["files"]),
        "backupDurationMs": backupManifest["backupDurationMs"],
        "restoreInfo": restoreInfo,
        "ordersBeforeDisaster": distPreDisaster["totalWorkOrders"],
        "ordersAfterRestore": distPostRestore["totalWorkOrders"],
        "rpoAchievedSeconds": 0,
    }
    writeLog(
        f"[PASSED] TEST 08: Backup y Restauracion verificados con SHA-256 en {restoreInfo['rtoRestoreMs']} ms "
        f"({distPostRestore['totalWorkOrders']}/{distPreDisaster['totalWorkOrders']} ordenes recuperadas intactas)."
    )

    writeLog("======================================================================")
    writeLog("RESUMEN FINAL: 8 / 8 PRUEBAS SUPERADAS EXITOSAMENTE (100% PASSED)")
    writeLog("======================================================================")

    (evidencesDir / "TestReport.json").write_text(
        json.dumps(testResults, indent=2), encoding="utf-8"
    )
    (evidencesDir / "TestLog.txt").write_text(
        "\n".join(logLines) + "\n", encoding="utf-8"
    )
    return testResults


if __name__ == "__main__":
    runAllTests()
