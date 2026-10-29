UPDATE deliverables SET body_html = '' WHERE id = '92000001-0001-4000-8000-0000000000d1';
UPDATE deliverables SET body_html = coalesce(body_html,'') || '<!DOCTYPE html>
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
      padd' WHERE id = '92000001-0001-4000-8000-0000000000d1';
UPDATE deliverables SET body_html = coalesce(body_html,'') || 'ing: 3px 6px;
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
  </style>
</head>
<body>
  <h1>Kan Club — Arquitectura</h1>
  <p class="meta">
    ERP · CRM · POS · E-commerce Pickup para grooming y retail de mascotas (1 sucursal)<br />
    Arquitectura certificada · 28 de octubre de 2026 · Codiva
  </p>

  <div class="cover-box">
    <strong>Alcance de este documento</stron' WHERE id = '92000001-0001-4000-8000-0000000000d1';
UPDATE deliverables SET body_html = coalesce(body_html,'') || 'g>
    <ul>
      <li>Resumen del producto y alcance MVP</li>
      <li>Actores, superficies y flujo comercial</li>
      <li>Dominios de plataforma y máquinas de estado</li>
      <li>Decisiones cerradas (CL-001…027) y lo que falta del lado humano</li>
    </ul>
  </div>

  <div class="info">
    <strong>Estado.</strong> Arquitectura <em>congelada / lista para build</em> (28 oct 2026).
    Scaffold técnico iniciado; aún sin POS live, Mercado Pago Point ni WhatsApp en producción.
    Tagline web: <em>«El club donde tu mejor amigo se siente como en casa»</em>.
  </div>

  <h2>Índice</h2>
  <ol class="toc">
    <li><a href="#resumen">Resumen ejecutivo</a></li>
    <li><a href="#mvp">MVP y fuera de alcance</a></li>
    <li><a href="#actores">Actores</a></li>
    <li><a href="#flujo">Flujo comercial</a></li>
    <li><a href="#dominios">Dominios</a></li>
    <li><a href="#grooming">Estados de grooming</a></li>
    <li><a href="#pedido">Estados de pedido</a></li>
    <li><a href="#landing">Landing y e-commerce</a></li>
    <li><a href="#stack">Stack</a></li>
    <li><a href="#humano">Checklist humano</a></li>
  </ol>

  <h2 id="resumen">1. Resumen ejecutivo</h2>
  <p>
    Kan Club centraliza la operación de un salón de grooming con retail físico y tienda en línea
    <strong>solo Pickup (Click &amp; Collect)</strong>. El personal opera en <strong>una sola tablet</strong>:
    check-in, timers de grooming, escaneo de SKUs, lealtad y cobro con terminal Mercado Pago Point Smart.
  </p>
  <pre>Cliente + Mascota → Pre-registro / Walk-in → Carta respo' WHERE id = '92000001-0001-4000-8000-0000000000d1';
UPDATE deliverables SET body_html = coalesce(body_html,'') || 'nsiva (1 vez)
→ Fases grooming (timestamps) + carrito retail → POS (Mercado Pago)
→ Stock y lealtad sincronizados · WhatsApp «Tu mascota está lista»</pre>

  <h2 id="mvp">2. MVP y fuera de alcance</h2>
  <h3>Incluye</h3>
  <ul>
    <li>Inventario único sincronizado POS ↔ web</li>
    <li>Grooming con fases y timestamps (Recepción → Baño → Corte/Secado → Listo)</li>
    <li>Carta responsiva digital en tablet (una vez por cliente)</li>
    <li>Ticket unificado servicios + productos; Point Smart + fallback efectivo/transferencia/link</li>
    <li>Web: e-commerce Pickup, estimador de grooming, CTA WhatsApp para agendar, portal Mi Mascota (OTP)</li>
    <li>Lealtad presencial 6 visitas (3ª 20% premios · 4ª premio gratis · 6ª 50% grooming/baño)</li>
    <li>WhatsApp outbound: Pet Ready, recordatorios, recompra de alimento</li>
  </ul>
  <h3>No incluye (MVP)</h3>
  <ol>
    <li>Multi-sucursal / franquicia</li>
    <li>CFDI 4.0 automático</li>
    <li>App nativa iOS/Android (sí PWA tablet + web responsive)</li>
    <li>Envíos a domicilio</li>
    <li>Bot de IA inbound en WhatsApp (solo outbound; respuestas las atiende el staff)</li>
  </ol>

  <h2 id="actores">3. Actores</h2>
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
        <td>Staff (tablet)<' WHERE id = '92000001-0001-4000-8000-0000000000d1';
UPDATE deliverables SET body_html = coalesce(body_html,'') || '/td>
        <td>Operador</td>
        <td>Check-in, timers, SKUs, TPV, waiver, PIN rápido</td>
        <td>Editar listas de precio ni exportar finanzas globales</td>
      </tr>
      <tr>
        <td>Admin / dueño</td>
        <td>Superusuario</td>
        <td>Precios, inventario, lealtad, campañas, métricas, cortes</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>

  <h2 id="flujo">4. Flujo comercial</h2>
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

  <h2 id="dominios">5. Dominios de plataforma</h2>
  <ol>
    <li><strong>CRM y mascotas</strong> — clientes, perfiles, notas, waiver, lealtad</li>
    <li><strong>Agenda y grooming</strong> — calendario master (staff), fases y timestamps</li>
    <li><strong>Catálogo e inventario</strong> — SKUs productos/servicios; POS manda sobre stock web</li>
    <li><strong>Ventas y POS</strong> — ticket, cortes de caja, offline, pagos</li>
    <li><strong>Notificaciones</strong> — WhatsApp outbound</li>
    <li><strong>Plataforma</strong> — PIN staff, RBAC, auditoría, reportes de tiempos</li>
  </ol>

  <h2 id="grooming">6. Estados de grooming</h2>
  <div class="mermaid">
stateDiagram-v2
  [*] --> Scheduled' WHERE id = '92000001-0001-4000-8000-0000000000d1';
UPDATE deliverables SET body_html = coalesce(body_html,'') || '
  Scheduled --> Cancelled
  Scheduled --> InReception: Llega mascota
  note right of InReception: Gate: waiver si falta
  InReception --> InBath: Baño
  InBath --> InHaircut: Corte/secado
  InHaircut --> ReadyForPickup: Completo + WhatsApp
  ReadyForPickup --> DeliveredAndPaid: Entrega + ticket
  DeliveredAndPaid --> [*]
  </div>
  <p class="meta">Fases flexibles (CL-016): se permiten saltos, prepago o pago al final. Timestamps silenciosos (CL-017).</p>

  <h2 id="pedido">7. Estados de pedido</h2>
  <div class="mermaid">
stateDiagram-v2
  [*] --> Draft
  Draft --> PendingPayment: Checkout POS
  PendingPayment --> AwaitingPointResponse: Point Smart
  AwaitingPointResponse --> Paid: Webhook Approved
  AwaitingPointResponse --> PaymentFailed: Reject/timeout
  PaymentFailed --> PendingPayment: Cash / Transfer / link
  Paid --> Completed: Stock + lealtad
  Draft --> WebOrderPending: Pedido web Pickup
  WebOrderPending --> Paid
  Paid --> PendingPickup
  PendingPickup --> Completed: Recoge en tienda
  </div>

  <h2 id="landing">8. Landing y e-commerce</h2>
  <ol>
    <li>Hero + CTAs <strong>Comprar en línea (Pickup)</strong> y <strong>Agendar por WhatsApp</strong></li>
    <li>Estimador interactivo (tamaño / tipo de pelo)</li>
    <li>Tienda: Alimento Premium, Premios Naturales, Accesorios, Higiene</li>
    <li>Sección lealtad 6 visitas</li>
    <li>Portal Mi Mascota (OTP WhatsApp)</li>
  </ol>

  <h2 id="stack">9. Stack</h2>
  <table>
    <thead><tr><th>Capa</th><th>Tecnología</th></tr></thead>
    <tbody>
      <tr><td>App / API</td><td' WHERE id = '92000001-0001-4000-8000-0000000000d1';
UPDATE deliverables SET body_html = coalesce(body_html,'') || '>Next.js (App Router) en Vercel · PWA tablet</td></tr>
      <tr><td>Offline tablet</td><td>RxDB / IndexedDB</td></tr>
      <tr><td>Base de datos</td><td>Neon Postgres (Marketplace Vercel)</td></tr>
      <tr><td>Cache / cola</td><td>Upstash Redis (Marketplace)</td></tr>
      <tr><td>Archivos</td><td>Vercel Blob (firmas waiver)</td></tr>
      <tr><td>Pagos</td><td>Mercado Pago Point Smart (webhook)</td></tr>
      <tr><td>Mensajería</td><td>WhatsApp Cloud API outbound</td></tr>
    </tbody>
  </table>

  <h2 id="humano">10. Checklist humano (pre-build)</h2>
  <ol>
    <li>Cuenta desarrollador Mercado Pago (sandbox + producción Point Smart)</li>
    <li>Terminal Point Smart + escáner + tablet</li>
    <li>WhatsApp Cloud API + plantilla «Pet Ready»</li>
    <li>Texto legal final de Carta Responsiva</li>
    <li>Seed de SKUs / precios / servicios</li>
    <li>Wireframes touch-first de tablet</li>
  </ol>
  <div class="note">
    Estos ítems no reabren la arquitectura; se gestionan como documentos / accesos en el portal Codiva.
  </div>

  <footer>
    Kan Club · Arquitectura portal · Codiva · v1.0.0 · Freeze 2026-10-28 · Contacto cliente: Luis Vaca
  </footer>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "strict" });
  </script>
</body>
</html>
' WHERE id = '92000001-0001-4000-8000-0000000000d1';