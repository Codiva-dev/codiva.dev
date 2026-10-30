UPDATE deliverables SET body_html = $kanclub_portal$<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Kan Club - Arquitectura (portal)</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <style>
    :root {
      --ink: #1a1a1a;
      --muted: #555;
      --line: #ccc;
      --accent: #2c5f4a;
      --bg-soft: #f4f7f5;
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
    h3 { font-size: 10pt; margin: 10px 0 4px; }
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
    .note, .info {
      padding: 6px 8px;
      margin: 6px 0;
      font-size: 8.5pt;
    }
    .note { background: #fff8e6; border-left: 3px solid #c9a227; }
    .info { background: #eef5f1; border-left: 3px solid var(--accent); }
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
      background: var(--bg-soft);
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
      .mermaid { break-inside: auto; }
      table { break-inside: auto; }
      tr { break-inside: avoid; }
    }
    @page { size: A4; margin: 10mm 9mm 12mm; }
  </style>
</head>
<body>
  <h1>Kan Club — Arquitectura de sistema</h1>
  <p class="meta">
    ERP · CRM · POS · E-commerce Pickup para grooming y retail de mascotas (1 sucursal)<br />
    Spec v1.0.0 · Congelada / lista para build · 28 de octubre de 2026 · Codiva
  </p>

  <div class="cover-box">
    <strong>Alcance de este documento</strong>
    <ul>
      <li>Definición de producto, MVP y fuera de alcance</li>
      <li>Actores, flujo comercial y dominios de plataforma</li>
      <li>Máquinas de estado (grooming y pedido unificado)</li>
      <li>Landing, e-commerce Pickup, lealtad y portal Mi Mascota</li>
      <li>Stack, RBAC, ADRs aprobados y checklist humano pre-build</li>
    </ul>
  </div>

  <div class="kpi">
    <div><strong>1</strong><span>Sucursal / inventario único</span></div>
    <div><strong>1</strong><span>Tablet operativa in-store</span></div>
    <div><strong>6</strong><span>Visitas de lealtad presencial</span></div>
    <div><strong>27</strong><span>Clarificaciones cerradas</span></div>
  </div>

  <div class="info">
    <strong>Estado.</strong> Arquitectura <em>congelada / lista para build</em> (v1.0.0 · 28 oct 2026).
    Tagline web: <em>«El club donde tu mejor amigo se siente como en casa»</em>.
    E-commerce estrictamente Pickup (Click &amp; Collect). WhatsApp 100% outbound automatizado.
  </div>

  <h2>Índice</h2>
  <ol class="toc">
    <li><a href="#resumen">Resumen ejecutivo</a></li>
    <li><a href="#mvp">MVP y fuera de alcance</a></li>
    <li><a href="#decisiones">Decisiones cerradas</a></li>
    <li><a href="#actores">Actores</a></li>
    <li><a href="#flujo">Flujo comercial</a></li>
    <li><a href="#dominios">Dominios</a></li>
    <li><a href="#grooming">Estados de grooming</a></li>
    <li><a href="#pedido">Estados de pedido</a></li>
    <li><a href="#secuencia">Secuencia en tienda</a></li>
    <li><a href="#offline">Offline tablet</a></li>
    <li><a href="#landing">Landing y e-commerce</a></li>
    <li><a href="#stack">Stack y RBAC</a></li>
    <li><a href="#adrs">ADRs</a></li>
    <li><a href="#humano">Checklist humano</a></li>
  </ol>

  <h2 id="resumen">1. Resumen ejecutivo</h2>
  <p>
    Kan Club es una plataforma integrada de <strong>ERP, CRM, POS y E-commerce</strong> para un salón
    de grooming con retail físico (1 ubicación) y tienda en línea sincronizada. Cubre el viaje completo:
    perfil de mascota, carta responsiva digital, fases de grooming con timestamps, POS offline-first
    en una sola tablet, notificaciones WhatsApp outbound y programa de lealtad presencial.
  </p>
  <pre>Cliente + Mascota → Pre-registro / Walk-in → Carta responsiva (1 vez)
→ Fases grooming (timestamps) + carrito retail → POS (Mercado Pago Point)
→ Stock y lealtad sincronizados · WhatsApp «Tu mascota está lista»</pre>

  <h2 id="mvp">2. MVP y fuera de alcance</h2>
  <h3>Incluye (MVP)</h3>
  <ul>
    <li><strong>Inventario único</strong> sincronizado POS ↔ web en tiempo real</li>
    <li><strong>Grooming</strong> con fases flexibles y timestamps (Recepción → Baño → Corte/Secado → Listo)</li>
    <li><strong>Carta responsiva</strong> digital en tablet (una sola vez por cliente)</li>
    <li><strong>Ticket unificado</strong> servicios + productos; Point Smart + fallback efectivo / transferencia / link</li>
    <li><strong>Web:</strong> e-commerce Pickup, estimador de grooming, CTA WhatsApp para agendar, portal Mi Mascota (OTP)</li>
    <li><strong>Lealtad presencial 6 visitas:</strong> 3ª 20% premios naturales · 4ª premio gratis · 6ª 50% grooming/baño</li>
    <li><strong>WhatsApp outbound:</strong> Pet Ready, recordatorios de grooming, recompra de consumibles</li>
  </ul>
  <h3>No incluye (MVP)</h3>
  <ol>
    <li>Multi-sucursal / franquicia</li>
    <li>CFDI 4.0 automático (reporte fiscal diario externo; factura manual bajo demanda)</li>
    <li>App nativa iOS/Android (sí PWA tablet + web responsive)</li>
    <li>Envíos a domicilio</li>
    <li>Bot de IA inbound en WhatsApp (solo outbound; respuestas las atiende el staff)</li>
  </ol>

  <h2 id="decisiones">3. Decisiones cerradas (CL-001…027)</h2>
  <p class="meta">Todas cerradas con el cliente el 28 oct 2026. Resumen de las P0:</p>
  <table>
    <thead><tr><th>ID</th><th>Decisión</th></tr></thead>
    <tbody>
      <tr><td>CL-001…004</td><td>Grooming + retail + e-com · 1 tablet · México · waiver digital · agenda, SKU, lealtad 6, TPV, WhatsApp</td></tr>
      <tr><td>CL-006…008</td><td>Ticket unificado · MP Point API/webhook · waiver obligatoria 1 vez en tablet</td></tr>
      <tr><td>CL-012…013</td><td>POS manda sobre stock web (backorder interno) · agenda master del staff; web → WhatsApp</td></tr>
      <tr><td>CL-015…018</td><td>Fallback Cash/Transfer/link · fases no rígidas · offline-first RxDB</td></tr>
      <tr><td>CL-020…025</td><td>Rol staff unificado · 100% Vercel · Pickup only · e-com primero · portal OTP WhatsApp</td></tr>
    </tbody>
  </table>
  <p class="meta">P1 también cerradas: lealtad (CL-009), sin depósito (CL-010), timestamps analíticos (CL-011/017), WhatsApp solo outbound (CL-014), PIN 4 dígitos (CL-022), estimador (CL-026), pre-registro web (CL-027).</p>

  <h2 id="actores">4. Actores</h2>
  <table>
    <thead>
      <tr><th>Actor</th><th>Rol</th><th>Puede</th><th>No puede</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>Cliente</td>
        <td>Consumidor</td>
        <td>Catálogo Pickup, pre-registro, firma, portal, agendar vía WhatsApp</td>
        <td>Ver márgenes, agenda interna ni settings</td>
      </tr>
      <tr>
        <td>Staff (tablet)</td>
        <td>Operador</td>
        <td>Check-in, timers, SKUs, TPV, waiver, PIN rápido</td>
        <td>Editar listas de precio ni exportar finanzas globales</td>
      </tr>
      <tr>
        <td>Admin / dueño</td>
        <td>Superusuario</td>
        <td>Precios, inventario, lealtad, campañas, métricas, cortes de caja</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>

  <h2 id="flujo">5. Flujo comercial</h2>
  <div class="mermaid">
flowchart TD
  C[Cliente / tutor] -->|Browse y pre-registro| WEB[Web]
  C -->|Alertas y agenda CTA| WA[WhatsApp]
  C -->|Visita tienda| E[Staff tablet]
  E --> ORD[Ticket unificado]
  E --> TIM[Timers grooming]
  E --> EXP[Carta responsiva]
  ORD --> INV[Inventario SKU]
  ORD --> LOY[Lealtad 6 visitas]
  ORD --> MP[Mercado Pago Point]
  TIM -->|Pet Ready| WAPI[WhatsApp outbound]
  WAPI --> C
  </div>

  <h2 id="dominios">6. Dominios de plataforma</h2>
  <div class="mermaid">
flowchart TB
  subgraph Surfaces
    TAB[Tablet PWA]
    WEB[Landing y e-com]
    ADM[Admin]
  end
  subgraph Core
    CRM[CRM y mascotas]
    OPS[Agenda y grooming]
    INV[Catálogo e inventario]
    POS[Ventas y POS]
    NOTIF[Notificaciones]
    PLAT[Plataforma y analytics]
  end
  Surfaces --> Core
  </div>
  <ol>
    <li><strong>CRM y mascotas</strong> — clientes, perfiles, notas, waiver (Blob), lealtad 6 visitas</li>
    <li><strong>Agenda y grooming</strong> — calendario master (staff), fases y timestamps sin bloqueos rígidos</li>
    <li><strong>Catálogo e inventario</strong> — SKUs productos/servicios; POS prioriza stock sobre web</li>
    <li><strong>Ventas y POS</strong> — ticket, cortes de caja, offline, orquestación de pagos</li>
    <li><strong>Notificaciones</strong> — WhatsApp outbound (Pet Ready, recompra, reactivación)</li>
    <li><strong>Plataforma</strong> — PIN staff, RBAC, auditoría, reportes de tiempos</li>
  </ol>

  <h2 id="grooming">7. Estados de grooming</h2>
  <div class="mermaid">
stateDiagram-v2
  [*] --> Scheduled
  Scheduled --> Cancelled
  Scheduled --> InReception: Llega mascota
  note right of InReception
    Gate waiver si falta
  end note
  InReception --> InBath: Bano
  InBath --> InHaircut: Corte o secado
  InHaircut --> ReadyForPickup: Completo y WhatsApp
  ReadyForPickup --> DeliveredAndPaid: Entrega y ticket
  DeliveredAndPaid --> [*]
  </div>
  <p class="meta">Fases flexibles (CL-016): saltos, prepago o pago al final. Timestamps silenciosos (CL-017). Evento async al llegar a ReadyForPickup → WhatsApp Pet Ready.</p>

  <h2 id="pedido">8. Estados de pedido unificado</h2>
  <div class="mermaid">
stateDiagram-v2
  [*] --> Draft
  Draft --> PendingPayment: Checkout POS
  PendingPayment --> AwaitingPointResponse: Point Smart
  AwaitingPointResponse --> Paid: Webhook Approved
  AwaitingPointResponse --> PaymentFailed: Reject o timeout
  PaymentFailed --> PendingPayment: Cash Transfer o link
  Paid --> Completed: Stock y lealtad
  Draft --> WebOrderPending: Pedido web Pickup
  WebOrderPending --> Paid
  Paid --> PendingPickup
  PendingPickup --> Completed: Recoge en tienda
  </div>

  <h2 id="secuencia">9. Secuencia crítica en tienda</h2>
  <div class="mermaid">
sequenceDiagram
  actor C as Cliente
  actor E as Staff
  participant POS as POS
  participant CRM as CRM
  participant MP as MP Adapter
  participant WA as WhatsApp
  C->>E: Llega con mascota
  E->>POS: Busca por tel nombre o mascota
  POS->>CRM: Estado waiver
  CRM-->>POS: false
  C->>POS: Firma en tablet
  POS->>CRM: Blob y hash
  E->>POS: Fases grooming t0 a t3
  POS->>WA: Pet Ready
  WA-->>C: WhatsApp
  E->>POS: SKUs y servicio a ticket
  POS->>MP: Orden Point
  MP-->>POS: Webhook Approved
  POS->>CRM: Suma lealtad y stock
  </div>

  <h2 id="offline">10. Offline-first (tablet)</h2>
  <pre>UI React ←→ RxDB (IndexedDB)
Service Worker (assets)
RxDB Sync ←→ API (cuando online) ←→ Postgres</pre>
  <div class="info">Offline permite ventas en efectivo y logging de timers. El TPV Point Smart requiere red. Conflictos de stock: in-store gana (CL-012).</div>

  <h2 id="landing">11. Landing y e-commerce</h2>
  <ol>
    <li><strong>Hero</strong> — tagline + CTAs <em>Comprar en línea (Pickup)</em> y <em>Agendar por WhatsApp</em> (mensaje prefabricado)</li>
    <li><strong>Estimador</strong> — tamaño (S/M/L/Giant) + tipo de pelo → rango de precio/tiempo + CTA WhatsApp</li>
    <li><strong>Tienda Click &amp; Collect</strong> — stock en tiempo real · Alimento Premium, Premios Naturales, Accesorios, Higiene</li>
    <li><strong>Lealtad</strong> — explicación de la tarjeta presencial 6 visitas</li>
    <li><strong>Portal Mi Mascota</strong> — login passwordless (OTP WhatsApp): perfil, waiver, historial, sellos de visita</li>
  </ol>

  <h2 id="stack">12. Stack y RBAC</h2>
  <table>
    <thead><tr><th>Capa</th><th>Tecnología</th></tr></thead>
    <tbody>
      <tr><td>App / API</td><td>Next.js (App Router) en Vercel · PWA tablet</td></tr>
      <tr><td>Offline tablet</td><td>RxDB / IndexedDB</td></tr>
      <tr><td>Base de datos</td><td>Postgres serverless (Vercel / Neon Marketplace)</td></tr>
      <tr><td>Cache / cola</td><td>Redis (Vercel KV / Upstash) + jobs async</td></tr>
      <tr><td>Archivos</td><td>Vercel Blob (firmas waiver + hash SHA-256)</td></tr>
      <tr><td>Pagos</td><td>Mercado Pago Point Smart (webhook async)</td></tr>
      <tr><td>Mensajería</td><td>WhatsApp Cloud API outbound</td></tr>
    </tbody>
  </table>
  <table>
    <thead><tr><th>Rol</th><th>Auth</th><th>Superficie</th></tr></thead>
    <tbody>
      <tr><td>Staff</td><td>PIN 4 dígitos</td><td>Tablet PWA</td></tr>
      <tr><td>Admin / dueño</td><td>Email + password / magic link</td><td>Backoffice web</td></tr>
      <tr><td>Cliente</td><td>WhatsApp OTP</td><td>Web / portal Mi Mascota</td></tr>
    </tbody>
  </table>

  <h2 id="adrs">13. Decisiones de arquitectura (ADRs)</h2>
  <table>
    <thead><tr><th>ADR</th><th>Decisión</th><th>Estado</th></tr></thead>
    <tbody>
      <tr><td>001</td><td>PWA offline-first con RxDB / IndexedDB; sync bidireccional al estar en línea</td><td>Aprobado</td></tr>
      <tr><td>002</td><td>Mercado Pago Point async vía webhooks; fallback Cash / Transfer / link</td><td>Aprobado</td></tr>
      <tr><td>003</td><td>Waiver inmutable: PNG + texto + timestamp en Vercel Blob + SHA-256 en DB</td><td>Aprobado</td></tr>
      <tr><td>004</td><td>100% infraestructura serverless en Vercel (app, Postgres, Redis, Blob)</td><td>Aprobado</td></tr>
    </tbody>
  </table>

  <h2 id="humano">14. Checklist humano (pre-build)</h2>
  <ol>
    <li>Cuenta desarrollador Mercado Pago (sandbox + producción Point Smart)</li>
    <li>Terminal Point Smart + escáner de códigos + tablet</li>
    <li>WhatsApp Cloud API + plantilla «Pet Ready»</li>
    <li>Texto legal final de Carta Responsiva</li>
    <li>Seed de SKUs / precios / categorías / servicios de grooming</li>
    <li>Wireframes touch-first de la tablet</li>
  </ol>
  <div class="note">
    Estos ítems no reabren la arquitectura; se gestionan como documentos / accesos en el portal Codiva.
  </div>

  <footer>
    Kan Club · Arquitectura portal · Codiva · Spec v1.0.0 · Freeze 2026-10-28 · Contacto cliente: Luis Vaca
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
    Inventario interno alineado a Spec v1.0.0 · CL-001…027 · ADRs · stack as-built · handoff · 28 oct 2026
  </p>

  <div class="cover-box">
    <strong>Cliente</strong>
    <ul>
      <li>Organización: Kan Club</li>
      <li>Contacto: Luis Vaca · luis.vacavelez@gmail.com</li>
      <li>Slug Ops: <code>kan-club</code></li>
      <li>Fuente: <code>public/client-packs/kan-club/system-architecture-v1.md</code></li>
      <li>Repo producto: pendiente (scaffold local cuando se active el track de código)</li>
    </ul>
  </div>

  <div class="info">
    <strong>Freeze.</strong> Spec v1.0.0 Status: Frozen / Ready for Build.
    Baseline brief: Next.js + Vercel Postgres + Vercel KV Redis + Vercel Blob.
    As-built Marketplace 2026: Neon Postgres + Upstash Redis + Vercel Blob.
  </div>

  <h2>1. ADRs (Aceptados)</h2>
  <table>
    <thead><tr><th>ADR</th><th>Contexto</th><th>Decisión</th><th>Notas build</th></tr></thead>
    <tbody>
      <tr>
        <td>001</td>
        <td>Conectividad inestable en tienda; timers y cash no pueden bloquearse</td>
        <td>PWA offline-first · RxDB / IndexedDB · write-local-first · sync bidireccional</td>
        <td>POS manda stock (CL-012). TPV Point requiere red.</td>
      </tr>
      <tr>
        <td>002</td>
        <td>PIN en terminal no debe bloquear el hilo UI</td>
        <td>MP Point async + webhook <code>payment.created</code></td>
        <td>Estado AwaitingPointResponse; fallback Cash/Transfer/link (CL-015)</td>
      </tr>
      <tr>
        <td>003</td>
        <td>Waiver legal debe ser a prueba de manipulación</td>
        <td>PNG + texto + timestamp → Vercel Blob; URL + SHA-256 en DB</td>
        <td>Una firma por cliente (CL-008)</td>
      </tr>
      <tr>
        <td>004</td>
        <td>Minimizar DevOps para 1 sucursal</td>
        <td>100% Vercel serverless</td>
        <td>Neon + Upstash + Blob; sin Railway</td>
      </tr>
    </tbody>
  </table>

  <h2>2. Stack brief → as-built</h2>
  <table>
    <thead><tr><th>Brief (CL-021)</th><th>As-built Codiva 2026</th></tr></thead>
    <tbody>
      <tr><td>Next.js App Router</td><td>Next.js 15+ · Fluid Compute / Node en Vercel</td></tr>
      <tr><td>Vercel Postgres</td><td>Neon Postgres (Marketplace)</td></tr>
      <tr><td>Vercel KV Redis</td><td>Upstash Redis (Marketplace)</td></tr>
      <tr><td>Vercel Blob</td><td>Vercel Blob (waivers)</td></tr>
      <tr><td>BullMQ</td><td>Jobs async vía Redis + route handlers / crons Vercel</td></tr>
      <tr><td>RxDB / Dexie</td><td>IndexedDB local tablet (POS + timers offline)</td></tr>
    </tbody>
  </table>

  <h2>3. Superficies y gateway</h2>
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
  subgraph Domains
    CRM[CRM]
    OPS[Grooming Ops]
    INV[Inventory]
    POS[Sales POS]
    NOTIF[Notifications]
    PLAT[Platform]
  end
  subgraph Data
    PG[(Neon)]
    Redis[(Upstash)]
    Blob[(Blob)]
  end
  Surfaces --> BFF
  BFF --> Domains
  Domains --> PG
  Domains --> Redis
  Domains --> Blob
  POS --> MP
  NOTIF --> WA
  </div>

  <h2>4. Clarification log completo (CL-001…027)</h2>
  <table>
    <thead><tr><th>ID</th><th>Módulo</th><th>Sev</th><th>Decisión</th></tr></thead>
    <tbody>
      <tr><td>CL-001</td><td>General</td><td>P0</td><td>Grooming salon + retail + e-commerce</td></tr>
      <tr><td>CL-002</td><td>Actors</td><td>P0</td><td>Clientes pagan; staff en 1 tablet</td></tr>
      <tr><td>CL-003</td><td>Regulation</td><td>P0</td><td>México; waiver digital en tablet</td></tr>
      <tr><td>CL-004</td><td>MVP</td><td>P0</td><td>Clientes, pets, agenda, SKU, lealtad 6, TPV, WhatsApp</td></tr>
      <tr><td>CL-005</td><td>Integrations</td><td>P0</td><td>MP Point, WA outbound, scanner, tablet</td></tr>
      <tr><td>CL-006</td><td>POS</td><td>P0</td><td>Ticket unificado servicios + SKUs</td></tr>
      <tr><td>CL-007</td><td>Integrations</td><td>P0</td><td>API/Webhook Point Smart</td></tr>
      <tr><td>CL-008</td><td>Ops</td><td>P0</td><td>Waiver 1 vez, digital en tablet</td></tr>
      <tr><td>CL-009</td><td>CRM</td><td>P1</td><td>6 visitas: 3ª 20% treats · 4ª gratis · 6ª 50% grooming</td></tr>
      <tr><td>CL-010</td><td>Booking</td><td>P1</td><td>Sin depósito para reservar</td></tr>
      <tr><td>CL-011</td><td>Ops</td><td>P1</td><td>Timestamps por fase (analítica)</td></tr>
      <tr><td>CL-012</td><td>Inventory</td><td>P0</td><td>POS prioridad absoluta; web sin stock → backorder interno</td></tr>
      <tr><td>CL-013</td><td>Booking</td><td>P0</td><td>Agenda master staff; web → WhatsApp</td></tr>
      <tr><td>CL-014</td><td>Messaging</td><td>P1</td><td>100% outbound; inbound humano</td></tr>
      <tr><td>CL-015</td><td>POS</td><td>P0</td><td>Fallback Cash / Transfer / link</td></tr>
      <tr><td>CL-016</td><td>Ops</td><td>P0</td><td>Fases no estrictas; prepago / skip / post-pay</td></tr>
      <tr><td>CL-017</td><td>Analytics</td><td>P1</td><td>Timestamps silenciosos, no punitivos</td></tr>
      <tr><td>CL-018</td><td>Arch</td><td>P0</td><td>Offline-first RxDB (cash + timers)</td></tr>
      <tr><td>CL-019</td><td>CRM</td><td>P1</td><td>Recompra alimento (~30d) + reactivación</td></tr>
      <tr><td>CL-020</td><td>RBAC</td><td>P0</td><td>Rol staff unificado en tablet</td></tr>
      <tr><td>CL-021</td><td>Deploy</td><td>P0</td><td>100% Vercel serverless</td></tr>
      <tr><td>CL-022</td><td>Auth</td><td>P1</td><td>PIN 4 dígitos por empleado</td></tr>
      <tr><td>CL-023</td><td>E-com</td><td>P0</td><td>100% Store Pickup</td></tr>
      <tr><td>CL-024</td><td>Landing</td><td>P0</td><td>E-com Pickup primario; WA booking secundario</td></tr>
      <tr><td>CL-025</td><td>CRM/Auth</td><td>P0</td><td>OTP WhatsApp clientes; lookup POS tel/nombre/pet</td></tr>
      <tr><td>CL-026</td><td>E-com</td><td>P1</td><td>Estimador size/breed/hair</td></tr>
      <tr><td>CL-027</td><td>Onboarding</td><td>P1</td><td>Pre-registro web cliente + pets</td></tr>
    </tbody>
  </table>
  <p class="meta">Owner: Client · Status: CLOSED · Date: 2026-10-28</p>

  <h2>5. Offline tablet</h2>
  <pre>UI React ←→ RxDB (IndexedDB)
Service Worker (assets)
RxDB Sync ←→ API (cuando online) ←→ Neon</pre>
  <div class="info">Offline: cash + timers. Online requerido: Point Smart, WhatsApp enqueue sync. Conflictos stock: in-store gana.</div>

  <h2>6. Secuencia crítica (tienda)</h2>
  <div class="mermaid">
sequenceDiagram
  actor C as Cliente
  actor E as Staff
  participant POS as POS
  participant CRM as CRM
  participant MP as MP Adapter
  participant WA as WhatsApp
  C->>E: Llega con mascota
  E->>POS: Busca por tel nombre o mascota
  POS->>CRM: Waiver firmada
  CRM-->>POS: false
  C->>POS: Firma en tablet
  POS->>CRM: Blob y hash
  E->>POS: Fases grooming t0 a t3
  POS->>WA: Pet Ready
  WA-->>C: WhatsApp
  E->>POS: SKUs y servicio a ticket
  POS->>MP: Orden Point
  MP-->>POS: Webhook Approved
  POS->>CRM: Suma lealtad y stock
  </div>

  <h2>7. State machines (referencia)</h2>
  <h3>Grooming</h3>
  <pre>Scheduled → Cancelled
Scheduled → InReception (waiver gate) → InBath (t1) → InHaircut (t2)
→ ReadyForPickup (t3 + GroomingCompleted → WA Pet Ready)
→ DeliveredAndPaid</pre>
  <h3>Order</h3>
  <pre>POS: Draft → PendingPayment → AwaitingPointResponse → Paid|PaymentFailed → Completed
Web: Draft → WebOrderPending → Paid → PendingPickup → Completed</pre>

  <h2>8. RBAC</h2>
  <table>
    <thead><tr><th>Rol</th><th>Auth</th><th>Superficie</th><th>Capabilities</th></tr></thead>
    <tbody>
      <tr><td>Staff</td><td>PIN 4 dígitos</td><td>/tablet</td><td>Check-in, timers, SKUs, TPV, waiver, agenda día</td></tr>
      <tr><td>Admin</td><td>Email + password / magic link</td><td>/admin</td><td>Inventario, precios, analytics, cortes, campañas WA</td></tr>
      <tr><td>Cliente</td><td>WhatsApp OTP</td><td>/ · /portal</td><td>Catálogo Pickup, historial, waiver, lealtad, pre-registro</td></tr>
    </tbody>
  </table>

  <h2>9. Handoff humano</h2>
  <ol>
    <li>MP Developer (sandbox + prod Point)</li>
    <li>Hardware Point Smart + scanner + tablet</li>
    <li>WhatsApp Cloud API + template Pet Ready</li>
    <li>Texto Carta Responsiva</li>
    <li>Seed SKUs JSON/CSV</li>
    <li>Wireframes tablet touch-first</li>
  </ol>
  <p class="meta">Document requests en portal Ops: NDA, brandbook, carta_responsiva, sku_seed, mercadopago_point, whatsapp_cloud_api.</p>

  <h2>10. Corte scaffold / build</h2>
  <ul>
    <li>Docs + ADRs + freeze en Ops packs (<code>client-packs/kan-club</code>)</li>
    <li>Pendiente track de código: Next.js stub /, /portal, /tablet, /admin, /api/health, webhook MP stub</li>
    <li>Adapters: <code>lib/mercadopago</code> · <code>lib/whatsapp</code></li>
    <li>Sin schema Neon, sin RxDB, sin remoto GitHub/Vercel de producto aún</li>
  </ul>
  <div class="note">No cotización en este pack — el brief no trae montos. Economics = trabajo aparte si aplica.</div>

  <footer>Kan Club · Arquitectura completa (staff) · Codiva · Spec v1.0.0 · Freeze 2026-10-28</footer>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "strict" });
  </script>
</body>
</html>
$kanclub_completa$ WHERE id = '92000001-0001-4000-8000-0000000000d2';