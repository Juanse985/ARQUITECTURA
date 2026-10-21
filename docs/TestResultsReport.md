# Informe de Pruebas y Resultados Verificables (`saasCloudDb` — Caso 8: Cloud Native)

> **Transparencia Metodológica (Cumplimiento de la Rúbrica):**
> Este informe documenta los resultados **realmente ejecutados y medidos** sobre el clúster multinodo local **`saasCloudDb`** mediante [`scripts/TestSuite.py`](../scripts/TestSuite.py), cuyos reportes crudos se encuentran en [`evidences/TestReport.json`](../evidences/TestReport.json) y [`evidences/TestLog.txt`](../evidences/TestLog.txt).

---

## 1. Entorno de Ejecución y Metodología

| Parámetro | Valor Verificado |
| :--- | :--- |
| **Base de Datos Distribuida** | `saasCloudDb` |
| **Motor de Ejecución Local** | Python `3.14.3` + Motor Distribuido [`scripts/ClusterEngine.py`](../scripts/ClusterEngine.py) |
| **Topología del Prototipo** | 3 Nodos por Zona de Disponibilidad (`nodeAz1Pool`, `nodeAz2Pool`, `nodeAz3Silo`), **16 Shards por Hash de `tenantId`**, Factor de Replicación **RF=2** (Primario en una AZ + Réplica Síncrona en otra AZ) |
| **Datos Sintéticos Generados ([`SyntheticData.py`](../scripts/SyntheticData.py))** | Semilla `20261020`: **5.000 organizaciones** en [`data/TenantsCatalog5000.csv`](../data/TenantsCatalog5000.csv) (`3.750 FREE`, `1.100 PRO`, `150 ENTERPRISE`) y **120 organizaciones activas** en los shards con **1.710 órdenes** (`workOrders`), **221 proyectos** (`projects`) y **442 facturas** (`invoices`) |
| **Tiempo de Generación y Carga** | `31,197 segundos` |

---

## 2. Resumen Ejecutivo de las 8 Pruebas Ejecutadas

| ID Prueba | Método / Categoría Evaluada | Estado | Resultado y Métrica Real Obtenida |
| :--- | :--- | :---: | :--- |
| **TEST 01** | `test01DistributionAndColocation` | **PASSED** | `61` tenants primarios en `nodeAz1Pool` (con `61` réplicas en `nodeAz2Pool`) y `59` tenants primarios en `nodeAz2Pool` (con `59` réplicas en `nodeAz1Pool`). `1.710` órdenes co-localizadas. |
| **TEST 02** | `test02RlsTenantIsolation` | **PASSED** | Lectura legítima retorna `12` filas; lectura cruzada entre `tenantProA` y `tenantProB` bloqueada (`RlsAuthorizationError`); sesión sin `tenantId` bloqueada (*Fail-Closed*). |
| **TEST 03** | `test03ZeroDowntimeOnboarding` | **PASSED** | `10` nuevas organizaciones aprovisionadas en caliente (`provisionTenant`, latencia media **`23,14 ms`**) durante `100` lecturas concurrentes con **`0` errores**. |
| **TEST 04** | `test04IntegrityIdempotencyAndOcc` | **PASSED** | Reintento con igual `idempotencyKey` detectado (`idempotentReplay: true`); sobregiro de `budgetAllocated` rechazado; en 10 hilos concurrentes sobre `updateOrderStatusOcc`: **`1` éxito y `9` conflictos HTTP 409 (`0` Lost Updates)**. |
| **TEST 05** | `test05NoisyNeighborProtection` | **PASSED** | Ráfaga de `80` peticiones de un tenant ruidoso: `66` bloqueadas con **HTTP 429**; tenant normal concurrente operó con **`0` errores** y latencia **`p95 = 4,05 ms`**. |
| **TEST 06** | `test06WhaleTenantOnlineSiloIsolation` | **PASSED** | Organización `ENTERPRISE` aislada en caliente (`isolateWhaleTenant`) en el `shardId = 16` sobre el nodo dedicado `nodeAz3Silo` (`67` registros movidos con **`0` pérdida de datos**). |
| **TEST 07** | `test07ComponentFailoverAndGradualDeployment` | **PASSED** | Caída de `nodeAz1Pool`: failover automático de `8` shards hacia `nodeAz2Pool` en **`176,17 ms`**. Recuperación y resincronización en **`489,65 ms`**. Migración *Expand-Contract* (`slaDeadlineAt`) sobre `1.711` órdenes con **`0 ms` downtime**. |
| **TEST 08** | `test08BackupAndVerifiedRestore` | **PASSED** | Respaldo consistente de `6` archivos de nodos con hash `SHA-256`; tras simular borrado de `workOrders`, restauración íntegra de **`1.711 / 1.711` órdenes** en **`27,03 ms`** (**RPO = 0**). |

---

## 3. Comandos para Reproducir las Pruebas

```powershell
# 1. Generar los datos sinteticos
python DATA-ARCHITECTURE/scripts/SyntheticData.py

# 2. Ejecutar la suite completa de 8 pruebas
python DATA-ARCHITECTURE/scripts/TestSuite.py

# 3. Ejecutar las operaciones y consultas representativas
python DATA-ARCHITECTURE/scripts/BusinessOperations.py
```
