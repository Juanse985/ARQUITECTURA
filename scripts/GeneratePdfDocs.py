"""
===============================================================================
ARCHIVO: scripts/GeneratePdfDocs.py
PROPOSITO: Generar la documentacion tecnica completa en formato PDF de alta
calidad editorial (con tablas estilizadas, bloques de codigo y diagramas SVG
vectoriales incrustados) usando Microsoft Edge Headless.
===============================================================================
"""

from __future__ import annotations

import html
import re
import subprocess
from pathlib import Path
from typing import List, Tuple

baseDir = Path(__file__).resolve().parent.parent
docsDir = baseDir / "docs"
pdfDir = docsDir / "pdf"
edgePath = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")


ARCHITECTURE_SVG = """
<div class="diagram-box">
  <div class="diagram-title">Diagrama 1: Arquitectura Distribuida Cloud Native Multi-AZ (saasCloudDb)</div>
  <svg viewBox="0 0 920 520" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
      </marker>
    </defs>
    <!-- Background -->
    <rect x="5" y="5" width="910" height="510" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>

    <!-- Clients Tier -->
    <rect x="25" y="20" width="870" height="65" rx="8" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
    <text x="460" y="38" text-anchor="middle" font-size="13" font-weight="bold" fill="#0369a1">5.000 ORGANIZACIONES CLIENTES (Patrones de Uso Asimetricos)</text>
    <rect x="50" y="46" width="240" height="30" rx="5" fill="#ffffff" stroke="#0284c7"/>
    <text x="170" y="65" text-anchor="middle" font-size="11" fill="#0f172a">3.750 Orgs FREE (75% - Pool)</text>
    <rect x="340" y="46" width="240" height="30" rx="5" fill="#ffffff" stroke="#0284c7"/>
    <text x="460" y="65" text-anchor="middle" font-size="11" fill="#0f172a">1.100 Orgs PRO (22% - Pool)</text>
    <rect x="630" y="46" width="240" height="30" rx="5" fill="#fef3c7" stroke="#d97706"/>
    <text x="750" y="65" text-anchor="middle" font-size="11" font-weight="bold" fill="#92400e">150 Orgs ENTERPRISE (3% - Silo)</text>

    <!-- Edge & Stateless K8s Tier -->
    <rect x="25" y="105" width="870" height="90" rx="8" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/>
    <text x="460" y="123" text-anchor="middle" font-size="12" font-weight="bold" fill="#334155">CAPA DE APLICACION Y CONTROL DE TRAFICO EN KUBERNETES (3 Zonas de Disponibilidad)</text>

    <rect x="45" y="135" width="250" height="48" rx="6" fill="#fef2f2" stroke="#dc2626"/>
    <text x="170" y="155" text-anchor="middle" font-size="11" font-weight="bold" fill="#991b1b">redisRateLimiter (3 Nodos Multi-AZ)</text>
    <text x="170" y="172" text-anchor="middle" font-size="10" fill="#7f1d1d">Token Bucket por tenantId (Anti-Noisy Neighbor)</text>

    <rect x="335" y="135" width="250" height="48" rx="6" fill="#ecfdf5" stroke="#059669"/>
    <text x="460" y="155" text-anchor="middle" font-size="11" font-weight="bold" fill="#065f46">Pods saasTenantApi (HPA 6..40)</text>
    <text x="460" y="172" text-anchor="middle" font-size="10" fill="#047857">RollingUpdate (maxUnavailable=0) + Control Plane</text>

    <rect x="625" y="135" width="250" height="48" rx="6" fill="#eff6ff" stroke="#2563eb"/>
    <text x="750" y="155" text-anchor="middle" font-size="11" font-weight="bold" fill="#1e40af">pgBouncerPooler (Transaction Mode)</text>
    <text x="750" y="172" text-anchor="middle" font-size="10" fill="#1d4ed8">5.000 Conns Clientes -&gt; 80 Conns DB</text>

    <!-- Coordinator -->
    <rect x="290" y="212" width="340" height="46" rx="6" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.5"/>
    <text x="460" y="232" text-anchor="middle" font-size="12" font-weight="bold" fill="#5b21b6">citusCoordinator HA (Primario AZ-1 + Standby AZ-2)</text>
    <text x="460" y="248" text-anchor="middle" font-size="10" fill="#4c1d95">Ruteo por Hash(tenantId) + RLS Context (app.currentTenantId)</text>

    <!-- Data Plane 3 AZs -->
    <rect x="25" y="275" width="275" height="150" rx="8" fill="#ffffff" stroke="#0284c7" stroke-width="1.8"/>
    <text x="162" y="295" text-anchor="middle" font-size="12" font-weight="bold" fill="#0369a1">ZONA AZ-1 (us-east-1a)</text>
    <rect x="40" y="305" width="245" height="50" rx="5" fill="#e0f2fe" stroke="#0284c7"/>
    <text x="162" y="325" text-anchor="middle" font-size="11" font-weight="bold" fill="#0c4a6e">nodeAz1Pool (Worker Primario)</text>
    <text x="162" y="342" text-anchor="middle" font-size="10" fill="#0369a1">Shards Pares + PVC SSD gp3 500GB</text>
    <rect x="40" y="363" width="245" height="48" rx="5" fill="#f1f5f9" stroke="#64748b" stroke-dasharray="4"/>
    <text x="162" y="383" text-anchor="middle" font-size="11" font-weight="bold" fill="#334155">Replica Sincrona de AZ-2</text>
    <text x="162" y="399" text-anchor="middle" font-size="10" fill="#475569">Failover Automatico (RPO=0)</text>

    <rect x="322" y="275" width="275" height="150" rx="8" fill="#ffffff" stroke="#0284c7" stroke-width="1.8"/>
    <text x="460" y="295" text-anchor="middle" font-size="12" font-weight="bold" fill="#0369a1">ZONA AZ-2 (us-east-1b)</text>
    <rect x="337" y="305" width="245" height="50" rx="5" fill="#e0f2fe" stroke="#0284c7"/>
    <text x="460" y="325" text-anchor="middle" font-size="11" font-weight="bold" fill="#0c4a6e">nodeAz2Pool (Worker Primario)</text>
    <text x="460" y="342" text-anchor="middle" font-size="10" fill="#0369a1">Shards Impares + PVC SSD gp3 500GB</text>
    <rect x="337" y="363" width="245" height="48" rx="5" fill="#f1f5f9" stroke="#64748b" stroke-dasharray="4"/>
    <text x="460" y="383" text-anchor="middle" font-size="11" font-weight="bold" fill="#334155">Replica Sincrona de AZ-1</text>
    <text x="460" y="399" text-anchor="middle" font-size="10" fill="#475569">Failover Automatico (RPO=0)</text>

    <rect x="620" y="275" width="275" height="150" rx="8" fill="#fffbeb" stroke="#d97706" stroke-width="1.8"/>
    <text x="757" y="295" text-anchor="middle" font-size="12" font-weight="bold" fill="#b45309">ZONA AZ-3 (us-east-1c - SILO)</text>
    <rect x="635" y="305" width="245" height="50" rx="5" fill="#fef3c7" stroke="#d97706"/>
    <text x="757" y="325" text-anchor="middle" font-size="11" font-weight="bold" fill="#92400e">nodeAz3Silo (Worker Dedicado)</text>
    <text x="757" y="342" text-anchor="middle" font-size="10" fill="#b45309">Shards Exclusivos Tenants Ballena + 2TB</text>
    <rect x="635" y="363" width="245" height="48" rx="5" fill="#f1f5f9" stroke="#64748b" stroke-dasharray="4"/>
    <text x="757" y="383" text-anchor="middle" font-size="11" font-weight="bold" fill="#334155">Aislamiento Online (Zero-Downtime)</text>
    <text x="757" y="399" text-anchor="middle" font-size="10" fill="#475569">isolateEnterpriseTenantOnline()</text>

    <!-- Storage & Security Footer -->
    <rect x="25" y="442" width="870" height="55" rx="8" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5"/>
    <text x="460" y="463" text-anchor="middle" font-size="12" font-weight="bold" fill="#166534">SEGURIDAD, RESPALDO CONTINUO Y OBSERVABILIDAD</text>
    <text x="460" y="483" text-anchor="middle" font-size="11" fill="#14532d">S3 Bucket Inmutable (saasBackupsPitr - RPO &lt;= 60s)  |  AWS KMS AES-256  |  FORCE ROW LEVEL SECURITY  |  Prometheus &amp; Grafana</text>
  </svg>
</div>
"""

DATA_MODEL_SVG = """
<div class="diagram-box">
  <div class="diagram-title">Diagrama 2: Modelo Entidad-Relacion Explicito Co-localizado por tenantId (saasCloudDb)</div>
  <svg viewBox="0 0 920 430" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif">
    <rect x="5" y="5" width="910" height="420" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>

    <!-- saasPlans -->
    <rect x="25" y="25" width="240" height="145" rx="6" fill="#fef3c7" stroke="#d97706" stroke-width="1.5"/>
    <rect x="25" y="25" width="240" height="28" rx="6" fill="#d97706"/>
    <text x="145" y="44" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">saasPlans (Reference Table)</text>
    <text x="35" y="70" font-size="11" font-weight="bold" fill="#92400e">PK  planCode (FREE|PRO|ENTERPRISE)</text>
    <text x="35" y="88" font-size="11" fill="#1e293b">    planName VARCHAR(100)</text>
    <text x="35" y="106" font-size="11" fill="#1e293b">    isolationStrategy (POOL|SILO)</text>
    <text x="35" y="124" font-size="11" fill="#1e293b">    maxRequestsPerSec INT</text>
    <text x="35" y="142" font-size="11" fill="#1e293b">    storageQuotaGb INT</text>
    <text x="35" y="160" font-size="11" fill="#1e293b">    monthlyPriceUsd NUMERIC(10,2)</text>

    <!-- tenants -->
    <rect x="330" y="25" width="260" height="165" rx="6" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.5"/>
    <rect x="330" y="25" width="260" height="28" rx="6" fill="#0284c7"/>
    <text x="460" y="44" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">tenants (Shard Root Table)</text>
    <text x="340" y="70" font-size="11" font-weight="bold" fill="#0369a1">PK  tenantId UUID (Shard Key)</text>
    <text x="340" y="88" font-size="11" fill="#1e293b">UK  orgSlug VARCHAR(80)</text>
    <text x="340" y="106" font-size="11" fill="#1e293b">FK  planCode -&gt; saasPlans</text>
    <text x="340" y="124" font-size="11" fill="#1e293b">    isolationMode (POOL | SILO)</text>
    <text x="340" y="142" font-size="11" fill="#1e293b">    rateLimitRps INT / schemaVersion INT</text>
    <text x="340" y="160" font-size="11" fill="#1e293b">    settings JSONB / version INT (OCC)</text>
    <text x="340" y="178" font-size="11" fill="#1e293b">    createdAt TIMESTAMPTZ</text>

    <!-- auditEvents -->
    <rect x="650" y="25" width="245" height="145" rx="6" fill="#f1f5f9" stroke="#475569" stroke-width="1.5"/>
    <rect x="650" y="25" width="245" height="28" rx="6" fill="#475569"/>
    <text x="772" y="44" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">auditEvents (Append-Only RLS)</text>
    <text x="660" y="70" font-size="11" font-weight="bold" fill="#334155">PK  (tenantId, eventId, createdAt)</text>
    <text x="660" y="88" font-size="11" fill="#1e293b">    eventType VARCHAR(64)</text>
    <text x="660" y="106" font-size="11" fill="#1e293b">    entityName VARCHAR(64)</text>
    <text x="660" y="124" font-size="11" fill="#1e293b">    entityId VARCHAR(64)</text>
    <text x="660" y="142" font-size="11" fill="#1e293b">    payload JSONB</text>

    <!-- tenantUsers -->
    <rect x="25" y="230" width="240" height="170" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="1.5"/>
    <rect x="25" y="230" width="240" height="28" rx="6" fill="#0369a1"/>
    <text x="145" y="249" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">tenantUsers (Co-located + RLS)</text>
    <text x="35" y="275" font-size="11" font-weight="bold" fill="#0369a1">PK  (tenantId, userId)</text>
    <text x="35" y="293" font-size="11" fill="#1e293b">UK  (tenantId, email)</text>
    <text x="35" y="311" font-size="11" fill="#1e293b">    fullName VARCHAR(150)</text>
    <text x="35" y="329" font-size="11" fill="#1e293b">    role (OWNER|ADMIN|OPERATOR)</text>
    <text x="35" y="347" font-size="11" fill="#1e293b">    mfaEnabled BOOLEAN</text>
    <text x="35" y="365" font-size="11" fill="#1e293b">    customAttributes JSONB</text>
    <text x="35" y="383" font-size="11" fill="#1e293b">    version INT (OCC)</text>

    <!-- projects -->
    <rect x="285" y="230" width="220" height="170" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="1.5"/>
    <rect x="285" y="230" width="220" height="28" rx="6" fill="#0369a1"/>
    <text x="395" y="249" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">projects (Co-located + RLS)</text>
    <text x="295" y="275" font-size="11" font-weight="bold" fill="#0369a1">PK  (tenantId, projectId)</text>
    <text x="295" y="293" font-size="11" fill="#1e293b">UK  (tenantId, projectCode)</text>
    <text x="295" y="311" font-size="11" fill="#1e293b">    budgetAllocated NUMERIC</text>
    <text x="295" y="329" font-size="11" font-weight="bold" fill="#dc2626">    budgetConsumed &lt;= Allocated</text>
    <text x="295" y="347" font-size="11" fill="#1e293b">    status VARCHAR(25)</text>
    <text x="295" y="365" font-size="11" fill="#1e293b">    customAttributes JSONB</text>
    <text x="295" y="383" font-size="11" fill="#1e293b">    version INT (OCC)</text>

    <!-- workOrders -->
    <rect x="525" y="230" width="200" height="170" rx="6" fill="#ecfdf5" stroke="#059669" stroke-width="1.5"/>
    <rect x="525" y="230" width="200" height="28" rx="6" fill="#059669"/>
    <text x="625" y="249" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">workOrders (Co-located + RLS)</text>
    <text x="535" y="275" font-size="11" font-weight="bold" fill="#065f46">PK  (tenantId, orderId)</text>
    <text x="535" y="293" font-size="11" font-weight="bold" fill="#047857">UK  (tenantId, idempotencyKey)</text>
    <text x="535" y="311" font-size="11" fill="#1e293b">FK  (tenantId, projectId)</text>
    <text x="535" y="329" font-size="11" fill="#1e293b">    priority / status / amountUsd</text>
    <text x="535" y="347" font-size="11" fill="#1e293b">    customAttributes JSONB (GIN)</text>
    <text x="535" y="365" font-size="11" font-weight="bold" fill="#b45309">    version INT (OCC Lock)</text>
    <text x="535" y="383" font-size="11" fill="#1e293b">    slaDeadlineAt TIMESTAMPTZ</text>

    <!-- invoices -->
    <rect x="740" y="230" width="160" height="170" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="1.5"/>
    <rect x="740" y="230" width="160" height="28" rx="6" fill="#0369a1"/>
    <text x="820" y="249" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">invoices (Co-located)</text>
    <text x="748" y="275" font-size="11" font-weight="bold" fill="#0369a1">PK (tenantId, invoiceId)</text>
    <text x="748" y="293" font-size="11" fill="#1e293b">UK (tenantId, idempKey)</text>
    <text x="748" y="311" font-size="11" fill="#1e293b">FK (tenantId, orderId)</text>
    <text x="748" y="329" font-size="11" fill="#1e293b">   subtotalUsd / taxUsd</text>
    <text x="748" y="347" font-size="11" font-weight="bold" fill="#dc2626">   total = sub + tax</text>
    <text x="748" y="365" font-size="11" fill="#1e293b">   paymentStatus</text>
    <text x="748" y="383" font-size="11" fill="#1e293b">   version INT</text>
  </svg>
</div>
"""


def markdownToHtmlBody(mdText: str, includeDiagrams: bool = False) -> str:
    lines = mdText.splitlines()
    htmlOut: List[str] = []
    inCodeBlock = False
    codeLang = ""
    codeBuffer: List[str] = []
    inTable = False
    tableRows: List[List[str]] = []
    inList = False

    def flushList() -> None:
        nonlocal inList
        if inList:
            htmlOut.append("</ul>")
            inList = False

    def flushTable() -> None:
        nonlocal inTable, tableRows
        if not inTable or not tableRows:
            return
        htmlOut.append("<table>")
        headers = tableRows[0]
        htmlOut.append("<thead><tr>")
        for h in headers:
            htmlOut.append(f"<th>{formatInline(h.strip())}</th>")
        htmlOut.append("</tr></thead><tbody>")
        for r in tableRows[1:]:
            if all(set(c.strip()) <= set("-: ") for c in r):
                continue
            htmlOut.append("<tr>")
            for c in r:
                htmlOut.append(f"<td>{formatInline(c.strip())}</td>")
            htmlOut.append("</tr>")
        htmlOut.append("</tbody></table>")
        inTable = False
        tableRows = []

    def formatInline(text: str) -> str:
        text = text.replace(r"\$", "$")
        text = html.escape(text)
        # Bold
        text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
        # Italic
        text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
        # Inline code
        text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
        # Links [label](url) -> strong label
        text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"<span class='doc-link'>\1</span>", text)
        return text

    diagramInjectedCount = 0

    for line in lines:
        if line.strip().startswith("```"):
            flushList()
            flushTable()
            if not inCodeBlock:
                inCodeBlock = True
                codeLang = line.strip()[3:].strip()
                codeBuffer = []
            else:
                inCodeBlock = False
                if codeLang == "mermaid":
                    diagramInjectedCount += 1
                    if diagramInjectedCount == 1:
                        htmlOut.append(ARCHITECTURE_SVG)
                    elif diagramInjectedCount == 2:
                        htmlOut.append(DATA_MODEL_SVG)
                    else:
                        codeEscaped = html.escape("\n".join(codeBuffer))
                        htmlOut.append(f"<pre class='mermaid-code'><code>{codeEscaped}</code></pre>")
                else:
                    codeEscaped = html.escape("\n".join(codeBuffer))
                    htmlOut.append(f"<pre><code>{codeEscaped}</code></pre>")
            continue

        if inCodeBlock:
            codeBuffer.append(line)
            continue

        stripped = line.strip()
        if not stripped:
            flushList()
            flushTable()
            continue

        if stripped.startswith("|") and stripped.endswith("|"):
            flushList()
            inTable = True
            cells = [c for c in stripped.strip("|").split("|")]
            tableRows.append(cells)
            continue
        else:
            flushTable()

        if stripped == "---":
            flushList()
            htmlOut.append("<hr/>")
            continue

        if stripped.startswith("# "):
            flushList()
            htmlOut.append(f"<h1>{formatInline(stripped[2:])}</h1>")
        elif stripped.startswith("## "):
            flushList()
            htmlOut.append(f"<h2>{formatInline(stripped[3:])}</h2>")
        elif stripped.startswith("### "):
            flushList()
            htmlOut.append(f"<h3>{formatInline(stripped[4:])}</h3>")
        elif stripped.startswith("> "):
            flushList()
            htmlOut.append(f"<blockquote>{formatInline(stripped[2:])}</blockquote>")
        elif stripped.startswith("- ") or stripped.startswith("* "):
            if not inList:
                htmlOut.append("<ul>")
                inList = True
            htmlOut.append(f"<li>{formatInline(stripped[2:])}</li>")
        elif re.match(r"^\d+\.\s+", stripped):
            if not inList:
                htmlOut.append("<ul>")
                inList = True
            content = re.sub(r"^\d+\.\s+", "", stripped)
            htmlOut.append(f"<li>{formatInline(content)}</li>")
        else:
            flushList()
            htmlOut.append(f"<p>{formatInline(stripped)}</p>")

    flushList()
    flushTable()
    if includeDiagrams and diagramInjectedCount == 0:
        htmlOut.append(ARCHITECTURE_SVG)
        htmlOut.append(DATA_MODEL_SVG)
    return "\n".join(htmlOut)


def wrapHtmlDocument(title: str, subtitle: str, bodyHtml: str, includeCover: bool = False) -> str:
    coverHtml = ""
    if includeCover:
        coverHtml = f"""
        <div class="cover-page">
            <div class="cover-badge">CORPORACION UNIVERSITARIA MINUTO DE DIOS — UNIMINUTO</div>
            <div class="cover-faculty">ESCUELA DE INGENIERIA • PROGRAMA DE INGENIERIA DE SISTEMAS</div>
            <div class="cover-course">ARQUITECTURA DE DATOS — TALLER PRACTICO NoSQL &amp; DISTRIBUIDO</div>
            <div class="cover-title">{html.escape(title)}</div>
            <div class="cover-subtitle">{html.escape(subtitle)}</div>
            <div class="cover-meta">
                <table>
                    <tr><th>Caso de Estudio</th><td>Caso 8 — Cloud Native: Plataforma SaaS Multicliente (5.000 Organizaciones)</td></tr>
                    <tr><th>Base de Datos Distribuida</th><td><code>saasCloudDb</code> (PostgreSQL 16 + Citus 12.1 + PgBouncer + Redis Cluster)</td></tr>
                    <tr><th>Orquestacion e IaC</th><td>Kubernetes Multi-AZ (StatefulSets, HPA, PDB, NetworkPolicy) + Docker + Terraform</td></tr>
                    <tr><th>Estandar de Codigo</th><td>Nomenclatura <code>camelCase</code> (SyntheticData.py, ClusterEngine.py, TestSuite.py)</td></tr>
                    <tr><th>Resultado de Pruebas</th><td>8 / 8 Pruebas Ejecutadas y Verificadas (100% PASSED)</td></tr>
                </table>
            </div>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>{html.escape(title)}</title>
<style>
  @page {{
    size: A4;
    margin: 16mm 15mm 16mm 15mm;
  }}
  body {{
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.48;
    color: #1e293b;
    margin: 0;
    padding: 0;
  }}
  .cover-page {{
    page-break-after: always;
    padding: 35px 25px;
    border: 2px solid #0284c7;
    border-radius: 12px;
    background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);
    margin-bottom: 20px;
  }}
  .cover-badge {{
    font-size: 11pt;
    font-weight: 700;
    color: #0369a1;
    letter-spacing: 0.8px;
    margin-bottom: 6px;
  }}
  .cover-faculty {{
    font-size: 10pt;
    color: #475569;
    font-weight: 600;
    margin-bottom: 4px;
  }}
  .cover-course {{
    font-size: 10pt;
    color: #0284c7;
    font-weight: 700;
    margin-bottom: 28px;
  }}
  .cover-title {{
    font-size: 22pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    margin-bottom: 12px;
  }}
  .cover-subtitle {{
    font-size: 12.5pt;
    color: #334155;
    margin-bottom: 30px;
  }}
  .cover-meta table {{
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
  }}
  .cover-meta th {{
    width: 32%;
    background: #e0f2fe;
    color: #0c4a6e;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #bae6fd;
  }}
  .cover-meta td {{
    background: #ffffff;
    padding: 8px 10px;
    border: 1px solid #bae6fd;
  }}
  h1 {{
    font-size: 16pt;
    color: #0c4a6e;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 5px;
    margin-top: 22px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }}
  h2 {{
    font-size: 13pt;
    color: #0369a1;
    margin-top: 18px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }}
  h3 {{
    font-size: 11pt;
    color: #1e40af;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }}
  p, li {{
    margin-top: 4px;
    margin-bottom: 5px;
  }}
  ul {{
    margin-top: 4px;
    margin-bottom: 8px;
    padding-left: 20px;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
    font-size: 9.2pt;
    page-break-inside: avoid;
  }}
  th {{
    background-color: #0284c7;
    color: #ffffff;
    font-weight: 600;
    text-align: left;
    padding: 6px 8px;
    border: 1px solid #0369a1;
  }}
  td {{
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    vertical-align: top;
  }}
  tr:nth-child(even) td {{
    background-color: #f8fafc;
  }}
  code {{
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9pt;
    background-color: #f1f5f9;
    color: #0f172a;
    padding: 1px 4px;
    border-radius: 3px;
    border: 1px solid #e2e8f0;
  }}
  pre {{
    background-color: #0f172a;
    color: #f8fafc;
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 8.5pt;
    overflow-x: auto;
    line-height: 1.35;
    margin: 8px 0 12px 0;
    page-break-inside: avoid;
  }}
  pre code {{
    background: transparent;
    color: #f8fafc;
    border: none;
    padding: 0;
  }}
  blockquote {{
    margin: 10px 0;
    padding: 8px 12px;
    background-color: #f0f9ff;
    border-left: 4px solid #0284c7;
    color: #0c4a6e;
    border-radius: 4px;
  }}
  hr {{
    border: none;
    border-top: 1px solid #cbd5e1;
    margin: 16px 0;
  }}
  .diagram-box {{
    margin: 14px 0;
    padding: 10px;
    background: #ffffff;
    border: 1px solid #94a3b8;
    border-radius: 8px;
    page-break-inside: avoid;
  }}
  .diagram-title {{
    font-size: 10.5pt;
    font-weight: 700;
    color: #0f172a;
    text-align: center;
    margin-bottom: 8px;
  }}
  .doc-link {{
    color: #0284c7;
    font-weight: 600;
  }}
  .section-divider {{
    page-break-before: always;
  }}
</style>
</head>
<body>
{coverHtml}
{bodyHtml}
</body>
</html>
"""


def renderHtmlToPdf(htmlPath: Path, pdfPath: Path) -> None:
    pdfPath.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(edgePath),
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdfPath}",
        htmlPath.resolve().as_uri(),
    ]
    subprocess.run(cmd, check=True, timeout=60)


def generateAllPdfs() -> List[Path]:
    pdfDir.mkdir(parents=True, exist_ok=True)
    tempHtmlDir = pdfDir / "_tmp_html"
    tempHtmlDir.mkdir(parents=True, exist_ok=True)

    docsToConvert: List[Tuple[str, str, str, bool]] = [
        (
            "TechnicalReport.md",
            "TechnicalReport.pdf",
            "Informe Tecnico: Arquitectura Cloud Native (Caso 8)",
            True,
        ),
        (
            "ArchitectureAndDataModel.md",
            "ArchitectureAndDataModel.pdf",
            "Diagramas de Arquitectura Multi-AZ y Modelo de Datos (saasCloudDb)",
            False,
        ),
        (
            "TestResultsReport.md",
            "TestResultsReport.pdf",
            "Informe de Pruebas y Resultados Verificables (saasCloudDb)",
            False,
        ),
        (
            "SecurityRecoveryAndCosts.md",
            "SecurityRecoveryAndCosts.pdf",
            "Plan de Seguridad, Recuperacion (RPO/RTO), Costos y Roles",
            False,
        ),
        (
            "PresentationGuide.md",
            "PresentationGuide.pdf",
            "Guia de Sustentacion del Equipo (Caso 8: Cloud Native)",
            False,
        ),
    ]

    generatedPdfs: List[Path] = []
    combinedHtmlSections: List[str] = []

    for idx, (mdFile, pdfFile, docTitle, includeDiag) in enumerate(docsToConvert):
        mdContent = (docsDir / mdFile).read_text(encoding="utf-8")
        bodyHtml = markdownToHtmlBody(mdContent, includeDiagrams=includeDiag)
        if idx > 0:
            combinedHtmlSections.append(f"<div class='section-divider'>{bodyHtml}</div>")
        else:
            combinedHtmlSections.append(bodyHtml)

        fullHtml = wrapHtmlDocument(
            title=docTitle,
            subtitle="Caso 8 — Cloud Native: Plataforma SaaS Multicliente para 5.000 Organizaciones",
            bodyHtml=bodyHtml,
            includeCover=(idx == 0),
        )
        htmlFile = tempHtmlDir / f"{Path(pdfFile).stem}.html"
        htmlFile.write_text(fullHtml, encoding="utf-8")

        targetPdf = pdfDir / pdfFile
        renderHtmlToPdf(htmlFile, targetPdf)
        generatedPdfs.append(targetPdf)

    # Crear el PDF Maestro Consolidado con todos los entregables (A-K + Diagramas + Pruebas + Costos + Sustentación)
    masterHtml = wrapHtmlDocument(
        title="Documentacion Tecnica Completa — Arquitectura Cloud Native (Caso 8)",
        subtitle="Informe Tecnico (A-K), Diagramas de Arquitectura y Modelo de Datos, Informe de Pruebas, Plan de Seguridad/Costos y Guia de Sustentacion",
        bodyHtml="\n".join(combinedHtmlSections),
        includeCover=True,
    )
    masterHtmlFile = tempHtmlDir / "MasterCompleteDocumentation.html"
    masterHtmlFile.write_text(masterHtml, encoding="utf-8")

    masterPdfPath = docsDir / "CloudNativeDocumentationComplete.pdf"
    renderHtmlToPdf(masterHtmlFile, masterPdfPath)
    generatedPdfs.append(masterPdfPath)

    # Limpiar carpeta temporal HTML
    for f in tempHtmlDir.glob("*"):
        f.unlink()
    tempHtmlDir.rmdir()

    return generatedPdfs


if __name__ == "__main__":
    pdfs = generateAllPdfs()
    for p in pdfs:
        print(f"[PDF GENERADO] {p} ({p.stat().st_size} bytes)")
