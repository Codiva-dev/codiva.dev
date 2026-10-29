UPDATE deliverables SET body_html = '' WHERE id = '92000001-0001-4000-8000-0000000000d2';
UPDATE deliverables SET body_html = coalesce(body_html,'') || '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kan Club - Arquitectura completa (staff)</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    :root {
      --ink: #1a1a1a;
      --muted: #555;
      --line: #ccc;
      --accent: #1e3d32;
      --bg-soft: #f0f3f1;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0 auto;
      padding: 16px 20px 28px;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: var(--ink);
      font-size: 9.5pt;
      line-height: 1.35;
      max-width: 960px;
    }
    h1 {
      font-size: 16pt;
      color: var(--accent);
      margin: 0 0 4px;
      border-bottom: 2px solid var(--accent);
      padding-bottom: 4px;
    }
    h2 {
      font-size: 11.5pt;
      color: var(--accent);
      margin: 14px 0 6px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 2px;
    }
    h3 { font-size: 10pt; margin: 10px 0 4px; }
    p, li { margin: 3px 0; }
    ol, ul { margin: 4px 0 8px; padding-left: 1.25em; }
    .meta { color: var(--muted); font-size: 8.5pt; margin: 0 0 8px; }
    .staff {
      background: #1e3d32;
      color: #fff;
      display: inline-block;
      padding: 2px 8px;
      font-size: 8pt;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }
    .cover-box {
      background: var(--bg-soft);
      border: 1px solid var(--line);
      padding: 8px 10px;
      mar' WHERE id = '92000001-0001-4000-8000-0000000000d2';
UPDATE deliverables SET body_html = coalesce(body_html,'') || 'gin: 6px 0 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 10px;
      font-size: 8.5pt;
    }
    th, td {
      border: 1px solid var(--line);
      padding: 3px 6px;
      text-align: left;
      vertical-align: top;
    }
    th { background: var(--bg-soft); font-weight: 600; }
    .note { background: #fff8e6; border-left: 3px solid #c9a227; padding: 6px 8px; margin: 6px 0; font-size: 8.5pt; }
    .info { background: #e8f0ec; border-left: 3px solid var(--accent); padding: 6px 8px; margin: 6px 0; font-size: 8.5pt; }
    .mermaid {
      background: #fff;
      border: 1px solid var(--line);
      padding: 4px 6px;
      margin: 6px 0 8px;
      text-align: center;
      overflow: hidden;
    }
    .mermaid svg { max-width: 100% !important; height: auto !important; }
    pre {
      background: var(--bg-soft);
      border: 1px solid var(--line);
      padding: 6px 8px;
      font-size: 8pt;
      white-space: pre-wrap;
      font-family: Consolas, monospace;
    }
    footer {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px solid var(--line);
      font-size: 7.5pt;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="staff">SOLO STAFF CODIVA</div>
  <h1>Kan Club — Arquitectura completa</h1>
  <p class="meta">
    Inventario interno: ADRs, stack Marketplace, offline, integraciones, handoff · 28 oct 2026
  </p>

  <div class="cover-box">
    <strong>Cliente</strong>
    <ul>
      <li>Organización: Kan Club</li>
      <li>Contacto' WHERE id = '92000001-0001-4000-8000-0000000000d2';
UPDATE deliverables SET body_html = coalesce(body_html,'') || ': Luis Vaca · luis.vacavelez@gmail.com</li>
      <li>Slug Ops: <code>kan-club</code></li>
      <li>Repo producto: local <code>Desarrollos/kan-club</code> (sin remoto aún)</li>
    </ul>
  </div>

  <h2>1. ADRs (Aceptados)</h2>
  <table>
    <thead><tr><th>ADR</th><th>Decisión</th><th>Notas build</th></tr></thead>
    <tbody>
      <tr>
        <td>001</td>
        <td>Offline-first PWA · RxDB / IndexedDB</td>
        <td>Write-local-first; sync bidireccional a Neon; POS manda stock (CL-012)</td>
      </tr>
      <tr>
        <td>002</td>
        <td>MP Point async + webhook</td>
        <td>Estado AwaitingPointResponse; fallback Cash/Transfer/link (CL-015)</td>
      </tr>
      <tr>
        <td>003</td>
        <td>Waiver inmutable en Vercel Blob + SHA-256</td>
        <td>Una firma por cliente; PNG + texto + timestamp</td>
      </tr>
      <tr>
        <td>004</td>
        <td>100% Vercel serverless</td>
        <td>Neon + Upstash + Blob; sin Railway</td>
      </tr>
    </tbody>
  </table>

  <h2>2. Stack as-built Codiva</h2>
  <p class="meta">El brief decía «Vercel Postgres / KV»; en 2026 el equivalente Marketplace es Neon + Upstash.</p>
  <table>
    <thead><tr><th>Brief</th><th>As-built</th></tr></thead>
    <tbody>
      <tr><td>Next.js App Router</td><td>Next.js 16 · Fluid Compute / Node</td></tr>
      <tr><td>Vercel Postgres</td><td>Neon Postgres (Marketplace)</td></tr>
      <tr><td>Vercel KV Redis</td><td>Upstash Redis (Marketplace)</td></tr>
      <tr><td>Vercel Blob</td><td>Vercel Blob (waivers)</td></tr>
      <tr' WHERE id = '92000001-0001-4000-8000-0000000000d2';
UPDATE deliverables SET body_html = coalesce(body_html,'') || '><td>BullMQ</td><td>Jobs async vía Redis + route handlers / crons Vercel</td></tr>
    </tbody>
  </table>

  <h2>3. Superficies técnicas</h2>
  <div class="mermaid">
flowchart TB
  subgraph Surfaces
    TAB[tablet PWA]
    WEB[marketing + ecom]
    ADM[admin]
    PORT[portal Mi Mascota]
  end
  subgraph Gateway
    BFF[Next.js Route Handlers]
    MP[MP Point adapter]
    WA[WhatsApp adapter]
  end
  subgraph Data
    PG[(Neon)]
    Redis[(Upstash)]
    Blob[(Blob)]
  end
  Surfaces --> BFF
  BFF --> PG
  BFF --> Redis
  BFF --> Blob
  BFF --> MP
  BFF --> WA
  </div>

  <h2>4. Offline tablet</h2>
  <pre>UI React ←→ RxDB (IndexedDB)
Service Worker (assets)
RxDB Sync ←→ API (cuando online) ←→ Neon</pre>
  <div class="info">Offline permite cash + timers. TPV Point requiere red. Conflictos de stock: in-store gana.</div>

  <h2>5. Secuencia crítica (tienda)</h2>
  <div class="mermaid">
sequenceDiagram
  actor C as Cliente
  actor E as Staff
  participant POS as POS
  participant CRM as CRM
  participant MP as MP Adapter
  participant WA as WhatsApp
  C->>E: Llega con mascota
  E->>POS: Busca por tel/nombre/mascota
  POS->>CRM: Waiver?
  CRM-->>POS: false
  C->>POS: Firma en tablet
  POS->>CRM: Blob + hash
  E->>POS: Fases grooming t0..t3
  POS->>WA: Pet Ready
  WA-->>C: WhatsApp
  E->>POS: SKUs + servicio → ticket
  POS->>MP: Orden Point
  MP-->>POS: Webhook Approved
  POS->>CRM: +1 lealtad · stock
  </div>

  <h2>6. RBAC</h2>
  <table>
    <thead><tr><th>Rol</th><th>Auth</th><th>Superficie</th></tr></thead>
    <t' WHERE id = '92000001-0001-4000-8000-0000000000d2';
UPDATE deliverables SET body_html = coalesce(body_html,'') || 'body>
      <tr><td>Staff</td><td>PIN 4 dígitos</td><td>/tablet</td></tr>
      <tr><td>Admin</td><td>Email + password / magic link</td><td>/admin</td></tr>
      <tr><td>Cliente</td><td>WhatsApp OTP</td><td>/ · /portal</td></tr>
    </tbody>
  </table>

  <h2>7. Clarifications</h2>
  <p>CL-001…027 <strong>cerrados</strong> (cliente, 28 oct). Ver repo local <code>docs/plan/clarification-log.md</code>.</p>

  <h2>8. Handoff humano</h2>
  <ol>
    <li>MP Developer (sandbox + prod Point)</li>
    <li>Hardware Point Smart + scanner + tablet</li>
    <li>WhatsApp Cloud API + template Pet Ready</li>
    <li>Texto Carta Responsiva</li>
    <li>Seed SKUs JSON/CSV</li>
    <li>Wireframes tablet touch-first</li>
  </ol>

  <h2>9. Corte scaffold (28 oct)</h2>
  <ul>
    <li>Docs + ADRs + freeze en <code>Desarrollos/kan-club</code></li>
    <li>Next.js stub: /, /portal, /tablet, /admin, /api/health, webhook MP stub</li>
    <li>Adapters vacíos <code>lib/mercadopago</code> · <code>lib/whatsapp</code></li>
    <li>Sin schema Neon, sin RxDB, sin remoto GitHub/Vercel de producto</li>
  </ul>
  <div class="note">No cotización en este pack — el brief no trae montos. Economics = trabajo aparte si aplica.</div>

  <footer>Kan Club · Arquitectura completa (staff) · Codiva · Freeze 2026-10-28</footer>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "strict" });
  </script>
</body>
</html>
' WHERE id = '92000001-0001-4000-8000-0000000000d2';