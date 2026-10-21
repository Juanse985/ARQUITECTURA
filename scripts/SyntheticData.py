"""
===============================================================================
ARCHIVO: scripts/SyntheticData.py
BASE DE DATOS: saasCloudDb
CASO 8: CLOUD NATIVE - GENERADOR Y CARGADOR DE DATOS SINTÉTICOS (CAMELCASE)
===============================================================================
Genera datos sintéticos deterministas (semilla fija 20261020) en nomenclatura
camelCase para las 5.000 organizaciones (`TenantsCatalog5000.csv`) y carga el
clúster distribuido `saasCloudDb` con los archivos `Tenants.csv`, `Users.csv`,
`Projects.csv`, `WorkOrders.csv`, `Invoices.csv` y `DatasetSummary.json`.
===============================================================================
"""

from __future__ import annotations

import csv
import json
import random
import shutil
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List

from ClusterEngine import ClusterEngine

randomSeed = 20261020
baseDir = Path(__file__).resolve().parent.parent
dataDir = baseDir / "data"
clusterRuntimeDir = baseDir / "clusterRuntimeData"


def createDeterministicUuid(namespaceTag: str, index: int) -> str:
    generatedUuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"saasCloudDb-{namespaceTag}-{index}")
    return str(generatedUuid)


def generateSyntheticData(activeTenantsCount: int = 120) -> Dict[str, Any]:
    rng = random.Random(randomSeed)
    dataDir.mkdir(parents=True, exist_ok=True)
    if clusterRuntimeDir.exists():
        shutil.rmtree(clusterRuntimeDir)

    startTime = time.perf_counter()
    cluster = ClusterEngine(clusterDir=clusterRuntimeDir, numShards=16)

    industries = [
        "Salud", "Logistica", "Manufactura", "Retail", "Educacion",
        "Finanzas", "Agroindustria", "Energia", "Construccion", "Telecomunicaciones"
    ]
    regions = ["us-east-1", "us-west-2", "eu-central-1", "sa-east-1"]
    priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    statuses = ["PENDING", "IN_PROGRESS", "COMPLETED"]

    # 1. Catálogo completo de las 5.000 organizaciones (75% FREE, 22% PRO, 3% ENTERPRISE)
    catalog5000: List[Dict[str, Any]] = []
    for idx in range(1, 5001):
        tenantId = createDeterministicUuid("tenant", idx)
        if idx <= 150:
            planCode = "ENTERPRISE"
            isolationMode = "SILO"
            rateLimitRps = 1500
            estimatedUsers = rng.randint(250, 2500)
            estimatedDailyOrders = rng.randint(1500, 12000)
        elif idx <= 1250:
            planCode = "PRO"
            isolationMode = "POOL"
            rateLimitRps = 150
            estimatedUsers = rng.randint(20, 100)
            estimatedDailyOrders = rng.randint(80, 600)
        else:
            planCode = "FREE"
            isolationMode = "POOL"
            rateLimitRps = 25
            estimatedUsers = rng.randint(2, 10)
            estimatedDailyOrders = rng.randint(2, 30)

        industry = industries[idx % len(industries)]
        regionPreference = regions[idx % len(regions)]
        orgSlug = f"org-{idx:04d}-{industry.lower()}"
        orgName = f"Organizacion {industry} #{idx:04d} S.A.S."
        assignedShardId = cluster.computeShardId(tenantId)

        catalog5000.append({
            "tenantId": tenantId,
            "orgSlug": orgSlug,
            "orgName": orgName,
            "industry": industry,
            "planCode": planCode,
            "isolationMode": isolationMode,
            "regionPreference": regionPreference,
            "rateLimitRps": rateLimitRps,
            "estimatedUsers": estimatedUsers,
            "estimatedDailyOrders": estimatedDailyOrders,
            "assignedShardId": assignedShardId,
        })

    with (dataDir / "TenantsCatalog5000.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(catalog5000[0].keys()))
        writer.writeheader()
        writer.writerows(catalog5000)

    # 2. Poblar el clúster distribuido con muestra representativa de los 3 planes
    selectedTenants = (
        catalog5000[:15]          # 15 ENTERPRISE
        + catalog5000[150:205]    # 55 PRO
        + catalog5000[1250:1300]  # 50 FREE
    )[:activeTenantsCount]

    activeTenantsRows: List[Dict[str, Any]] = []
    usersRows: List[Dict[str, Any]] = []
    projectsRows: List[Dict[str, Any]] = []
    workOrdersRows: List[Dict[str, Any]] = []
    invoicesRows: List[Dict[str, Any]] = []

    orderGlobalSeq = 1
    invoiceGlobalSeq = 1

    for tIdx, tenantMeta in enumerate(selectedTenants, start=1):
        tenantId = tenantMeta["tenantId"]
        planCode = tenantMeta["planCode"]
        provisionedInfo = cluster.provisionTenant(
            tenantId=tenantId,
            orgSlug=tenantMeta["orgSlug"],
            orgName=tenantMeta["orgName"],
            planCode=planCode,
            regionPreference=tenantMeta["regionPreference"],
            adminEmail=f"owner@{tenantMeta['orgSlug']}.com",
            adminName=f"Director {tenantMeta['orgSlug'].upper()}",
        )
        activeTenantsRows.append(provisionedInfo)

        if planCode == "ENTERPRISE":
            numProjects = 4
            ordersPerProject = 15
        elif planCode == "PRO":
            numProjects = 2
            ordersPerProject = 6
        else:
            numProjects = 1
            ordersPerProject = 3

        usersRows.append({
            "tenantId": tenantId,
            "email": f"owner@{tenantMeta['orgSlug']}.com",
            "role": "OWNER",
            "planCode": planCode,
        })

        for pIdx in range(1, numProjects + 1):
            projectId = createDeterministicUuid(f"proj-{tenantId}", pIdx)
            projectCode = f"PRJ-{tIdx:03d}-{pIdx:02d}"
            projectName = f"Proyecto Operativo {projectCode} ({tenantMeta['industry']})"
            budgetAllocated = 500000.0 if planCode == "ENTERPRISE" else (50000.0 if planCode == "PRO" else 5000.0)

            cluster.createProject(
                sessionTenantId=tenantId,
                tenantId=tenantId,
                projectId=projectId,
                projectCode=projectCode,
                name=projectName,
                budgetAllocated=budgetAllocated,
                customAttributes={"department": tenantMeta["industry"], "costCenter": f"CC-{pIdx:02d}"},
            )
            projectsRows.append({
                "tenantId": tenantId,
                "projectId": projectId,
                "projectCode": projectCode,
                "name": projectName,
                "budgetAllocated": budgetAllocated,
            })

            for oIdx in range(1, ordersPerProject + 1):
                orderId = createDeterministicUuid(f"order-{projectId}", oIdx)
                idempotencyKey = f"idem-{tenantMeta['orgSlug']}-{projectCode}-{oIdx:04d}"
                priority = priorities[(orderGlobalSeq + oIdx) % len(priorities)]
                amountUsd = round(rng.uniform(50.0, 800.0), 2)
                customAttributes = {
                    "costCenter": f"CC-{pIdx:02d}",
                    "slaHours": 4 if priority == "CRITICAL" else 24,
                    "industryTag": tenantMeta["industry"],
                }

                cluster.createWorkOrder(
                    sessionTenantId=tenantId,
                    tenantId=tenantId,
                    orderId=orderId,
                    projectId=projectId,
                    idempotencyKey=idempotencyKey,
                    title=f"Orden #{orderGlobalSeq} - {tenantMeta['industry']}",
                    priority=priority,
                    amountUsd=amountUsd,
                    customAttributes=customAttributes,
                    enforceRateLimit=False,
                )

                workOrdersRows.append({
                    "tenantId": tenantId,
                    "orderId": orderId,
                    "projectId": projectId,
                    "idempotencyKey": idempotencyKey,
                    "priority": priority,
                    "amountUsd": amountUsd,
                    "costCenter": f"CC-{pIdx:02d}",
                })

                if oIdx <= 2:
                    invoiceId = createDeterministicUuid(f"inv-{orderId}", invoiceGlobalSeq)
                    taxUsd = round(amountUsd * 0.19, 2)
                    totalUsd = round(amountUsd + taxUsd, 2)
                    invoicesRows.append({
                        "tenantId": tenantId,
                        "invoiceId": invoiceId,
                        "orderId": orderId,
                        "invoiceNumber": f"INV-2026-{invoiceGlobalSeq:06d}",
                        "subtotalUsd": amountUsd,
                        "taxUsd": taxUsd,
                        "totalUsd": totalUsd,
                        "paymentStatus": statuses[invoiceGlobalSeq % len(statuses)],
                    })
                    invoiceGlobalSeq += 1

                orderGlobalSeq += 1

    for fileName, rowsList in [
        ("Tenants.csv", activeTenantsRows),
        ("Users.csv", usersRows),
        ("Projects.csv", projectsRows),
        ("WorkOrders.csv", workOrdersRows),
        ("Invoices.csv", invoicesRows),
    ]:
        with (dataDir / fileName).open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rowsList[0].keys()))
            writer.writeheader()
            writer.writerows(rowsList)

    elapsedSeconds = round(time.perf_counter() - startTime, 3)
    clusterSummary = cluster.getClusterSummary()
    datasetSummary = {
        "databaseName": cluster.databaseName,
        "randomSeed": randomSeed,
        "catalogTotalOrganizations": len(catalog5000),
        "tierBreakdown5000": {
            "FREE": sum(1 for x in catalog5000 if x["planCode"] == "FREE"),
            "PRO": sum(1 for x in catalog5000 if x["planCode"] == "PRO"),
            "ENTERPRISE": sum(1 for x in catalog5000 if x["planCode"] == "ENTERPRISE"),
        },
        "activeClusterLoaded": {
            "tenants": len(activeTenantsRows),
            "users": len(usersRows),
            "projects": len(projectsRows),
            "workOrders": len(workOrdersRows),
            "invoices": len(invoicesRows),
        },
        "generationAndLoadTimeSeconds": elapsedSeconds,
        "clusterDistribution": clusterSummary,
    }
    (dataDir / "DatasetSummary.json").write_text(
        json.dumps(datasetSummary, indent=2), encoding="utf-8"
    )
    return datasetSummary


if __name__ == "__main__":
    summaryResult = generateSyntheticData()
    print(json.dumps(summaryResult, indent=2))
