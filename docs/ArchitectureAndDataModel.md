# Diagramas de Arquitectura Distribuida y Modelo de Datos (Caso 8: Cloud Native SaaS Multicliente)

Este documento presenta los diagramas técnicos de la base de datos distribuida **`saasCloudDb`** para **5.000 Organizaciones**, utilizando nomenclatura **camelCase** tanto en tablas, columnas y variables como en los componentes del clúster.

---

## 1. Diagrama de Componentes y Arquitectura Distribuida Multi-AZ (`saasCloudDb`)

```mermaid
flowchart TB
    subgraph Clients["5.000 Organizaciones (Patrones de Uso Asimetricos)"]
        TFree["3.750 Orgs Tier FREE (Patron Esporadico)"]
        TPro["1.100 Orgs Tier PRO (Patron Continuo)"]
        TEnt["150 Orgs Tier ENTERPRISE (Clientes Ballena / 24x7)"]
    end

    subgraph Edge["Capa Edge y Control de Trafico Distribuido"]
        ALB["Ingress / AWS ALB Multi-AZ (TLS 1.3)"]
        RL["redisRateLimiter (3 Nodos Multi-AZ)<br/>Token Bucket Rate Limiter & Cache por tenantId"]
    end

    subgraph K8s["Cluster Kubernetes Multi-AZ (Namespace: saas-data-plane)"]
        subgraph Stateless["Capa de Aplicacion Stateless (saasTenantApi + HPA)"]
            API1["Pods saasTenantApi (AZ-1)"]
            API2["Pods saasTenantApi (AZ-2)"]
            API3["Pods saasTenantApi (AZ-3)"]
            CP["Control Plane: provisionTenant & runZeroDowntimeMigration"]
        end

        subgraph Pooler["Capa de Multiplexacion de Conexiones"]
            PGB1["pgBouncerPooler (AZ-1)"]
            PGB2["pgBouncerPooler (AZ-2)"]
            PGB3["pgBouncerPooler (AZ-3)"]
        end

        subgraph DataPlane["Plano de Datos Distribuido: saasCloudDb (PostgreSQL 16 + Citus 12.1)"]
            COORD["citusCoordinator HA<br/>Primario (AZ-1) + Standby (AZ-2)"]

            subgraph AZ1["Zona de Disponibilidad 1 (us-east-1a)"]
                W1["nodeAz1Pool (Pool Multi-Tenant)<br/>Shards Par Primarios + pgDataPvc 500GB"]
                W2_REP["Replica Sincrona Shards Impar"]
            end

            subgraph AZ2["Zona de Disponibilidad 2 (us-east-1b)"]
                W2["nodeAz2Pool (Pool Multi-Tenant)<br/>Shards Impar Primarios + pgDataPvc 500GB"]
                W1_REP["Replica Sincrona Shards Par"]
            end

            subgraph AZ3["Zona de Disponibilidad 3 (us-east-1c - Nodos Silo)"]
                W3["nodeAz3Silo (Silo Enterprise Dedicado)<br/>Shards Aislados para Tenants Ballena + pgDataPvc 2TB"]
                W3_REP["Replica Sincrona Cruzada"]
            end
        end
    end

    subgraph Storage["Respaldo, Cifrado y Observabilidad"]
        S3["Bucket S3 saasBackupsPitr<br/>WAL Archiving Continuo + Snapshots PITR (RPO <= 60s)"]
        KMS["AWS KMS saasDataEncryptionKey (AES-256)"]
        OBS["Prometheus + Grafana<br/>Metricas por tenantId y por shardId"]
    end

    Clients --> ALB
    ALB --> API1 & API2 & API3
    API1 & API2 & API3 <--> RL
    API1 --> PGB1
    API2 --> PGB2
    API3 --> PGB3
    CP --> COORD
    PGB1 & PGB2 & PGB3 --> COORD
    COORD --> W1 & W2 & W3
    W1 -.->|"Streaming Replication (RF=2)"| W1_REP
    W2 -.->|"Streaming Replication (RF=2)"| W2_REP
    W1 & W2 & W3 -->|"Envio continuo WAL"| S3
    KMS -.->|"Cifra PVCs y S3"| DataPlane
    DataPlane -.-> OBS
```

---

## 2. Diagrama del Modelo de Datos Explícito en camelCase (Co-localizado por `tenantId`)

Todas las tablas operativas de **`saasCloudDb`** incluyen `tenantId` como columna de distribución y primera parte de su clave primaria compuesta ([`sql/DataModel.sql`](../sql/DataModel.sql)).

```mermaid
erDiagram
    saasPlans ||--o{ tenants : "define cuotas (Reference Table Replicada)"
    tenants ||--o{ tenantUsers : "co-localizada por tenantId"
    tenants ||--o{ projects : "co-localizada por tenantId"
    tenants ||--o{ auditEvents : "co-localizada por tenantId"
    projects ||--o{ workOrders : "FK compuesta (tenantId, projectId)"
    tenantUsers ||--o{ workOrders : "FK compuesta (tenantId, assignedUserId)"
    workOrders ||--o{ invoices : "FK compuesta (tenantId, orderId)"

    saasPlans {
        varchar planCode PK "FREE | PRO | ENTERPRISE"
        varchar planName
        varchar isolationStrategy "POOL | BRIDGE | SILO"
        int maxUsers
        int maxRequestsPerSec
        int storageQuotaGb
        numeric monthlyPriceUsd
    }

    tenants {
        uuid tenantId PK "Clave de Particion (Shard Key)"
        varchar orgSlug UK
        varchar orgName
        varchar planCode FK
        varchar isolationMode "POOL o SILO"
        bigint dedicatedShardId "Nullable"
        varchar status "ACTIVE | SUSPENDED"
        int rateLimitRps
        int maxDbConnections
        int schemaVersion
        jsonb settings
        int version "OCC Control"
        timestamptz createdAt
    }

    tenantUsers {
        uuid tenantId PK, FK "Shard Key + RLS"
        uuid userId PK
        varchar email "UK compuesta (tenantId, email)"
        varchar fullName
        varchar role "OWNER | ADMIN | OPERATOR | VIEWER"
        boolean isActive
        boolean mfaEnabled
        jsonb customAttributes "Extensible por cliente"
        int version "OCC Control"
    }

    projects {
        uuid tenantId PK, FK "Shard Key + RLS"
        uuid projectId PK
        varchar projectCode "UK (tenantId, projectCode)"
        varchar name
        numeric budgetAllocated "CHECK >= 0"
        numeric budgetConsumed "CHECK <= budgetAllocated"
        varchar status
        jsonb customAttributes
        int version "OCC Control"
    }

    workOrders {
        uuid tenantId PK, FK "Shard Key + RLS"
        uuid orderId PK
        uuid projectId FK
        uuid assignedUserId FK
        varchar idempotencyKey "UK (tenantId, idempotencyKey)"
        varchar title
        varchar priority "LOW | MEDIUM | HIGH | CRITICAL"
        varchar status "PENDING | IN_PROGRESS | COMPLETED"
        numeric amountUsd "CHECK >= 0"
        jsonb customAttributes "Indice GIN"
        int version "OCC Control"
        timestamptz createdAt
        timestamptz slaDeadlineAt "Agregada en Migracion v2.0"
    }

    invoices {
        uuid tenantId PK, FK "Shard Key + RLS"
        uuid invoiceId PK
        uuid orderId FK
        varchar idempotencyKey "UK (tenantId, idempotencyKey)"
        varchar invoiceNumber "UK (tenantId, invoiceNumber)"
        numeric subtotalUsd
        numeric taxUsd
        numeric totalUsd "CHECK totalUsd = subtotalUsd + taxUsd"
        varchar paymentStatus "UNPAID | PAID | VOID"
        int version
    }

    auditEvents {
        uuid tenantId PK, FK "Shard Key + RLS"
        uuid eventId PK
        timestamptz createdAt PK
        varchar eventType
        varchar entityName
        varchar entityId
        jsonb payload
    }
```

---

## 3. Diagrama de Secuencia: Protección contra *Noisy Neighbor* y Aislamiento RLS

```mermaid
sequenceDiagram
    autonumber
    participant Noisy as Tenant Ruidoso (Rafaga 500 RPS)
    participant Normal as Tenant Normal (Operacion Critica)
    participant API as Pod saasTenantApi
    participant Redis as redisRateLimiter (Token Bucket)
    participant PgB as pgBouncerPooler
    participant Citus as Nodo Worker saasCloudDb (RLS Activo)

    Noisy->>API: POST /api/v2/workOrders (Rafaga masiva)
    API->>Redis: allowRequest(noisyTenantId, rateRps=25)
    Redis-->>API: 0 tokens disponibles (Cuota agotada)
    API-->>Noisy: HTTP 429 Too Many Requests (Rechazado en < 1 ms)

    Normal->>API: POST /api/v2/workOrders (idempotencyKey: idem-9901)
    API->>Redis: allowRequest(normalTenantId, rateRps=150)
    Redis-->>API: Token concedido
    API->>PgB: Solicita conexion del Pool Transaccional
    PgB->>Citus: BEGIN; SET LOCAL ROLE saasAppRuntime; SET LOCAL app.currentTenantId = 'normalTenantId';
    Citus->>Citus: Verifica Politica RLS (tenantId == currentAppTenantId())
    Citus->>Citus: Verifica UNIQUE (tenantId, idempotencyKey) y CHECK (budgetConsumed <= budgetAllocated)
    Citus-->>PgB: COMMIT exitoso (Replica Sincrona confirmada en otra AZ)
    PgB-->>API: Resultado transaccional (latencia p95 < 8 ms)
    API-->>Normal: HTTP 201 Created
```
