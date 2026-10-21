"""
===============================================================================
ARCHIVO: scripts/BusinessOperations.py
BASE DE DATOS: saasCloudDb
CASO 8: CLOUD NATIVE - DEMOSTRACIÓN DE OPERACIONES Y CONSULTAS (CAMELCASE)
===============================================================================
"""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import List

from ClusterEngine import ClusterEngine
from SyntheticData import clusterRuntimeDir

baseDir = Path(__file__).resolve().parent.parent
evidencesDir = baseDir / "evidences"


def runBusinessOperationsDemo() -> None:
    evidencesDir.mkdir(parents=True, exist_ok=True)
    cluster = ClusterEngine(clusterDir=clusterRuntimeDir, numShards=16)

    outputLines: List[str] = []

    def logOut(text: str = "") -> None:
        print(text)
        outputLines.append(text)

    logOut("==============================================================================")
    logOut("DEMOSTRACION DE OPERACIONES Y CONSULTAS REPRESENTATIVAS - saasCloudDb")
    logOut("==============================================================================")

    clusterSummary = cluster.getClusterSummary()
    logOut("\n[1] ESTADO DE DISTRIBUCION POR NODO Y ZONA DE DISPONIBILIDAD (MULTI-AZ):")
    logOut(json.dumps(clusterSummary, indent=2))

    demoTenantId = str(uuid.uuid5(uuid.NAMESPACE_DNS, "demoSustentacionUniminuto2026"))
    startTime = time.perf_counter()
    provisionedInfo = cluster.provisionTenant(
        tenantId=demoTenantId,
        orgSlug="org-sustentacion-uniminuto",
        orgName="Corporacion Salud & Logistica UNIMINUTO S.A.S.",
        planCode="PRO",
        regionPreference="us-east-1",
    )
    onboardingMs = round((time.perf_counter() - startTime) * 1000.0, 2)
    logOut(f"\n[2] ONBOARDING AUTOMATIZADO ZERO-DOWNTIME ({onboardingMs} ms):")
    logOut(json.dumps(provisionedInfo, indent=2))

    demoProjectId = str(uuid.uuid5(uuid.NAMESPACE_DNS, "projSustentacion01"))
    cluster.createProject(
        sessionTenantId=demoTenantId,
        tenantId=demoTenantId,
        projectId=demoProjectId,
        projectCode="PRJ-SUST-2026",
        name="Modernizacion Cloud Native Regional",
        budgetAllocated=25000.00,
        customAttributes={"costCenter": "CC-BOG-01", "compliance": "ISO-27001"},
    )

    demoOrderId = str(uuid.uuid5(uuid.NAMESPACE_DNS, "ordSustentacion01"))
    orderResult = cluster.createWorkOrder(
        sessionTenantId=demoTenantId,
        tenantId=demoTenantId,
        orderId=demoOrderId,
        projectId=demoProjectId,
        idempotencyKey="idem-sustentacion-2026-001",
        title="Despliegue de Nodos Citus en 3 Zonas de Disponibilidad",
        priority="CRITICAL",
        amountUsd=3500.00,
        customAttributes={"costCenter": "CC-BOG-01", "slaHours": 4},
        enforceRateLimit=False,
    )
    logOut("\n[3] CREACION TRANSACCIONAL E IDEMPOTENTE DE ORDEN DE TRABAJO:")
    logOut(json.dumps(orderResult, indent=2))

    queryStart = time.perf_counter()
    dashboardRows = cluster.queryTenantDashboard(
        sessionTenantId=demoTenantId,
        queryTenantId=demoTenantId,
        enforceRateLimit=False,
    )
    queryMs = round((time.perf_counter() - queryStart) * 1000.0, 2)
    logOut(f"\n[4] CONSULTA REPRESENTATIVA DE DASHBOARD CO-LOCALIZADO ({queryMs} ms):")
    logOut(json.dumps(dashboardRows, indent=2))

    (evidencesDir / "OperationsOutput.txt").write_text(
        "\n".join(outputLines) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    runBusinessOperationsDemo()
