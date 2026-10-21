# DATA-ARCHITECTURE — Caso 8: Cloud Native SaaS Multicliente (`saasCloudDb`)

**Curso:** Arquitectura de Datos — Taller Práctico NoSQL / Distribuido  
**Base de Datos Distribuida:** `saasCloudDb` (PostgreSQL 16 + Citus 12.1 + PgBouncer + Redis Cluster + Kubernetes Multi-AZ)  
**Estándar de Nomenclatura:** `camelCase` en bases de datos, tablas, columnas, variables y métodos; nombres de archivos descriptivos en `PascalCase / camelCase`.

---

## 1. Estructura de la Carpeta `DATA-ARCHITECTURE`

```text
DATA-ARCHITECTURE/
├── README.md                                # Guía principal, ejecución y mapeo con la rúbrica
├── docs/                                    # Documentación Técnica Completa
│   ├── TechnicalReport.md                   # Informe Técnico completo (Secciones A - K y Requisitos 1 - 8)
│   ├── ArchitectureAndDataModel.md          # Diagramas de Arquitectura Multi-AZ y Modelo de Datos en camelCase
│   ├── TestResultsReport.md                 # Informe de las 8 pruebas ejecutadas y métricas reales obtenidas
│   ├── SecurityRecoveryAndCosts.md          # Plan de Seguridad, RPO/RTO, Costos Cloud y Roles por Perfil
│   └── PresentationGuide.md                 # Guía paso a paso para la sustentación del equipo
├── sql/                                     # Scripts SQL de la Base de Datos `saasCloudDb` (en camelCase)
│   ├── DataModel.sql                        # Tablas (saasPlans, tenants, tenantUsers, projects, workOrders, invoices, auditEvents)
│   ├── ShardingAndDistribution.sql          # Distribución Citus, Co-location y función isolateEnterpriseTenantOnline
│   ├── TenantSecurityRls.sql                # Row-Level Security (FORCE RLS), roles (saasAppRuntime) y currentAppTenantId()
│   ├── BusinessQueries.sql                  # Operaciones críticas, Onboarding Zero-Downtime, Idempotencia y OCC
│   ├── SchemaMigration.sql                  # Migración de esquema Zero-Downtime (Patrón Expand & Contract)
│   ├── LoadSyntheticData.sql                # Carga de data/*.csv en el clúster Citus real (Docker)
│   └── ClusterDemo.sql                      # Demostración en vivo: topología, shards, RLS y aislamiento Silo
├── docker/                                  # Clúster Distribuido en Contenedores
│   ├── docker-compose.yml                   # citusCoordinator, nodeAz1Pool, nodeAz2Pool, nodeAz3Silo, clusterInitializer, pgBouncerPooler, redisRateLimiter
│   ├── initCluster/
│   │   └── InitSaasCluster.sh               # Inicialización del clúster: registra workers, ejecuta sql/ en orden y carga los CSV
│   └── pgbouncer/
│       └── pgbouncer.ini                    # Configuración de Transaction Pooling para saasCloudDb
├── kubernetes/                              # Manifiestos Cloud Native para Kubernetes Multi-AZ
│   ├── NamespaceAndQuotas.yaml              # Namespace, ResourceQuota, LimitRange y PriorityClass
│   ├── StorageClass.yaml                    # StorageClass CSI (`WaitForFirstConsumer`, `Retain`, `allowVolumeExpansion: true`)
│   ├── DatabaseCluster.yaml                 # StatefulSet Multi-AZ, PVC Templates (`pgDataPvc`) y PodDisruptionBudget
│   ├── PoolerAndRateLimiter.yaml            # Despliegue de pgBouncerPooler y redisRateLimiter
│   ├── SaasApiAndAutoscaler.yaml            # RollingUpdate (`maxUnavailable: 0`) y HorizontalPodAutoscaler (HPA)
│   ├── NetworkAndRbac.yaml                  # NetworkPolicy Zero-Trust y RBAC
│   └── BackupCronJob.yaml                   # CronJob de puntos de restauración consistentes en saasCloudDb
├── terraform/                               # Infraestructura como Código (IaC)
│   ├── MainInfrastructure.tf                # VPC Multi-AZ (3 zonas), llave KMS y Bucket S3 (`saasBackupsPitr`)
│   ├── Variables.tf                         # Variables en camelCase (projectName, awsRegion, availabilityZones)
│   └── Outputs.tf                           # Salidas en camelCase (vpcId, kmsKeyArn, backupBucketName)
├── scripts/                                 # Motor y Scripts Ejecutables en Python 3.14 (en camelCase)
│   ├── ClusterEngine.py                     # Motor del clúster distribuido `saasCloudDb` (3 AZs, 16 Shards, RF=2, RLS, OCC, Failover)
│   ├── SyntheticData.py                     # Generador y cargador de datos sintéticos para las 5.000 organizaciones
│   ├── SynthticData.py                      # Alias directo hacia SyntheticData.py
│   ├── BusinessOperations.py                # Demostración de operaciones críticas y consultas representativas
│   └── TestSuite.py                         # Suite automatizada de 8 pruebas de arquitectura
├── data/                                    # Datos Sintéticos Generados (Columnas en camelCase)
│   ├── TenantsCatalog5000.csv               # Catálogo completo de 5.000 organizaciones (3.750 FREE, 1.100 PRO, 150 ENTERPRISE)
│   ├── Tenants.csv                          # Organizaciones activas cargadas en los shards
│   ├── Users.csv                            # Usuarios por organización
│   ├── Projects.csv                         # Proyectos operativos
│   ├── WorkOrders.csv                       # 1.710 órdenes de trabajo con idempotencyKey y customAttributes
│   ├── Invoices.csv                         # Facturas emitidas
│   └── DatasetSummary.json                  # Resumen estadístico de generación y distribución
└── evidences/                               # Evidencias Reales Verificables de Ejecución
    ├── TestReport.json                      # Reporte completo de las 8 pruebas ejecutadas (100% PASSED)
    ├── TestLog.txt                          # Bitácora con marcas de tiempo
    └── OperationsOutput.txt                 # Salida verificada de las operaciones y consultas
```

---

## 2. Instrucciones Reproducibles de Ejecución

El proyecto se puede ejecutar de dos formas independientes.

### 2.1 Opción A — Simulación del clúster en Python (no requiere Docker)

Desde la carpeta raíz del proyecto (la que contiene `DATA-ARCHITECTURE`):

```powershell
# 1. Generar los datos sinteticos y poblar el cluster saasCloudDb
python DATA-ARCHITECTURE/scripts/SyntheticData.py

# 2. Ejecutar la suite completa de 8 pruebas de arquitectura
python DATA-ARCHITECTURE/scripts/TestSuite.py

# 3. Ejecutar la demostracion de operaciones y consultas representativas
python DATA-ARCHITECTURE/scripts/BusinessOperations.py
```

### 2.2 Opción B — Clúster real PostgreSQL 16 + Citus 12.1 en Docker

Requisito: **Docker Desktop** instalado y abierto. Desde la carpeta `DATA-ARCHITECTURE/docker`:

```powershell
# 1. Levantar los 4 nodos Citus, PgBouncer y Redis (la primera vez descarga las imagenes)
docker compose up -d

# 2. Ver la inicializacion del cluster (registra workers, distribuye tablas, aplica RLS y carga los CSV)
docker compose logs -f clusterInitializer      # termina con "Clúster saasCloudDb listo" (Ctrl+C para salir)

# 3. Demostracion en vivo: topologia, shards por nodo, RLS y aislamiento de un tenant Enterprise al Silo
docker compose exec citusCoordinator psql -U postgres -d saasCloudDb -f /saasSql/ClusterDemo.sql

# 4. Consola SQL interactiva sobre el coordinador
docker compose exec citusCoordinator psql -U postgres -d saasCloudDb

# 5. Apagar el cluster y borrar sus datos (para empezar de cero)
docker compose down -v
```

| Servicio | Puerto en tu PC | Uso |
| :--- | :--- | :--- |
| `citusCoordinator` | `5432` | Conexión directa al coordinador (usuario `postgres`) |
| `pgBouncerPooler` | `6432` | Conexión de la aplicación con *Transaction Pooling* |
| `redisRateLimiter` | `6379` | Control de tasa por `tenantId` |

Contraseña por defecto: `SaasCloudNative2026!` (se puede cambiar con la variable de entorno `POSTGRES_PASSWORD`).
Si ya tenías el puerto `5432` ocupado por otro PostgreSQL local, detenlo o cambia el puerto en `docker-compose.yml`.

**Ajustes hechos al SQL para que funcione sobre Citus real** (documentados con comentarios `NOTA CITUS` en cada archivo):
- `tenants."orgSlug"` ya no es `UNIQUE` global: en Citus toda restricción única debe incluir la columna de distribución `tenantId`.
- La FK `workOrders → tenantUsers` usa `ON DELETE RESTRICT` (Citus no admite `SET NULL` sobre la columna de distribución); los usuarios se desactivan con `isActive`.
- `citus.enable_local_reference_table_foreign_keys = off` al distribuir, para que la FK `tenants → saasPlans` no convierta las tablas en locales.
- `citus.propagate_set_commands = 'local'` para que `app.currentTenantId` llegue a los workers y RLS filtre correctamente.
- La migración *Expand & Contract* hace el *backfill* por lotes de una organización (Citus no admite `FOR UPDATE SKIP LOCKED` entre shards).
- `isolateEnterpriseTenantOnline` abre temporalmente el nodo Silo y mueve el shard con `block_writes`.
