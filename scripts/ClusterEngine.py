"""
===============================================================================
ARCHIVO: scripts/ClusterEngine.py
BASE DE DATOS: saasCloudDb
CASO 8: CLOUD NATIVE - MOTOR DE CLÚSTER DISTRIBUIDO MULTINODO (CAMELCASE)
===============================================================================
Implementa el clúster distribuido `saasCloudDb` sobre 3 nodos independientes
por Zona de Disponibilidad (`nodeAz1Pool`, `nodeAz2Pool`, `nodeAz3Silo`),
16 shards por hash de `tenantId`, replicación síncrona entre zonas (RF=2),
co-localización de tablas, Row-Level Security (RLS), Token Bucket Rate Limiting,
Control de Concurrencia Optimista (OCC), Idempotencia, Aislamiento Online de
Tenants Ballena (Pool -> Silo), Failover Automático y Migración Expand-Contract.
===============================================================================
"""

from __future__ import annotations

import hashlib
import json
import shutil
import sqlite3
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


class RlsAuthorizationError(PermissionError):
    """Excepción lanzada cuando se viola el aislamiento Row-Level Security (RLS)."""


class RateLimitExceededError(RuntimeError):
    """Excepción lanzada cuando un cliente supera su cuota RPS (Noisy Neighbor)."""


class OptimisticConcurrencyError(RuntimeError):
    """Excepción lanzada cuando ocurre un conflicto de versión (Lost Update evitado)."""


class BusinessInvariantError(ValueError):
    """Excepción lanzada cuando se viola una regla de integridad del negocio."""


class NodeUnavailableError(ConnectionError):
    """Excepción lanzada cuando un nodo de base de datos está caído."""


@dataclass
class TokenBucket:
    rateRps: float
    capacity: float
    tokens: float
    lastRefill: float = field(default_factory=time.perf_counter)

    def allowRequest(self, cost: float = 1.0) -> bool:
        now = time.perf_counter()
        elapsed = max(0.0, now - self.lastRefill)
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rateRps)
        self.lastRefill = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False


@dataclass
class ShardPlacement:
    shardId: int
    primaryNode: str
    replicaNode: str
    dedicatedTenantId: Optional[str] = None


class ClusterEngine:
    """
    Coordinador y plano de datos del clúster distribuido `saasCloudDb`.
    Administra 3 nodos en 3 Zonas de Disponibilidad (`nodeAz1Pool`, `nodeAz2Pool`, `nodeAz3Silo`).
    """

    databaseName = "saasCloudDb"
    nodesConfig = {
        "nodeAz1Pool": {"az": "us-east-1a", "role": "POOL", "status": "UP"},
        "nodeAz2Pool": {"az": "us-east-1b", "role": "POOL", "status": "UP"},
        "nodeAz3Silo": {"az": "us-east-1c", "role": "SILO", "status": "UP"},
    }

    def __init__(self, clusterDir: Path, numShards: int = 16) -> None:
        self.clusterDir = clusterDir
        self.clusterDir.mkdir(parents=True, exist_ok=True)
        self.numShards = numShards
        self._lock = threading.RLock()

        self.nodeStatus: Dict[str, str] = {
            nodeName: info["status"] for nodeName, info in self.nodesConfig.items()
        }
        self.shards: Dict[int, ShardPlacement] = {}
        self.isolatedTenants: Dict[str, int] = {}
        self.rateLimiters: Dict[str, TokenBucket] = {}
        self.tenantQuotas: Dict[str, Dict[str, Any]] = {}
        self.metrics: Dict[str, Any] = {
            "queriesByNode": {n: 0 for n in self.nodesConfig},
            "writesByNode": {n: 0 for n in self.nodesConfig},
            "throttledRequestsByTenant": {},
            "rlsBlocks": 0,
            "occConflicts": 0,
            "idempotentHits": 0,
            "failoverEvents": [],
            "rollingDeployments": [],
        }

        self._initNodesAndShards()

    def _nodeDbPath(self, nodeName: str, isReplica: bool = False) -> Path:
        roleSuffix = "Replica" if isReplica else "Primary"
        return self.clusterDir / f"{self.databaseName}_{nodeName}_{roleSuffix}.sqlite"

    def _getConn(self, nodeName: str, isReplica: bool = False) -> sqlite3.Connection:
        if self.nodeStatus.get(nodeName) != "UP":
            raise NodeUnavailableError(f"El nodo {nodeName} se encuentra CAIDO (DOWN).")
        dbPath = self._nodeDbPath(nodeName, isReplica=isReplica)
        conn = sqlite3.connect(str(dbPath), timeout=30.0, isolation_level=None)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

    def _initNodesAndShards(self) -> None:
        poolNodes = ["nodeAz1Pool", "nodeAz2Pool"]
        for shardId in range(self.numShards):
            primaryNode = poolNodes[shardId % len(poolNodes)]
            replicaNode = poolNodes[(shardId + 1) % len(poolNodes)]
            self.shards[shardId] = ShardPlacement(
                shardId=shardId,
                primaryNode=primaryNode,
                replicaNode=replicaNode,
                dedicatedTenantId=None,
            )

        schemaSql = """
        CREATE TABLE IF NOT EXISTS saasPlans (
            planCode TEXT PRIMARY KEY,
            planName TEXT NOT NULL,
            isolationStrategy TEXT NOT NULL,
            maxUsers INTEGER NOT NULL,
            maxRequestsPerSec INTEGER NOT NULL,
            storageQuotaGb INTEGER NOT NULL,
            monthlyPriceUsd REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tenants (
            shardId INTEGER NOT NULL,
            tenantId TEXT PRIMARY KEY,
            orgSlug TEXT NOT NULL UNIQUE,
            orgName TEXT NOT NULL,
            planCode TEXT NOT NULL,
            isolationMode TEXT NOT NULL DEFAULT 'POOL',
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            regionPreference TEXT NOT NULL DEFAULT 'us-east-1',
            rateLimitRps INTEGER NOT NULL DEFAULT 25,
            maxDbConnections INTEGER NOT NULL DEFAULT 10,
            schemaVersion INTEGER NOT NULL DEFAULT 1,
            settings TEXT NOT NULL DEFAULT '{}',
            version INTEGER NOT NULL DEFAULT 1,
            createdAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tenantUsers (
            shardId INTEGER NOT NULL,
            tenantId TEXT NOT NULL,
            userId TEXT NOT NULL,
            email TEXT NOT NULL,
            fullName TEXT NOT NULL,
            role TEXT NOT NULL,
            isActive INTEGER NOT NULL DEFAULT 1,
            mfaEnabled INTEGER NOT NULL DEFAULT 0,
            customAttributes TEXT NOT NULL DEFAULT '{}',
            version INTEGER NOT NULL DEFAULT 1,
            createdAt TEXT NOT NULL,
            PRIMARY KEY (tenantId, userId),
            UNIQUE (tenantId, email)
        );

        CREATE TABLE IF NOT EXISTS projects (
            shardId INTEGER NOT NULL,
            tenantId TEXT NOT NULL,
            projectId TEXT NOT NULL,
            projectCode TEXT NOT NULL,
            name TEXT NOT NULL,
            budgetAllocated REAL NOT NULL CHECK (budgetAllocated >= 0),
            budgetConsumed REAL NOT NULL CHECK (budgetConsumed >= 0 AND budgetConsumed <= budgetAllocated),
            status TEXT NOT NULL DEFAULT 'OPEN',
            customAttributes TEXT NOT NULL DEFAULT '{}',
            version INTEGER NOT NULL DEFAULT 1,
            createdAt TEXT NOT NULL,
            PRIMARY KEY (tenantId, projectId),
            UNIQUE (tenantId, projectCode)
        );

        CREATE TABLE IF NOT EXISTS workOrders (
            shardId INTEGER NOT NULL,
            tenantId TEXT NOT NULL,
            orderId TEXT NOT NULL,
            projectId TEXT NOT NULL,
            assignedUserId TEXT,
            idempotencyKey TEXT NOT NULL,
            title TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            amountUsd REAL NOT NULL CHECK (amountUsd >= 0),
            customAttributes TEXT NOT NULL DEFAULT '{}',
            version INTEGER NOT NULL DEFAULT 1,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL,
            PRIMARY KEY (tenantId, orderId),
            UNIQUE (tenantId, idempotencyKey)
        );

        CREATE TABLE IF NOT EXISTS invoices (
            shardId INTEGER NOT NULL,
            tenantId TEXT NOT NULL,
            invoiceId TEXT NOT NULL,
            orderId TEXT NOT NULL,
            idempotencyKey TEXT NOT NULL,
            invoiceNumber TEXT NOT NULL,
            subtotalUsd REAL NOT NULL CHECK (subtotalUsd >= 0),
            taxUsd REAL NOT NULL CHECK (taxUsd >= 0),
            totalUsd REAL NOT NULL CHECK (ROUND(totalUsd, 2) = ROUND(subtotalUsd + taxUsd, 2)),
            paymentStatus TEXT NOT NULL DEFAULT 'UNPAID',
            version INTEGER NOT NULL DEFAULT 1,
            issuedAt TEXT NOT NULL,
            PRIMARY KEY (tenantId, invoiceId),
            UNIQUE (tenantId, invoiceNumber),
            UNIQUE (tenantId, idempotencyKey)
        );

        CREATE TABLE IF NOT EXISTS auditEvents (
            shardId INTEGER NOT NULL,
            tenantId TEXT NOT NULL,
            eventId TEXT NOT NULL,
            eventType TEXT NOT NULL,
            entityName TEXT NOT NULL,
            entityId TEXT NOT NULL,
            payload TEXT NOT NULL DEFAULT '{}',
            createdAt TEXT NOT NULL,
            PRIMARY KEY (tenantId, eventId)
        );

        CREATE INDEX IF NOT EXISTS idxWoTenantStatus ON workOrders (tenantId, status, priority);
        CREATE INDEX IF NOT EXISTS idxInvTenantStatus ON invoices (tenantId, paymentStatus);
        """

        plansData = [
            ("FREE", "Starter Cloud Pool", "POOL", 10, 25, 5, 0.0),
            ("PRO", "Business Growth Pool", "POOL", 100, 150, 100, 299.0),
            ("ENTERPRISE", "Enterprise Dedicated Silo", "SILO", 10000, 1500, 5000, 2499.0),
        ]

        for nodeName in self.nodesConfig:
            for isReplica in (False, True):
                conn = self._getConn(nodeName, isReplica=isReplica)
                try:
                    conn.executescript(schemaSql)
                    conn.executemany(
                        """
                        INSERT OR REPLACE INTO saasPlans
                        (planCode, planName, isolationStrategy, maxUsers, maxRequestsPerSec, storageQuotaGb, monthlyPriceUsd)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        plansData,
                    )
                finally:
                    conn.close()

    def computeShardId(self, tenantId: str) -> int:
        if tenantId in self.isolatedTenants:
            return self.isolatedTenants[tenantId]
        digest = hashlib.sha256(tenantId.encode("utf-8")).hexdigest()
        return int(digest[:8], 16) % self.numShards

    def resolvePlacement(self, tenantId: str) -> ShardPlacement:
        shardId = self.computeShardId(tenantId)
        return self.shards[shardId]

    def _checkRlsAndRateLimit(
        self,
        sessionTenantId: Optional[str],
        targetTenantId: str,
        bypassRls: bool = False,
        enforceRateLimit: bool = True,
    ) -> None:
        if not bypassRls:
            if not sessionTenantId:
                self.metrics["rlsBlocks"] += 1
                raise RlsAuthorizationError(
                    "Bloqueo RLS (Fail-Closed): 'app.currentTenantId' no establecido en la sesion."
                )
            if sessionTenantId != targetTenantId:
                self.metrics["rlsBlocks"] += 1
                raise RlsAuthorizationError(
                    f"Violacion RLS detectada: Sesion de tenant '{sessionTenantId}' "
                    f"intento acceder a datos del tenant '{targetTenantId}'."
                )

        if enforceRateLimit:
            with self._lock:
                bucket = self.rateLimiters.get(targetTenantId)
                if bucket is None:
                    rps = self.tenantQuotas.get(targetTenantId, {}).get("rateLimitRps", 50)
                    burstCap = float(min(30, max(5, rps // 2)))
                    bucket = TokenBucket(rateRps=float(rps), capacity=burstCap, tokens=burstCap)
                    self.rateLimiters[targetTenantId] = bucket
                if not bucket.allowRequest(1.0):
                    self.metrics["throttledRequestsByTenant"][targetTenantId] = (
                        self.metrics["throttledRequestsByTenant"].get(targetTenantId, 0) + 1
                    )
                    raise RateLimitExceededError(
                        f"HTTP 429 Too Many Requests: Tenant '{targetTenantId}' supero su cuota RPS ({bucket.rateRps} req/s)."
                    )

    def _executeReplicatedWrite(
        self,
        placement: ShardPlacement,
        sqlStatements: List[Tuple[str, Tuple[Any, ...]]],
    ) -> None:
        primaryConn = self._getConn(placement.primaryNode, isReplica=False)
        replicaConn = (
            self._getConn(placement.replicaNode, isReplica=True)
            if self.nodeStatus.get(placement.replicaNode) == "UP"
            else None
        )

        try:
            primaryConn.execute("BEGIN IMMEDIATE;")
            if replicaConn:
                replicaConn.execute("BEGIN IMMEDIATE;")

            for stmt, params in sqlStatements:
                primaryConn.execute(stmt, params)
                if replicaConn:
                    replicaConn.execute(stmt, params)

            primaryConn.execute("COMMIT;")
            if replicaConn:
                replicaConn.execute("COMMIT;")

            with self._lock:
                self.metrics["writesByNode"][placement.primaryNode] += 1
                self.metrics["queriesByNode"][placement.primaryNode] += 1
                if replicaConn:
                    self.metrics["writesByNode"][placement.replicaNode] += 1
        except Exception:
            primaryConn.execute("ROLLBACK;")
            if replicaConn:
                replicaConn.execute("ROLLBACK;")
            raise
        finally:
            primaryConn.close()
            if replicaConn:
                replicaConn.close()

    def provisionTenant(
        self,
        tenantId: str,
        orgSlug: str,
        orgName: str,
        planCode: str = "PRO",
        regionPreference: str = "us-east-1",
        adminEmail: Optional[str] = None,
        adminName: str = "Admin User",
    ) -> Dict[str, Any]:
        planDefaults = {
            "FREE": {"isolation": "POOL", "rps": 25, "conns": 5},
            "PRO": {"isolation": "POOL", "rps": 150, "conns": 25},
            "ENTERPRISE": {"isolation": "SILO", "rps": 1500, "conns": 150},
        }
        cfg = planDefaults[planCode]
        shardId = self.computeShardId(tenantId)
        placement = self.shards[shardId]
        nowIso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        adminUserId = str(uuid.uuid4())
        adminEmail = adminEmail or f"admin@{orgSlug}.io"
        eventId = str(uuid.uuid4())

        stmts = [
            (
                """
                INSERT OR IGNORE INTO tenants
                (shardId, tenantId, orgSlug, orgName, planCode, isolationMode, status,
                 regionPreference, rateLimitRps, maxDbConnections, schemaVersion, settings, version, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 1, ?, 1, ?)
                """,
                (
                    shardId,
                    tenantId,
                    orgSlug,
                    orgName,
                    planCode,
                    cfg["isolation"],
                    regionPreference,
                    cfg["rps"],
                    cfg["conns"],
                    json.dumps({"planCode": planCode, "zeroDowntimeOnboarded": True}),
                    nowIso,
                ),
            ),
            (
                """
                INSERT OR IGNORE INTO tenantUsers
                (shardId, tenantId, userId, email, fullName, role, isActive, mfaEnabled, customAttributes, version, createdAt)
                VALUES (?, ?, ?, ?, ?, 'OWNER', 1, 1, '{}', 1, ?)
                """,
                (shardId, tenantId, adminUserId, adminEmail, adminName, nowIso),
            ),
            (
                """
                INSERT OR IGNORE INTO auditEvents
                (shardId, tenantId, eventId, eventType, entityName, entityId, payload, createdAt)
                VALUES (?, ?, ?, 'TENANT_PROVISIONED', 'tenants', ?, ?, ?)
                """,
                (
                    shardId,
                    tenantId,
                    eventId,
                    tenantId,
                    json.dumps({"orgSlug": orgSlug, "planCode": planCode, "shardId": shardId}),
                    nowIso,
                ),
            ),
        ]

        self._executeReplicatedWrite(placement, stmts)
        with self._lock:
            self.tenantQuotas[tenantId] = {"rateLimitRps": cfg["rps"], "planCode": planCode}
            burstCap = float(min(30, max(5, cfg["rps"] // 2)))
            self.rateLimiters[tenantId] = TokenBucket(
                rateRps=float(cfg["rps"]),
                capacity=burstCap,
                tokens=burstCap,
            )

        return {
            "tenantId": tenantId,
            "orgSlug": orgSlug,
            "planCode": planCode,
            "shardId": shardId,
            "primaryNode": placement.primaryNode,
            "replicaNode": placement.replicaNode,
        }

    def createProject(
        self,
        sessionTenantId: str,
        tenantId: str,
        projectId: str,
        projectCode: str,
        name: str,
        budgetAllocated: float,
        customAttributes: Optional[Dict[str, Any]] = None,
    ) -> None:
        self._checkRlsAndRateLimit(sessionTenantId, tenantId)
        placement = self.resolvePlacement(tenantId)
        nowIso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        stmts = [
            (
                """
                INSERT INTO projects
                (shardId, tenantId, projectId, projectCode, name, budgetAllocated, budgetConsumed, status, customAttributes, version, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, 0.0, 'OPEN', ?, 1, ?)
                """,
                (
                    placement.shardId,
                    tenantId,
                    projectId,
                    projectCode,
                    name,
                    budgetAllocated,
                    json.dumps(customAttributes or {}),
                    nowIso,
                ),
            )
        ]
        self._executeReplicatedWrite(placement, stmts)

    def createWorkOrder(
        self,
        sessionTenantId: str,
        tenantId: str,
        orderId: str,
        projectId: str,
        idempotencyKey: str,
        title: str,
        priority: str,
        amountUsd: float,
        assignedUserId: Optional[str] = None,
        customAttributes: Optional[Dict[str, Any]] = None,
        enforceRateLimit: bool = True,
    ) -> Dict[str, Any]:
        self._checkRlsAndRateLimit(
            sessionTenantId, tenantId, enforceRateLimit=enforceRateLimit
        )
        placement = self.resolvePlacement(tenantId)

        with self._lock:
            primaryConn = self._getConn(placement.primaryNode, isReplica=False)
            replicaConn = (
                self._getConn(placement.replicaNode, isReplica=True)
                if self.nodeStatus.get(placement.replicaNode) == "UP"
                else None
            )
            try:
                primaryConn.execute("BEGIN IMMEDIATE;")
                if replicaConn:
                    replicaConn.execute("BEGIN IMMEDIATE;")

                existing = primaryConn.execute(
                    "SELECT orderId, status, amountUsd, version FROM workOrders WHERE tenantId = ? AND idempotencyKey = ?",
                    (tenantId, idempotencyKey),
                ).fetchone()
                if existing:
                    primaryConn.execute("ROLLBACK;")
                    if replicaConn:
                        replicaConn.execute("ROLLBACK;")
                    self.metrics["idempotentHits"] += 1
                    return {
                        "orderId": existing["orderId"],
                        "status": existing["status"],
                        "amountUsd": existing["amountUsd"],
                        "version": existing["version"],
                        "idempotentReplay": True,
                    }

                proj = primaryConn.execute(
                    "SELECT budgetAllocated, budgetConsumed FROM projects WHERE tenantId = ? AND projectId = ?",
                    (tenantId, projectId),
                ).fetchone()
                if not proj:
                    raise BusinessInvariantError(f"Proyecto {projectId} no existe en el tenant {tenantId}.")
                if round(proj["budgetConsumed"] + amountUsd, 2) > round(proj["budgetAllocated"], 2):
                    raise BusinessInvariantError(
                        f"Presupuesto insuficiente en proyecto {projectId}: "
                        f"budgetConsumed={proj['budgetConsumed']}, amountUsd={amountUsd}, budgetAllocated={proj['budgetAllocated']}."
                    )

                nowIso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                insertSql = """
                    INSERT INTO workOrders
                    (shardId, tenantId, orderId, projectId, assignedUserId, idempotencyKey,
                     title, priority, status, amountUsd, customAttributes, version, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, 1, ?, ?)
                """
                insertParams = (
                    placement.shardId,
                    tenantId,
                    orderId,
                    projectId,
                    assignedUserId,
                    idempotencyKey,
                    title,
                    priority,
                    amountUsd,
                    json.dumps(customAttributes or {}),
                    nowIso,
                    nowIso,
                )
                updateProjSql = """
                    UPDATE projects
                    SET budgetConsumed = ROUND(budgetConsumed + ?, 2),
                        version = version + 1
                    WHERE tenantId = ? AND projectId = ?
                """
                updateProjParams = (amountUsd, tenantId, projectId)

                primaryConn.execute(insertSql, insertParams)
                primaryConn.execute(updateProjSql, updateProjParams)

                if replicaConn:
                    replicaConn.execute(insertSql, insertParams)
                    replicaConn.execute(updateProjSql, updateProjParams)

                primaryConn.execute("COMMIT;")
                if replicaConn:
                    replicaConn.execute("COMMIT;")

                self.metrics["writesByNode"][placement.primaryNode] += 1
                self.metrics["queriesByNode"][placement.primaryNode] += 1
                if replicaConn:
                    self.metrics["writesByNode"][placement.replicaNode] += 1

                return {
                    "orderId": orderId,
                    "status": "PENDING",
                    "amountUsd": amountUsd,
                    "version": 1,
                    "idempotentReplay": False,
                }
            except Exception:
                primaryConn.execute("ROLLBACK;")
                if replicaConn:
                    replicaConn.execute("ROLLBACK;")
                raise
            finally:
                primaryConn.close()
                if replicaConn:
                    replicaConn.close()

    def updateOrderStatusOcc(
        self,
        sessionTenantId: str,
        tenantId: str,
        orderId: str,
        newStatus: str,
        expectedVersion: int,
    ) -> int:
        self._checkRlsAndRateLimit(sessionTenantId, tenantId)
        placement = self.resolvePlacement(tenantId)
        nowIso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        with self._lock:
            primaryConn = self._getConn(placement.primaryNode, isReplica=False)
            replicaConn = (
                self._getConn(placement.replicaNode, isReplica=True)
                if self.nodeStatus.get(placement.replicaNode) == "UP"
                else None
            )
            try:
                primaryConn.execute("BEGIN IMMEDIATE;")
                if replicaConn:
                    replicaConn.execute("BEGIN IMMEDIATE;")

                sql = """
                    UPDATE workOrders
                    SET status = ?, version = version + 1, updatedAt = ?
                    WHERE tenantId = ? AND orderId = ? AND version = ?
                """
                params = (newStatus, nowIso, tenantId, orderId, expectedVersion)
                cur = primaryConn.execute(sql, params)
                if cur.rowcount == 0:
                    primaryConn.execute("ROLLBACK;")
                    if replicaConn:
                        replicaConn.execute("ROLLBACK;")
                    self.metrics["occConflicts"] += 1
                    raise OptimisticConcurrencyError(
                        f"Conflicto OCC (HTTP 409): La orden {orderId} ya fue modificada por otro usuario "
                        f"(expectedVersion={expectedVersion})."
                    )

                if replicaConn:
                    replicaConn.execute(sql, params)

                primaryConn.execute("COMMIT;")
                if replicaConn:
                    replicaConn.execute("COMMIT;")

                self.metrics["writesByNode"][placement.primaryNode] += 1
                self.metrics["queriesByNode"][placement.primaryNode] += 1
                return expectedVersion + 1
            finally:
                primaryConn.close()
                if replicaConn:
                    replicaConn.close()

    def queryTenantDashboard(
        self,
        sessionTenantId: Optional[str],
        queryTenantId: str,
        statusFilter: Optional[str] = None,
        enforceRateLimit: bool = True,
    ) -> List[Dict[str, Any]]:
        self._checkRlsAndRateLimit(
            sessionTenantId, queryTenantId, enforceRateLimit=enforceRateLimit
        )
        placement = self.resolvePlacement(queryTenantId)
        conn = self._getConn(placement.primaryNode, isReplica=False)
        try:
            sql = """
                SELECT wo.orderId, wo.title, wo.priority, wo.status, wo.amountUsd,
                       wo.version, wo.customAttributes, p.projectCode, p.name AS projectName,
                       p.budgetAllocated, p.budgetConsumed
                FROM workOrders wo
                JOIN projects p
                  ON wo.tenantId = p.tenantId AND wo.projectId = p.projectId
                WHERE wo.tenantId = ?
            """
            params: List[Any] = [queryTenantId]
            if statusFilter:
                sql += " AND wo.status = ?"
                params.append(statusFilter)
            sql += " ORDER BY wo.createdAt DESC LIMIT 100"

            rows = conn.execute(sql, tuple(params)).fetchall()
            with self._lock:
                self.metrics["queriesByNode"][placement.primaryNode] += 1
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def isolateWhaleTenant(
        self,
        tenantId: str,
        targetSiloNode: str = "nodeAz3Silo",
        standbyNode: str = "nodeAz2Pool",
    ) -> Dict[str, Any]:
        with self._lock:
            oldPlacement = self.resolvePlacement(tenantId)
            newShardId = max(self.shards.keys()) + 1
            newPlacement = ShardPlacement(
                shardId=newShardId,
                primaryNode=targetSiloNode,
                replicaNode=standbyNode,
                dedicatedTenantId=tenantId,
            )

            tables = ["tenants", "tenantUsers", "projects", "workOrders", "invoices", "auditEvents"]
            srcConn = self._getConn(oldPlacement.primaryNode, isReplica=False)
            srcRepConn = self._getConn(oldPlacement.replicaNode, isReplica=True)
            dstConn = self._getConn(newPlacement.primaryNode, isReplica=False)
            dstRepConn = self._getConn(newPlacement.replicaNode, isReplica=True)

            movedRows = 0
            try:
                srcConn.execute("BEGIN IMMEDIATE;")
                srcRepConn.execute("BEGIN IMMEDIATE;")
                dstConn.execute("BEGIN IMMEDIATE;")
                dstRepConn.execute("BEGIN IMMEDIATE;")

                for tbl in tables:
                    rows = srcConn.execute(
                        f"SELECT * FROM {tbl} WHERE tenantId = ?", (tenantId,)
                    ).fetchall()
                    if not rows:
                        continue
                    cols = list(rows[0].keys())
                    placeholders = ", ".join(["?"] * len(cols))
                    colNames = ", ".join(cols)

                    for r in rows:
                        rowDict = dict(r)
                        rowDict["shardId"] = newShardId
                        if tbl == "tenants":
                            rowDict["isolationMode"] = "SILO"
                        vals = tuple(rowDict[c] for c in cols)
                        dstConn.execute(
                            f"INSERT OR REPLACE INTO {tbl} ({colNames}) VALUES ({placeholders})",
                            vals,
                        )
                        dstRepConn.execute(
                            f"INSERT OR REPLACE INTO {tbl} ({colNames}) VALUES ({placeholders})",
                            vals,
                        )
                        movedRows += 1

                    srcConn.execute(f"DELETE FROM {tbl} WHERE tenantId = ?", (tenantId,))
                    srcRepConn.execute(f"DELETE FROM {tbl} WHERE tenantId = ?", (tenantId,))

                dstConn.execute("COMMIT;")
                dstRepConn.execute("COMMIT;")
                srcConn.execute("COMMIT;")
                srcRepConn.execute("COMMIT;")

                self.shards[newShardId] = newPlacement
                self.isolatedTenants[tenantId] = newShardId
                return {
                    "tenantId": tenantId,
                    "oldShardId": oldPlacement.shardId,
                    "oldPrimaryNode": oldPlacement.primaryNode,
                    "newShardId": newShardId,
                    "newPrimaryNode": newPlacement.primaryNode,
                    "newReplicaNode": newPlacement.replicaNode,
                    "isolationMode": "SILO",
                    "movedRecords": movedRows,
                }
            finally:
                srcConn.close()
                srcRepConn.close()
                dstConn.close()
                dstRepConn.close()

    def simulateNodeFailover(self, failedNode: str) -> Dict[str, Any]:
        t0 = time.perf_counter()
        with self._lock:
            self.nodeStatus[failedNode] = "DOWN"
            promotedShards: List[int] = []

            for shardId, placement in self.shards.items():
                if placement.primaryNode == failedNode:
                    newPrimary = placement.replicaNode
                    repConn = self._getConn(newPrimary, isReplica=True)
                    priConn = self._getConn(newPrimary, isReplica=False)
                    try:
                        priConn.execute("BEGIN IMMEDIATE;")
                        for tbl in ["tenants", "tenantUsers", "projects", "workOrders", "invoices", "auditEvents"]:
                            rows = repConn.execute(
                                f"SELECT * FROM {tbl} WHERE shardId = ?", (shardId,)
                            ).fetchall()
                            if rows:
                                cols = list(rows[0].keys())
                                colNames = ", ".join(cols)
                                placeholders = ", ".join(["?"] * len(cols))
                                for r in rows:
                                    priConn.execute(
                                        f"INSERT OR REPLACE INTO {tbl} ({colNames}) VALUES ({placeholders})",
                                        tuple(r[c] for c in cols),
                                    )
                        priConn.execute("COMMIT;")
                    finally:
                        repConn.close()
                        priConn.close()

                    placement.primaryNode = newPrimary
                    placement.replicaNode = failedNode
                    promotedShards.append(shardId)

            rtoMs = (time.perf_counter() - t0) * 1000.0
            event = {
                "failedNode": failedNode,
                "promotedShards": promotedShards,
                "newPrimaryNodes": list({self.shards[s].primaryNode for s in promotedShards}),
                "rtoMs": round(rtoMs, 2),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            self.metrics["failoverEvents"].append(event)
            return event

    def recoverFailedNode(self, recoveredNode: str) -> Dict[str, Any]:
        t0 = time.perf_counter()
        with self._lock:
            self.nodeStatus[recoveredNode] = "UP"
            resyncedShards: List[int] = []
            for shardId, placement in self.shards.items():
                if placement.replicaNode == recoveredNode:
                    priConn = self._getConn(placement.primaryNode, isReplica=False)
                    repConn = self._getConn(recoveredNode, isReplica=True)
                    oldPriConn = self._getConn(recoveredNode, isReplica=False)
                    try:
                        repConn.execute("BEGIN IMMEDIATE;")
                        oldPriConn.execute("BEGIN IMMEDIATE;")
                        for tbl in ["tenants", "tenantUsers", "projects", "workOrders", "invoices", "auditEvents"]:
                            oldPriConn.execute(f"DELETE FROM {tbl} WHERE shardId = ?", (shardId,))
                            repConn.execute(f"DELETE FROM {tbl} WHERE shardId = ?", (shardId,))
                            rows = priConn.execute(
                                f"SELECT * FROM {tbl} WHERE shardId = ?", (shardId,)
                            ).fetchall()
                            if rows:
                                cols = list(rows[0].keys())
                                colNames = ", ".join(cols)
                                placeholders = ", ".join(["?"] * len(cols))
                                for r in rows:
                                    repConn.execute(
                                        f"INSERT OR REPLACE INTO {tbl} ({colNames}) VALUES ({placeholders})",
                                        tuple(r[c] for c in cols),
                                    )
                        oldPriConn.execute("COMMIT;")
                        repConn.execute("COMMIT;")
                        resyncedShards.append(shardId)
                    finally:
                        priConn.close()
                        repConn.close()
                        oldPriConn.close()

            elapsedMs = (time.perf_counter() - t0) * 1000.0
            return {
                "recoveredNode": recoveredNode,
                "status": "UP",
                "resyncedShardsCount": len(resyncedShards),
                "resyncTimeMs": round(elapsedMs, 2),
            }

    def runZeroDowntimeMigration(self) -> Dict[str, Any]:
        t0 = time.perf_counter()
        with self._lock:
            for nodeName in self.nodesConfig:
                if self.nodeStatus[nodeName] != "UP":
                    continue
                for isRep in (False, True):
                    conn = self._getConn(nodeName, isReplica=isRep)
                    try:
                        cols = [
                            r["name"]
                            for r in conn.execute("PRAGMA table_info(workOrders);").fetchall()
                        ]
                        if "slaDeadlineAt" not in cols:
                            conn.execute("ALTER TABLE workOrders ADD COLUMN slaDeadlineAt TEXT NULL;")
                    finally:
                        conn.close()

            backfilledRows = 0
            for nodeName in self.nodesConfig:
                if self.nodeStatus[nodeName] != "UP":
                    continue
                for isRep in (False, True):
                    conn = self._getConn(nodeName, isReplica=isRep)
                    try:
                        conn.execute("BEGIN IMMEDIATE;")
                        cur = conn.execute(
                            """
                            UPDATE workOrders
                            SET slaDeadlineAt = datetime(createdAt, '+24 hours')
                            WHERE slaDeadlineAt IS NULL
                            """
                        )
                        if not isRep:
                            backfilledRows += cur.rowcount
                        conn.execute("UPDATE tenants SET schemaVersion = 2 WHERE schemaVersion < 2;")
                        conn.execute("COMMIT;")
                    finally:
                        conn.close()

            elapsedMs = (time.perf_counter() - t0) * 1000.0
            deployRecord = {
                "pattern": "Expand-Contract + RollingUpdate (maxUnavailable=0, maxSurge=2)",
                "fromVersion": "v1.0.0",
                "toVersion": "v2.0.0",
                "newColumn": "slaDeadlineAt",
                "backfilledWorkOrders": backfilledRows,
                "downtimeMs": 0.0,
                "migrationDurationMs": round(elapsedMs, 2),
            }
            self.metrics["rollingDeployments"].append(deployRecord)
            return deployRecord

    def createClusterBackup(self, backupDir: Path) -> Dict[str, Any]:
        t0 = time.perf_counter()
        backupDir.mkdir(parents=True, exist_ok=True)
        filesBackedUp = []
        with self._lock:
            for nodeName in self.nodesConfig:
                for isRep in (False, True):
                    src = self._nodeDbPath(nodeName, isReplica=isRep)
                    dst = backupDir / src.name
                    srcConn = sqlite3.connect(str(src))
                    dstConn = sqlite3.connect(str(dst))
                    try:
                        srcConn.backup(dstConn)
                    finally:
                        dstConn.close()
                        srcConn.close()
                    checksum = hashlib.sha256(dst.read_bytes()).hexdigest()
                    filesBackedUp.append({"file": dst.name, "sha256": checksum, "sizeBytes": dst.stat().st_size})

        elapsedMs = (time.perf_counter() - t0) * 1000.0
        manifest = {
            "databaseName": self.databaseName,
            "backupTimestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "backupDurationMs": round(elapsedMs, 2),
            "files": filesBackedUp,
        }
        (backupDir / "BackupManifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        return manifest

    def restoreClusterBackup(self, backupDir: Path) -> Dict[str, Any]:
        t0 = time.perf_counter()
        manifest = json.loads((backupDir / "BackupManifest.json").read_text(encoding="utf-8"))
        restoredFiles = 0
        with self._lock:
            for item in manifest["files"]:
                src = backupDir / item["file"]
                actualHash = hashlib.sha256(src.read_bytes()).hexdigest()
                if actualHash != item["sha256"]:
                    raise RuntimeError(f"Checksum invalido en archivo de respaldo {item['file']}")
                dst = self.clusterDir / item["file"]
                shutil.copy2(src, dst)
                restoredFiles += 1
        elapsedMs = (time.perf_counter() - t0) * 1000.0
        return {
            "restoredFiles": restoredFiles,
            "checksumVerified": True,
            "rtoRestoreMs": round(elapsedMs, 2),
        }

    def getClusterSummary(self) -> Dict[str, Any]:
        summary: Dict[str, Any] = {
            "databaseName": self.databaseName,
            "nodes": {},
            "totalTenants": 0,
            "totalWorkOrders": 0,
        }
        for nodeName, cfg in self.nodesConfig.items():
            if self.nodeStatus[nodeName] != "UP":
                summary["nodes"][nodeName] = {"status": "DOWN", "az": cfg["az"]}
                continue
            conn = self._getConn(nodeName, isReplica=False)
            repConn = self._getConn(nodeName, isReplica=True)
            try:
                tCnt = conn.execute("SELECT COUNT(*) FROM tenants").fetchone()[0]
                uCnt = conn.execute("SELECT COUNT(*) FROM tenantUsers").fetchone()[0]
                pCnt = conn.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
                oCnt = conn.execute("SELECT COUNT(*) FROM workOrders").fetchone()[0]
                iCnt = conn.execute("SELECT COUNT(*) FROM invoices").fetchone()[0]
                repTCnt = repConn.execute("SELECT COUNT(*) FROM tenants").fetchone()[0]
                repOCnt = repConn.execute("SELECT COUNT(*) FROM workOrders").fetchone()[0]
                summary["nodes"][nodeName] = {
                    "status": "UP",
                    "az": cfg["az"],
                    "role": cfg["role"],
                    "primaryTenants": tCnt,
                    "primaryUsers": uCnt,
                    "primaryProjects": pCnt,
                    "primaryWorkOrders": oCnt,
                    "primaryInvoices": iCnt,
                    "replicaTenants": repTCnt,
                    "replicaWorkOrders": repOCnt,
                }
                summary["totalTenants"] += tCnt
                summary["totalWorkOrders"] += oCnt
            finally:
                conn.close()
                repConn.close()
        return summary
