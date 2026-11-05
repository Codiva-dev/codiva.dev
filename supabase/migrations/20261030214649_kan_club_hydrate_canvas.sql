UPDATE deliverables SET body_html = $kanclub_portal$<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kan Club - Arquitectura (portal)</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    :root {
      --ink: #1E1E2C;
      --muted: #555;
      --line: #ccc;
      --accent: #4C2A75;
      --accent-2: #4FC3F7;
      --bg-soft: #E0F7FA;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0 auto;
      padding: 16px 20px 28px;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: var(--ink);
      font-size: 9.5pt;
      line-height: 1.35;
      max-width: 920px;
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
    h3 { font-size: 10pt; margin: 10px 0 4px; color: var(--accent); }
    p, li { margin: 3px 0; }
    ol, ul { margin: 4px 0 8px; padding-left: 1.25em; }
    .meta { color: var(--muted); font-size: 8.5pt; margin: 0 0 8px; }
    .cover-box {
      background: var(--bg-soft);
      border: 1px solid var(--line);
      padding: 8px 10px;
      margin: 6px 0 10px;
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
    .swatch {
      display: inline-block;
      width: 14px; height: 14px;
      border: 1px solid var(--line);
      vertical-align: middle;
      margin-right: 4px;
    }
    .note, .info {
      padding: 6px 8px;
      margin: 6px 0;
      font-size: 8.5pt;
    }
    .note { background: #fff8e6; border-left: 3px solid #c9a227; }
    .info { background: var(--bg-soft); border-left: 3px solid var(--accent-2); }
    .kpi {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 6px 0 8px;
    }
    .kpi div {
      flex: 1 1 120px;
      border: 1px solid var(--line);
      padding: 6px;
      background: var(--bg-soft);
      text-align: center;
    }
    .kpi strong { display: block; font-size: 11pt; color: var(--accent); }
    .kpi span { font-size: 7.5pt; color: var(--muted); }
    .mermaid {
      background: #fff;
      border: 1px solid var(--line);
      padding: 4px 6px;
      margin: 6px 0 8px;
      text-align: center;
      overflow: hidden;
      line-height: 1.1;
    }
    .mermaid svg { max-width: 100% !important; height: auto !important; }
    pre {
      background: #f7f7fb;
      border: 1px solid var(--line);
      padding: 6px 8px;
      margin: 6px 0;
      overflow-x: auto;
      font-size: 8pt;
      white-space: pre-wrap;
      font-family: Consolas, "Courier New", monospace;
    }
    .toc { margin: 6px 0 10px; columns: 2; column-gap: 24px; }
    .toc a { color: var(--accent); text-decoration: none; }
    .toc li { margin: 2px 0; font-size: 8.5pt; }
    footer {
      margin-top: 14px;
      padding-top: 6px;
      border-top: 1px solid var(--line);
      font-size: 7.5pt;
      color: var(--muted);
    }
    @media print {
      body { padding: 0; max-width: none; font-size: 9pt; }
      a { color: inherit; text-decoration: none; }
      h1 { font-size: 14pt; }
      h2 { margin-top: 10px; font-size: 11pt; }
      tr { break-inside: avoid; }
    }
    @page { size: A4; margin: 10mm 9mm 12mm; }
  </style>
</head>
<body>
  <h1>Kan Club — Arquitectura de plataforma</h1>
  <p class="meta">
    ERP + CRM Omnicanal · Estética canina + pet shop (1 sucursal) · E-commerce Pickup<br />
    Spec v1.0.0 · Congelado / listo para build · 30 de octubre de 2026 · Codiva
  </p>

  <div class="cover-box">
    <strong>Alcance de este documento</strong>
    <ul>
      <li>Brief MVP, no-objetivos y decisiones cerradas (CL-001…027)</li>
      <li>Actores, dominios, máquinas de estado y secuencia TPV</li>
      <li>Landing, e-commerce Pickup y portal Mi Mascota</li>
      <li>Stack Vercel, offline-first, ADRs y tokens de marca</li>
      <li>Checklist humano pre-build</li>
    </ul>
  </div>

  <div class="kpi">
    <div><strong>1</strong><span>Sucursal + inventario único</span></div>
    <div><strong>1</strong><span>Tableta TPV offline-first</span></div>
    <div><strong>6</strong><span>Visitas de lealtad presencial</span></div>
    <div><strong>27</strong><span>Clarificaciones cerradas</span></div>
  </div>

  <div class="info">
    <strong>Estado.</strong> Congelado / Listo para Construcción (v1.0.0 · 30 oct 2026).
    Tagline: <em>«El club donde tu mejor amigo se siente como en casa»</em>.
    Compras online = Pickup. WhatsApp = 100% outbound.
  </div>

  <h2>Índice</h2>
  <ol class="toc">
    <li><a href="#mvp">Brief MVP</a></li>
    <li><a href="#decisiones">Decisiones cerradas</a></li>
    <li><a href="#actores">Actores y RBAC</a></li>
    <li><a href="#flujo">Flujo comercial</a></li>
    <li><a href="#dominios">Dominios</a></li>
    <li><a href="#grooming">Estados de estética</a></li>
    <li><a href="#pedido">Estados de orden</a></li>
    <li><a href="#secuencia">Secuencia TPV</a></li>
    <li><a href="#landing">Landing y e-commerce</a></li>
    <li><a href="#stack">Stack y offline</a></li>
    <li><a href="#adrs">ADRs</a></li>
    <li><a href="#marca">Marca y tokens</a></li>
    <li><a href="#humano">Checklist handoff</a></li>
  </ol>

  <h2 id="mvp">1. Brief MVP</h2>
  <p>
    Kan Club centraliza operación de estética canina y pet shop físico con tienda en línea
    <strong>100% Click &amp; Collect</strong>. Una sola tableta: check-in, timers, escaneo SKU,
    lealtad, carta responsiva y cobro con Mercado Pago Point Smart.
  </p>
  <h3>Incluye</h3>
  <ul>
    <li>TPV unificado (servicios + productos SKU) · Point Smart API/Webhook · fallback efectivo/transferencia</li>
    <li>Carta responsiva digital 1 vez por cliente · fases Recepción → Baño → Corte/Secado → Listo + WhatsApp «Mascota Lista»</li>
    <li>Web Pickup, cotizador, CTA WhatsApp, portal Mi Mascota (OTP)</li>
    <li>Lealtad presencial 6 visitas · PWA Offline-First (RxDB) · 100% Vercel</li>
  </ul>
  <h3>No incluye</h3>
  <ol>
    <li>Multi-sucursal / franquicia</li>
    <li>CFDI 4.0 automático (corte diario a público en general; factura manual bajo demanda)</li>
    <li>App nativa iOS/Android</li>
    <li>Envíos a domicilio</li>
    <li>Bot IA inbound en WhatsApp</li>
  </ol>

  <h2 id="decisiones">2. Decisiones cerradas (CL-001…027)</h2>
  <p class="meta">Todas CERRADAS con el cliente el 28 oct 2026. Resumen P0:</p>
  <table>
    <thead><tr><th>ID</th><th>Decisión</th></tr></thead>
    <tbody>
      <tr><td>CL-001…004</td><td>Estética + pet shop + e-com · 1 tableta · México · waiver · agenda, SKU, lealtad 6, TPV, WhatsApp</td></tr>
      <tr><td>CL-006…008</td><td>Ticket único · MP Point API/webhook · responsiva 1 vez (gate)</td></tr>
      <tr><td>CL-012…013</td><td>TPV prioriza stock · agenda master empleados; web → WhatsApp</td></tr>
      <tr><td>CL-015…018</td><td>Fallback efectivo/transfer · fases no bloqueantes · Offline-First RxDB</td></tr>
      <tr><td>CL-020…025</td><td>Rol empleado unificado · 100% Vercel · Pickup · e-com primero · OTP WhatsApp</td></tr>
    </tbody>
  </table>
  <p class="meta">P1 cerradas: lealtad (009), sin anticipo (010), timestamps (011/017), WA outbound (014), PIN 4 dígitos (022), cotizador (026), pre-registro (027).</p>

  <h2 id="actores">3. Actores y RBAC</h2>
  <table>
    <thead><tr><th>Actor</th><th>Rol</th><th>Decide / ve</th><th>No ve</th></tr></thead>
    <tbody>
      <tr>
        <td>Cliente</td>
        <td>Consumidor</td>
        <td>Pickup, pre-registro, firma, portal, agendar vía WhatsApp</td>
        <td>Márgenes, agenda interna, caja</td>
      </tr>
      <tr>
        <td>Empleado / Groomer</td>
        <td>Operador TPV</td>
        <td>Agenda día, timers, SKUs, cobro, firmas, PIN</td>
        <td>Utilidad global, settings, credenciales de pago</td>
      </tr>
      <tr>
        <td>Administrador</td>
        <td>Owner</td>
        <td>Precios, inventario, lealtad, personal, analytics, cortes</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>

  <h2 id="flujo">4. Flujo comercial</h2>
  <pre>Cliente + Mascota → Pre-registro / Walk-in → Gate Responsiva (v1)
→ Fases grooming (timestamps) + Carrito SKUs → Cobro TPV (MP Point)
→ Lealtad + Inventario · WhatsApp «Mascota Lista»</pre>
  <div class="mermaid">
flowchart TD
  C[Cliente] -->|Catálogo / Pre-registro| WEB[Web]
  C -->|Agenda / Avisos| WA[WhatsApp]
  C -->|Visita| E[Empleado tableta]
  E --> ORD[Ticket]
  E --> TIM[Timers]
  E --> EXP[Responsiva]
  ORD --> INV[Inventario SKU]
  ORD --> LOY[Lealtad 6]
  ORD --> MP[MP Point]
  TIM -->|Mascota Lista| WAPI[WhatsApp outbound]
  WAPI --> C
  </div>

  <h2 id="dominios">5. Dominios</h2>
  <ol>
    <li><strong>CRM &amp; Pet Profile</strong> — clientes, mascotas, responsiva (Blob), lealtad 6</li>
    <li><strong>Booking &amp; Grooming Ops</strong> — agenda, fases, timestamps</li>
    <li><strong>Catalog &amp; Inventory</strong> — SKUs/servicios; TPV prioriza stock</li>
    <li><strong>Sales &amp; POS</strong> — ticket omnicanal, cortes, pagos</li>
    <li><strong>Notification &amp; Engagement</strong> — WhatsApp outbound</li>
    <li><strong>Platform &amp; Analytics</strong> — PIN, OTP, auditoría, métricas</li>
  </ol>

  <h2 id="grooming">6. Estados de estética</h2>
  <div class="mermaid">
stateDiagram-v2
  [*] --> Programada
  Programada --> Cancelada
  Programada --> EnRecepcion: Llega a sucursal
  note right of EnRecepcion
    Gate responsiva si falta
  end note
  EnRecepcion --> EnBano: Bano
  EnBano --> EnCorteSecado: Corte o secado
  EnCorteSecado --> ListoEntrega: Completo y WhatsApp
  ListoEntrega --> EntregadoYCobrado
  EntregadoYCobrado --> [*]
  </div>
  <p class="meta">Fases no bloqueantes (CL-016). Timestamps silenciosos (CL-017).</p>

  <h2 id="pedido">7. Estados de orden</h2>
  <div class="mermaid">
stateDiagram-v2
  [*] --> Draft
  Draft --> PendingPayment: Checkout TPV
  PendingPayment --> AwaitingPointResponse: Point Smart
  AwaitingPointResponse --> Paid: Approved
  AwaitingPointResponse --> PaymentFailed: Reject o timeout
  PaymentFailed --> PendingPayment: Efectivo o Transfer
  Paid --> Completed: Stock y lealtad
  Draft --> WebOrderPending: Pedido Pickup
  WebOrderPending --> Paid
  Paid --> PendingPickup
  PendingPickup --> Completed: Recoge en tienda
  </div>

  <h2 id="secuencia">8. Secuencia TPV (crítica)</h2>
  <div class="mermaid">
sequenceDiagram
  actor C as Cliente
  actor E as Empleado
  participant POS as POS
  participant CRM as CRM
  participant MP as MP Adapter
  participant WA as WhatsApp
  C->>E: Llega con mascota
  E->>POS: Busca tel nombre o mascota
  POS->>CRM: Expediente y responsiva
  opt Si falta firma
    C->>POS: Firma en tableta
    POS->>CRM: Blob y hash
  end
  E->>POS: Fases t0 a t3
  POS->>WA: Mascota Lista
  WA-->>C: WhatsApp
  E->>POS: SKUs + servicio a ticket
  POS->>MP: Orden Point
  MP-->>POS: Webhook Approved
  POS->>CRM: Lealtad y cierre
  </div>

  <h2 id="landing">9. Landing y e-commerce</h2>
  <ol>
    <li><strong>Hero</strong> — tagline + CTAs Comprar Pickup / Agendar WhatsApp · badge horario</li>
    <li><strong>Cotizador</strong> — Chico/Mediano/Grande/Gigante + tipo de pelo → CTA WhatsApp prefabricado</li>
    <li><strong>Catálogo Pickup</strong> — Alimento Premium, Premios Naturales, Accesorios, Cuidados &amp; Higiene · stock en vivo</li>
    <li><strong>Lealtad 6 visitas</strong> — 3ª 20% premios · 4ª premio gratis · 6ª 50% baño/corte</li>
    <li><strong>Portal Mi Mascota</strong> — OTP WhatsApp: ficha, responsiva, historial, sellos</li>
  </ol>

  <h2 id="stack">10. Stack y offline</h2>
  <table>
    <thead><tr><th>Capa</th><th>Tecnología</th></tr></thead>
    <tbody>
      <tr><td>App / API</td><td>Next.js App Router + Tailwind · PWA tableta</td></tr>
      <tr><td>Offline</td><td>RxDB / IndexedDB + sync al reconectar</td></tr>
      <tr><td>OLTP</td><td>Vercel Postgres (Neon)</td></tr>
      <tr><td>Cache / cola</td><td>Vercel KV (Upstash) + jobs async</td></tr>
      <tr><td>Archivos</td><td>Vercel Blob (firmas + SHA-256)</td></tr>
      <tr><td>Pagos</td><td>Mercado Pago Point Smart (webhook)</td></tr>
      <tr><td>Mensajería</td><td>WhatsApp Cloud API outbound</td></tr>
    </tbody>
  </table>
  <pre>UI PWA ←→ RxDB (IndexedDB) → Queue local
Service Worker sync → /api/sync → Postgres</pre>
  <div class="info">Offline: efectivo, firmas, timers. Point Smart requiere red. Stock: TPV gana (CL-012).</div>

  <h2 id="adrs">11. ADRs (aprobados)</h2>
  <table>
    <thead><tr><th>ADR</th><th>Decisión</th></tr></thead>
    <tbody>
      <tr><td>001</td><td>Offline-First RxDB · sync bidireccional a Postgres</td></tr>
      <tr><td>002</td><td>MP Point async + webhook · estado AwaitingPointResponse</td></tr>
      <tr><td>003</td><td>Responsiva inmutable: PNG → Blob + SHA-256 en expediente</td></tr>
      <tr><td>004</td><td>100% Vercel serverless (app, Postgres, KV, Blob)</td></tr>
    </tbody>
  </table>

  <h2 id="marca">12. Marca y design tokens</h2>
  <table>
    <thead><tr><th>Token</th><th>Valor</th><th>Uso</th></tr></thead>
    <tbody>
      <tr><td><span class="swatch" style="background:#4C2A75"></span>brand.purple</td><td><code>#4C2A75</code></td><td>Headers, navbar, títulos, theme PWA</td></tr>
      <tr><td><span class="swatch" style="background:#5E35B1"></span>brand.purpleLight</td><td><code>#5E35B1</code></td><td>Hover principales</td></tr>
      <tr><td><span class="swatch" style="background:#4FC3F7"></span>brand.cyan</td><td><code>#4FC3F7</code></td><td>CTA, badges activos, isotipo huella</td></tr>
      <tr><td><span class="swatch" style="background:#29B6F6"></span>brand.cyanDark</td><td><code>#29B6F6</code></td><td>Hover CTA</td></tr>
      <tr><td><span class="swatch" style="background:#E0F7FA"></span>brand.bgSoft</td><td><code>#E0F7FA</code></td><td>Fondos de cards / inputs</td></tr>
      <tr><td><span class="swatch" style="background:#1E1E2C"></span>brand.darkNeutral</td><td><code>#1E1E2C</code></td><td>Texto tableta TPV</td></tr>
    </tbody>
  </table>
  <table>
    <thead><tr><th>Asset</th><th>Ruta</th><th>Uso</th></tr></thead>
    <tbody>
      <tr><td>Logotipo</td><td><code>/public/assets/logo-kanclub.svg</code></td><td>Header e-com, PDF responsiva, tickets WA</td></tr>
      <tr><td>Imagotipo (sello)</td><td><code>/public/assets/seal-kanclub.svg</code></td><td>Login PIN tableta, marca de agua, lealtad</td></tr>
      <tr><td>Isotipo (huella)</td><td><code>/public/assets/icon-paw.png</code></td><td>Favicon, iconos PWA 192/512, loader</td></tr>
    </tbody>
  </table>
  <p class="meta">PWA manifest: name «Kan Club POS &amp; Ops» · short_name KanClub · theme/background <code>#4C2A75</code> · start_url <code>/pos</code>.</p>

  <h2 id="humano">13. Checklist handoff a build</h2>
  <ol>
    <li>API Keys Mercado Pago (sandbox + prod Point Smart)</li>
    <li>Hardware: Point Smart + escáner + tableta</li>
    <li>WhatsApp Cloud API + plantilla «Mascota Lista»</li>
    <li>Texto legal final Carta Responsiva</li>
    <li>Seed SKUs / precios / servicios</li>
    <li>Wireframes táctiles TPV (PIN 4 dígitos)</li>
  </ol>
  <div class="note">Estos ítems no reabren la arquitectura; se gestionan como documentos / accesos en el portal Codiva.</div>

  <footer>
    Kan Club · Arquitectura portal · Codiva · Spec v1.0.0 · Freeze 2026-10-30 · Contacto: Luis Vaca
  </footer>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "strict" });
  </script>
</body>
</html>
$kanclub_portal$ WHERE id = '92000001-0001-4000-8000-0000000000d1';

UPDATE deliverables SET body_html = $kanclub_completa$<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kan Club - Arquitectura completa (staff)</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    :root {
      --ink: #1E1E2C;
      --muted: #555;
      --line: #ccc;
      --accent: #4C2A75;
      --accent-2: #4FC3F7;
      --bg-soft: #E0F7FA;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0 auto;
      padding: 16px 20px 28px;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      color: var(--ink);
      font-size: 9.5pt;
      line-height: 1.35;
      max-width: 980px;
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
      background: var(--accent);
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
      margin: 6px 0 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 10px;
      font-size: 8pt;
    }
    th, td {
      border: 1px solid var(--line);
      padding: 3px 5px;
      text-align: left;
      vertical-align: top;
    }
    th { background: var(--bg-soft); font-weight: 600; }
    .swatch {
      display: inline-block;
      width: 12px; height: 12px;
      border: 1px solid var(--line);
      vertical-align: middle;
      margin-right: 3px;
    }
    .note { background: #fff8e6; border-left: 3px solid #c9a227; padding: 6px 8px; margin: 6px 0; font-size: 8.5pt; }
    .info { background: var(--bg-soft); border-left: 3px solid var(--accent-2); padding: 6px 8px; margin: 6px 0; font-size: 8.5pt; }
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
      background: #f7f7fb;
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
    Inventario interno Spec v1.0.0 (ES) · CL-001…027 · ADRs · marca · stack as-built · 30 oct 2026
  </p>

  <div class="cover-box">
    <strong>Cliente</strong>
    <ul>
      <li>Organización: Kan Club · Contacto: Luis Vaca · luis.vacavelez@gmail.com</li>
      <li>Slug Ops: <code>kan-club</code></li>
      <li>Fuente: <code>public/client-packs/kan-club/kan_club_architecture_document.md</code></li>
      <li>Repo producto: pendiente de arranque de build</li>
    </ul>
  </div>

  <div class="info">
    <strong>Freeze.</strong> v1.0.0 · Congelado / Listo para Construcción (30 oct 2026).
    Baseline: Next.js + Vercel Postgres + KV + Blob.
    As-built Marketplace: Neon + Upstash + Blob.
    Marca incluida: purple <code>#4C2A75</code> · cyan <code>#4FC3F7</code>.
  </div>

  <h2>1. ADRs</h2>
  <table>
    <thead><tr><th>ADR</th><th>Contexto</th><th>Decisión</th><th>Build</th></tr></thead>
    <tbody>
      <tr>
        <td>001</td>
        <td>Internet inestable en tienda</td>
        <td>PWA Offline-First · RxDB · sync bidireccional</td>
        <td>Cash + firmas + timers offline; Point requiere red</td>
      </tr>
      <tr>
        <td>002</td>
        <td>Terminal no debe congelar UI</td>
        <td>MP Point async + webhook</td>
        <td>AwaitingPointResponse · fallback efectivo/transfer (CL-015)</td>
      </tr>
      <tr>
        <td>003</td>
        <td>Firma legalmente auditable</td>
        <td>PNG → Blob + SHA-256 en expediente</td>
        <td>1 vez por cliente (CL-008)</td>
      </tr>
      <tr>
        <td>004</td>
        <td>1 sucursal, mínimo DevOps</td>
        <td>100% Vercel serverless</td>
        <td>Neon + Upstash + Blob</td>
      </tr>
    </tbody>
  </table>

  <h2>2. Stack brief → as-built</h2>
  <table>
    <thead><tr><th>Brief</th><th>As-built</th></tr></thead>
    <tbody>
      <tr><td>Next.js App Router + Tailwind</td><td>Next.js 15+ · Fluid Compute</td></tr>
      <tr><td>Vercel Postgres</td><td>Neon (Marketplace)</td></tr>
      <tr><td>Vercel KV Redis</td><td>Upstash Redis</td></tr>
      <tr><td>Vercel Blob</td><td>Vercel Blob (responsivas)</td></tr>
      <tr><td>BullMQ</td><td>Redis + route handlers / crons</td></tr>
      <tr><td>RxDB / Dexie</td><td>IndexedDB tableta</td></tr>
    </tbody>
  </table>

  <h2>3. Clarification log (CL-001…027)</h2>
  <table>
    <thead><tr><th>ID</th><th>Módulo</th><th>Impacta</th><th>Sev</th><th>Decisión</th></tr></thead>
    <tbody>
      <tr><td>CL-001</td><td>General</td><td>Todos</td><td>P0</td><td>Estética + e-com + ERP/CRM · 1 sucursal</td></tr>
      <tr><td>CL-002</td><td>Actores</td><td>Auth/RBAC</td><td>P0</td><td>Clientes pagan · empleados en tableta</td></tr>
      <tr><td>CL-003</td><td>Regulación</td><td>Compliance</td><td>P0</td><td>México · responsiva digital</td></tr>
      <tr><td>CL-004</td><td>MVP</td><td>ERP/CRM</td><td>P0</td><td>Clientes, mascotas, agenda, SKU, lealtad, TPV, WA</td></tr>
      <tr><td>CL-005</td><td>Integraciones</td><td>Hardware</td><td>P0</td><td>MP Point, WA API, escáner, tableta</td></tr>
      <tr><td>CL-006</td><td>TPV</td><td>Inventario</td><td>P0</td><td>Ticket único servicios + SKUs</td></tr>
      <tr><td>CL-007</td><td>Integraciones</td><td>Payments</td><td>P0</td><td>API/Webhook Point Smart</td></tr>
      <tr><td>CL-008</td><td>Operación</td><td>Compliance</td><td>P0</td><td>Gate responsiva 1 vez</td></tr>
      <tr><td>CL-009</td><td>CRM</td><td>TPV</td><td>P1</td><td>6 visitas: 3ª 20% · 4ª gratis · 6ª 50%</td></tr>
      <tr><td>CL-010</td><td>Agenda</td><td>Booking</td><td>P1</td><td>Sin anticipo</td></tr>
      <tr><td>CL-011</td><td>Operación</td><td>Analytics</td><td>P1</td><td>Timestamps por fase</td></tr>
      <tr><td>CL-012</td><td>Inventario</td><td>POS</td><td>P0</td><td>TPV prioridad · web sin stock → backorder</td></tr>
      <tr><td>CL-013</td><td>Booking</td><td>Ops</td><td>P0</td><td>Agenda empleados · web → WA</td></tr>
      <tr><td>CL-014</td><td>Notificaciones</td><td>WA</td><td>P1</td><td>100% outbound</td></tr>
      <tr><td>CL-015</td><td>TPV</td><td>Payments</td><td>P0</td><td>Fallback efectivo/transfer</td></tr>
      <tr><td>CL-016</td><td>Grooming</td><td>POS</td><td>P0</td><td>Fases no bloqueantes</td></tr>
      <tr><td>CL-017</td><td>Analytics</td><td>Ops</td><td>P1</td><td>Timers no punitivos</td></tr>
      <tr><td>CL-018</td><td>Arquitectura</td><td>Sync</td><td>P0</td><td>Offline-First RxDB</td></tr>
      <tr><td>CL-019</td><td>CRM</td><td>Notif</td><td>P1</td><td>Recompra + inactivos</td></tr>
      <tr><td>CL-020</td><td>RBAC</td><td>POS</td><td>P0</td><td>Rol empleado unificado</td></tr>
      <tr><td>CL-021</td><td>Stack</td><td>Deploy</td><td>P0</td><td>100% Vercel</td></tr>
      <tr><td>CL-022</td><td>Auth</td><td>Audit</td><td>P1</td><td>PIN 4 dígitos + employee_id</td></tr>
      <tr><td>CL-023</td><td>E-com</td><td>Checkout</td><td>P0</td><td>100% Pickup</td></tr>
      <tr><td>CL-024</td><td>Landing</td><td>Web</td><td>P0</td><td>E-com primero · WA secundario</td></tr>
      <tr><td>CL-025</td><td>CRM/Auth</td><td>Web</td><td>P0</td><td>OTP WA · lookup TPV</td></tr>
      <tr><td>CL-026</td><td>E-com</td><td>Web</td><td>P1</td><td>Cotizador tamaño/raza</td></tr>
      <tr><td>CL-027</td><td>CRM</td><td>Web</td><td>P1</td><td>Pre-registro web</td></tr>
    </tbody>
  </table>

  <h2>4. Marca — tokens y assets</h2>
  <table>
    <thead><tr><th>Token</th><th>Hex</th><th>Uso</th></tr></thead>
    <tbody>
      <tr><td><span class="swatch" style="background:#4C2A75"></span>purple</td><td>#4C2A75</td><td>Headers / theme PWA</td></tr>
      <tr><td><span class="swatch" style="background:#5E35B1"></span>purpleLight</td><td>#5E35B1</td><td>Hover</td></tr>
      <tr><td><span class="swatch" style="background:#4FC3F7"></span>cyan</td><td>#4FC3F7</td><td>CTA / huella</td></tr>
      <tr><td><span class="swatch" style="background:#29B6F6"></span>cyanDark</td><td>#29B6F6</td><td>Hover CTA</td></tr>
      <tr><td><span class="swatch" style="background:#E0F7FA"></span>bgSoft</td><td>#E0F7FA</td><td>Cards / inputs</td></tr>
      <tr><td><span class="swatch" style="background:#1E1E2C"></span>darkNeutral</td><td>#1E1E2C</td><td>Texto TPV</td></tr>
    </tbody>
  </table>
  <table>
    <thead><tr><th>Asset</th><th>Path</th></tr></thead>
    <tbody>
      <tr><td>Logo</td><td><code>/public/assets/logo-kanclub.svg</code></td></tr>
      <tr><td>Sello</td><td><code>/public/assets/seal-kanclub.svg</code></td></tr>
      <tr><td>Huella / PWA icons</td><td><code>/public/assets/icon-paw.png</code> (+ 192 / 512)</td></tr>
    </tbody>
  </table>
  <pre>{
  "name": "Kan Club POS & Ops",
  "short_name": "KanClub",
  "start_url": "/pos",
  "display": "standalone",
  "background_color": "#4C2A75",
  "theme_color": "#4C2A75"
}</pre>
  <div class="note">Pendiente en portal: entregar archivos SVG/PNG reales al document request <code>brandbook</code> (o sembrar assets en el repo de producto al arrancar build).</div>

  <h2>5. Superficies</h2>
  <div class="mermaid">
flowchart TB
  subgraph Surfaces
    TAB[tableta PWA]
    WEB[landing + ecom]
    ADM[admin]
  end
  subgraph Gateway
    BFF[Next.js BFF]
    MP[MP adapter]
    WA[WA adapter]
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

  <h2>6. Offline</h2>
  <pre>UI PWA ←→ RxDB → Queue local
SW sync → /api/sync → Neon</pre>

  <h2>7. Handoff humano</h2>
  <ol>
    <li>MP sandbox + prod Point</li>
    <li>Point Smart + escáner + tableta</li>
    <li>WhatsApp Cloud API + plantilla Mascota Lista</li>
    <li>Texto Carta Responsiva</li>
    <li>Seed SKUs</li>
    <li>Wireframes TPV PIN</li>
    <li>Assets de marca (logo / sello / huella) en repo</li>
  </ol>

  <h2>8. Corte scaffold</h2>
  <ul>
    <li>Docs + ADRs + marca en <code>client-packs/kan-club</code></li>
    <li>Pendiente: stub Next.js /, /portal, /pos, /admin, adapters MP/WA</li>
    <li>Sin schema Neon, sin RxDB, sin remoto producto aún</li>
  </ul>
  <div class="note">Sin cotización en este pack — el brief no trae montos.</div>

  <footer>Kan Club · Arquitectura completa (staff) · Codiva · Spec v1.0.0 · Freeze 2026-10-30</footer>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "strict" });
  </script>
</body>
</html>
$kanclub_completa$ WHERE id = '92000001-0001-4000-8000-0000000000d2';