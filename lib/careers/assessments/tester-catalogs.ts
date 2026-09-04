import type { AssessmentCatalog, AssessmentQuestion } from './types';

function catalog(
  key: string,
  title: string,
  intro: string,
  questions: AssessmentQuestion[]
): AssessmentCatalog {
  return {
    key,
    title,
    intro,
    questionCount: 8,
    timeLimitSec: 15 * 60,
    passPct: 70,
    questions,
  };
}

export const TESTER_FRONTEND: AssessmentCatalog = catalog(
  'tester-frontend',
  'Prueba de criterio · Tester frontend',
  'Ocho situaciones de testing de interfaz en productos a la medida. No buscamos que programes el front: buscamos que sepas qué romper, cómo reportarlo y qué no es un bug. Tienes 15 minutos. Al aprobar, reportas un hallazgo de tu oficio en el sitio. Sin las dos partes no se habilita el CV.',
  [
    {
      id: 'tf-empty-error-loading',
      competency: 'Estados',
      type: 'multi',
      points: 2,
      prompt:
        'Vas a probar un formulario de alta. Marca todo lo que tienes que ver antes de darlo por «listo».',
      options: [
        { key: 'a', label: 'Vacío: validación, foco y mensaje cuando se envía sin datos.' },
        { key: 'b', label: 'Error de servidor: el usuario entiende qué pasó y puede reintentar.' },
        { key: 'c', label: 'Carga: no se puede mandar dos veces ni parece colgado.' },
        { key: 'd', label: 'Éxito: confirmación y el dato aparece donde el flujo promete.' },
        { key: 'e', label: 'Solo que el botón sea del color del Figma.' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    {
      id: 'tf-preference-vs-bug',
      competency: 'Criterio',
      type: 'single',
      points: 2,
      context:
        'El cliente dice: «el botón debería ser más grande». El flujo funciona, hay criterio de aceptación de acción, no de tamaño.',
      prompt: '¿Qué reportas?',
      options: [
        { key: 'a', label: 'Bug bloqueante de UI: se para el release.' },
        {
          key: 'b',
          label:
            'Preferencia / cambio de diseño: se documenta y se confirma con diseño/PM, no se trata como defecto de producto.',
        },
        { key: 'c', label: 'Nada: si funciona, no se deja rastro.' },
        { key: 'd', label: 'Regresión de accesibilidad, siempre.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tf-icon-button',
      competency: 'Accesibilidad',
      type: 'single',
      points: 2,
      prompt:
        'Hay un botón solo con ícono (basura) para borrar un ítem. En teclado llega el foco, pero un lector de pantalla dice «botón». ¿Qué es?',
      options: [
        { key: 'a', label: 'Detalle estético: se ignora.' },
        {
          key: 'b',
          label:
            'Defecto de accesibilidad: falta nombre accesible. Se reporta con pasos de teclado/lector, no como «se ve feo».',
        },
        { key: 'c', label: 'Solo importa si el cliente pidió WCAG en el contrato.' },
        { key: 'd', label: 'Se arregla subiendo el contraste del ícono.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tf-desktop-only',
      competency: 'Cobertura',
      type: 'single',
      points: 2,
      context:
        'El flujo se ve bien en tu monitor. Nadie abrió el viewport chico. El producto es web para operación diaria en laptop y celular.',
      prompt: '¿Qué haces antes de decir «probado»?',
      options: [
        { key: 'a', label: 'Darlo por bueno: si en desktop pasa, el resto es cosmética.' },
        {
          key: 'b',
          label:
            'Probar al menos un ancho chico y un caso táctil de los flujos críticos; documentar qué no cubriste.',
        },
        { key: 'c', label: 'Pedir que diseño entregue 14 mockups más antes de tocar el build.' },
        { key: 'd', label: 'Solo mirar el Lighthouse y copiar el score al ticket.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tf-overlap-report',
      competency: 'Evidencia',
      type: 'multi',
      points: 2,
      prompt: 'Un texto se monta sobre un botón en un ancho concreto. ¿Qué lleva el reporte?',
      options: [
        { key: 'a', label: 'Ancho de viewport, navegador y zoom.' },
        { key: 'b', label: 'Captura o video donde se ve el solape.' },
        { key: 'c', label: 'URL, usuario de prueba y pasos hasta esa pantalla.' },
        { key: 'd', label: '«CSS mal hecho, rehacer el front».' },
        { key: 'e', label: 'Si pasa siempre o solo con un texto largo / idioma.' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    {
      id: 'tf-optimistic-lie',
      competency: 'Estados',
      type: 'single',
      points: 2,
      context:
        'Al guardar, la UI muestra «Listo» al instante. El request falla. Al recargar, el cambio no está.',
      prompt: '¿Cómo lo tratas?',
      options: [
        { key: 'a', label: 'No es bug: el front «se siente rápido».' },
        {
          key: 'b',
          label:
            'Defecto: el usuario recibió un éxito falso. Se reporta con red/fail y el estado al recargar.',
        },
        { key: 'c', label: 'Solo backend: la UI no se menciona.' },
        { key: 'd', label: 'Se espera a que el cliente lo note en UAT.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tf-rank-checkout',
      competency: 'Prioridad',
      type: 'rank',
      points: 2,
      prompt:
        'Antes de un pase a producción de un checkout, ordena qué atacas primero (1 = primero).',
      options: [
        { key: 'a', label: 'Pagar con el medio feliz y ver confirmación + cargo coherente.' },
        { key: 'b', label: 'Error de pago, doble clic y sesión caducada.' },
        { key: 'c', label: 'Tipografía 1 px distinta al mock en el footer.' },
        { key: 'd', label: 'Vacío del carrito y volver atrás sin perder el contexto.' },
      ],
      correct: ['a', 'b', 'd', 'c'],
    },
    {
      id: 'tf-my-machine',
      competency: 'Ambiente',
      type: 'single',
      points: 2,
      prompt: 'En tu Chrome está bien. El cliente en Safari ve la pantalla en blanco. ¿Qué sigue?',
      options: [
        { key: 'a', label: 'Cerrar: «en mi máquina funciona».' },
        {
          key: 'b',
          label:
            'Reproducir en el navegador/ambiente del reporte, aislar y evidenciar; no discutir el gusto del cliente.',
        },
        { key: 'c', label: 'Pedirle que se pase a Chrome y olvidar el ticket.' },
        { key: 'd', label: 'Marcar como no reproducible sin intentar Safari.' },
      ],
      correct: ['b'],
    },
  ]
);

export const TESTER_BACKEND: AssessmentCatalog = catalog(
  'tester-backend',
  'Prueba de criterio · Tester backend',
  'Ocho situaciones de testing de APIs, auth y datos en software a la medida. No buscamos que implementes el servidor: buscamos contratos, permisos y evidencia. Tienes 15 minutos. Al aprobar, reportas un hallazgo de tu oficio en el sitio. Sin las dos partes no se habilita el CV.',
  [
    {
      id: 'tb-200-empty',
      competency: 'Contrato',
      type: 'single',
      points: 2,
      prompt:
        'El endpoint de crear recurso responde 200 con cuerpo vacío. El front no sabe si se creó. El criterio decía devolver el recurso o un id.',
      options: [
        { key: 'a', label: 'Pasa: 200 es éxito.' },
        {
          key: 'b',
          label:
            'Defecto de contrato: status y cuerpo no cumplen lo acordado. Se reporta con request/response.',
        },
        { key: 'c', label: 'Solo es tema del front por no adivinar.' },
        { key: 'd', label: 'Se ignora si en la base sí se insertó.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tb-idor',
      competency: 'Auth',
      type: 'single',
      points: 2,
      context:
        'Con el token del usuario A pides el recurso del usuario B cambiando el id en la URL. El servidor lo entrega.',
      prompt: '¿Qué es?',
      options: [
        { key: 'a', label: 'Detalle: si no está en el UAT del cliente, no se reporta.' },
        {
          key: 'b',
          label:
            'Defecto grave de autorización. Se reporta con usuarios de prueba, ids y respuesta; no se explota más de lo necesario.',
        },
        { key: 'c', label: 'Feature: así es más fácil el soporte.' },
        { key: 'd', label: 'Se avisa por Slack sin ticket ni pasos.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tb-double-post',
      competency: 'Idempotencia',
      type: 'single',
      points: 2,
      prompt: 'Un POST de cobro se dispara dos veces por reintento de red. ¿Qué miras?',
      options: [
        { key: 'a', label: 'Nada: el usuario hizo clic, dos cargos están bien.' },
        {
          key: 'b',
          label:
            'Si el contrato era un cargo, dos cargos son defecto. Evidencia: ids, idempotency key, extracto o filas.',
        },
        { key: 'c', label: 'Solo UI: el backend no se prueba así.' },
        { key: 'd', label: 'Esperar a que finanzas lo note el mes siguiente.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tb-client-only-validation',
      competency: 'Validación',
      type: 'single',
      points: 2,
      prompt:
        'El front no deja mandar un email inválido. Con un cliente HTTP mandas el mismo payload y el API lo acepta.',
      options: [
        { key: 'a', label: 'Pasa: el usuario normal no usa curl.' },
        {
          key: 'b',
          label:
            'Defecto: la regla de negocio tiene que sostenerse en servidor. Se reporta el request que bypassa el front.',
        },
        { key: 'c', label: 'Mejora opcional de UX, no de API.' },
        { key: 'd', label: 'Se cierra porque el linter del front está verde.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tb-api-report',
      competency: 'Evidencia',
      type: 'multi',
      points: 2,
      prompt: 'Marca lo que tiene que llevar un reporte de API para que desarrollo no adivine.',
      options: [
        { key: 'a', label: 'Método, URL, headers relevantes (sin secretos) y cuerpo.' },
        { key: 'b', label: 'Status y cuerpo de respuesta, con hora y ambiente.' },
        { key: 'c', label: 'Resultado esperado vs. obtenido.' },
        { key: 'd', label: 'Pegar el .env de producción «para que lo vean».' },
        { key: 'e', label: 'Usuario/rol de prueba con el que se reprodujo.' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    {
      id: 'tb-rank-auth',
      competency: 'Prioridad',
      type: 'rank',
      points: 2,
      prompt: 'Ordena qué pruebas de un API de cuentas atacas primero (1 = primero).',
      options: [
        { key: 'a', label: 'Login válido y que el token no sirva en el recurso de otro usuario.' },
        { key: 'b', label: 'Campos requeridos y tipos inválidos.' },
        { key: 'c', label: 'Orden alfabético de un campo opcional en un listado secundario.' },
        { key: 'd', label: 'Refresh/expiración de sesión en un flujo crítico.' },
      ],
      correct: ['a', 'd', 'b', 'c'],
    },
    {
      id: 'tb-staging-prod',
      competency: 'Ambiente',
      type: 'single',
      points: 2,
      prompt: 'Staging apunta a un proveedor de pagos real. ¿Qué haces?',
      options: [
        { key: 'a', label: 'Probar con tarjeta real «un poquito» para ver si jala.' },
        {
          key: 'b',
          label:
            'Parar y escalar: no se prueba con dinero/datos reales. Se pide ambiente sandbox y se deja evidencia del riesgo.',
        },
        { key: 'c', label: 'Seguir: si el PM no dijo nada, no es tu problema.' },
        { key: 'd', label: 'Borrar la tabla de cobros a mano y continuar.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tb-pagination',
      competency: 'Contrato',
      type: 'single',
      points: 2,
      prompt:
        'La primera página trae 20. La segunda trae 20 que incluyen 3 de la primera. El cliente pagina en UI.',
      options: [
        { key: 'a', label: 'Cosmético: el usuario puede deduplicar de vista.' },
        {
          key: 'b',
          label:
            'Defecto de listado: duplicados/huecos rompen operación. Se reporta con cursor/offset y dos responses.',
        },
        { key: 'c', label: 'Solo se prueba el totalCount, no las páginas.' },
        { key: 'd', label: 'Se espera a que el front cachee y «se quite».' },
      ],
      correct: ['b'],
    },
  ]
);

export const TESTER_FULLSTACK: AssessmentCatalog = catalog(
  'tester-fullstack',
  'Prueba de criterio · Tester full stack',
  'Ocho situaciones de testing de punta a punta: UI, API y operación. Buscamos que persigas el hueco entre capas, no que «el front se ve bien». Tienes 15 minutos. Al aprobar, reportas un hallazgo de tu oficio en el sitio. Sin las dos partes no se habilita el CV.',
  [
    {
      id: 'ts-ui-ok-api-fail',
      competency: 'Capas',
      type: 'single',
      points: 2,
      context:
        'La pantalla muestra «Guardado». En red el POST va 500. Al recargar, no hay cambio.',
      prompt: '¿Cuál es el reporte correcto?',
      options: [
        { key: 'a', label: 'Cerrar el de UI: se vio el toast.' },
        {
          key: 'b',
          label:
            'Defecto de punta a punta: éxito en UI con fallo de API. Evidencia de red + estado al recargar.',
        },
        { key: 'c', label: 'Dos tickets aislados sin relacionarlos.' },
        { key: 'd', label: 'Esperar a backend; QA de front no mira red.' },
      ],
      correct: ['b'],
    },
    {
      id: 'ts-stale-cache',
      competency: 'Datos',
      type: 'single',
      points: 2,
      prompt:
        'El usuario edita un dato, vuelve al listado y ve el valor viejo. Un refresh fuerte ya muestra el nuevo.',
      options: [
        { key: 'a', label: 'No es bug: que recarguen.' },
        {
          key: 'b',
          label:
            'Defecto de consistencia (cache/revalidación). Se reporta navegación exacta, no solo «a veces tarda».',
        },
        { key: 'c', label: 'Solo diseño: el listado «debería animar».' },
        { key: 'd', label: 'Se ignora si el API en Postman está bien.' },
      ],
      correct: ['b'],
    },
    {
      id: 'ts-flag-mismatch',
      competency: 'Release',
      type: 'single',
      points: 2,
      prompt:
        'El front ya muestra un módulo nuevo. El API de ese módulo no está en el ambiente. La pantalla queda a medias.',
      options: [
        { key: 'a', label: 'El tester «no cubre deploys».' },
        {
          key: 'b',
          label:
            'Hueco de entrega: se reporta el desfase front/API/flag y se bloquea comunicar «listo» al cliente.',
        },
        { key: 'c', label: 'Se oculta el menú a mano en producción y se olvida.' },
        { key: 'd', label: 'Pasa: el diseño ya estaba aprobado.' },
      ],
      correct: ['b'],
    },
    {
      id: 'ts-rank-login',
      competency: 'Investigación',
      type: 'rank',
      points: 2,
      prompt: 'Ticket: «el login no sirve». Ordena cómo investigas (1 = primero).',
      options: [
        { key: 'a', label: 'Reproducir en el ambiente del reporte con usuario de prueba.' },
        { key: 'b', label: 'Ver red: status del auth, cookies/token, redirect.' },
        { key: 'c', label: 'Pedir un rediseño completo del login.' },
        { key: 'd', label: 'Aislar: credencial mala vs. 500 vs. front que no guarda sesión.' },
      ],
      correct: ['a', 'b', 'd', 'c'],
    },
    {
      id: 'ts-contract-drift',
      competency: 'Contrato',
      type: 'multi',
      points: 2,
      prompt: 'El front espera `customerId` y el API ahora manda `customer_id`. ¿Qué haces?',
      options: [
        { key: 'a', label: 'Reproducir el flujo y capturar request/response.' },
        { key: 'b', label: 'Nombrar el campo esperado vs. el recibido.' },
        { key: 'c', label: 'Decidir tú solo el rename en producción.' },
        { key: 'd', label: 'Avisar a front y back: es un hueco de contrato, no «un CSS».' },
        { key: 'e', label: 'Cerrar porque «en JSON da igual».' },
      ],
      correct: ['a', 'b', 'd'],
    },
    {
      id: 'ts-webhook-ui',
      competency: 'Integraciones',
      type: 'single',
      points: 2,
      prompt:
        'El proveedor cobra y manda webhook. La UI de «pagado» no se actualiza. El extracto del proveedor sí muestra el cargo.',
      options: [
        { key: 'a', label: 'Pasa: el dinero ya salió.' },
        {
          key: 'b',
          label:
            'Defecto de consistencia operativa: hay que ver webhook, cola y lo que la UI lee. Evidencia de los tres.',
        },
        { key: 'c', label: 'Solo finanzas, QA no toca webhooks.' },
        { key: 'd', label: 'Pedir al cliente que recargue en una hora.' },
      ],
      correct: ['b'],
    },
    {
      id: 'ts-timezone',
      competency: 'Datos',
      type: 'single',
      points: 2,
      prompt:
        'Una cita se agenda a las 10:00 en México. En el correo sale 16:00. El API guarda UTC.',
      options: [
        { key: 'a', label: 'Nitpick de copy.' },
        {
          key: 'b',
          label:
            'Defecto de zona horaria entre capas. Se reporta con tz del usuario, valor en API y valor renderizado.',
        },
        { key: 'c', label: 'Se cambia el reloj de la laptop de QA y se cierra.' },
        { key: 'd', label: 'Solo pasa si el cliente viaja.' },
      ],
      correct: ['b'],
    },
    {
      id: 'ts-e2e-vs-unit',
      competency: 'Cobertura',
      type: 'single',
      points: 2,
      prompt: 'Hay tests unitarios verdes. El flujo real en staging falla al pagar. ¿Qué pesa más para el pase?',
      options: [
        { key: 'a', label: 'Los unitarios: si CI está verde, se libera.' },
        {
          key: 'b',
          label:
            'El flujo real en el ambiente de entrega. Los unitarios no sustituyen el camino que usa el cliente.',
        },
        { key: 'c', label: 'Ninguno: solo cuenta el UAT del cliente, aunque sea el viernes a las 7.' },
        { key: 'd', label: 'Un screenshot del Figma.' },
      ],
      correct: ['b'],
    },
  ]
);

export const TESTER_UX: AssessmentCatalog = catalog(
  'tester-ux-ui',
  'Prueba de criterio · Tester UX/UI',
  'Ocho situaciones de testing de flujo, copy y usabilidad. No buscamos que rediseñes el producto: buscamos que detectes cuando la interfaz miente, traba o no se puede usar. Tienes 15 minutos. Al aprobar, reportas un hallazgo de tu oficio en el sitio. Sin las dos partes no se habilita el CV.',
  [
    {
      id: 'tu-empty-state',
      competency: 'Flujos',
      type: 'single',
      points: 2,
      prompt:
        'Un listado nuevo no tiene filas. La pantalla queda en blanco, sin texto ni acción para crear el primero.',
      options: [
        { key: 'a', label: 'Pasa: no hay datos, no hay nada que probar.' },
        {
          key: 'b',
          label:
            'Defecto de flujo: falta estado vacío usable. Se reporta con cuenta nueva y lo que el usuario no puede hacer.',
        },
        { key: 'c', label: 'Se pide un illustration contest y se bloquea el release por estética.' },
        { key: 'd', label: 'Solo diseño; QA de UX no abre cuentas vacías.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tu-copy-lie',
      competency: 'Copy',
      type: 'single',
      points: 2,
      prompt:
        'El botón dice «Descargar PDF». Hace una navegación a otra pantalla y no descarga nada.',
      options: [
        { key: 'a', label: 'Preferencia de wording.' },
        {
          key: 'b',
          label:
            'Defecto: la interfaz promete una acción y hace otra. Se reporta esperado vs. obtenido.',
        },
        { key: 'c', label: 'Bien: más páginas = más engagement.' },
        { key: 'd', label: 'Se ignora si el PDF «se puede sacar luego» de otra ruta.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tu-modal-trap',
      competency: 'Accesibilidad',
      type: 'single',
      points: 2,
      prompt:
        'Un modal de confirmación no se cierra con Escape, el foco se queda atrás y no hay botón visible de cancelar en móvil.',
      options: [
        { key: 'a', label: 'Detalle de animación.' },
        {
          key: 'b',
          label:
            'Defecto de uso: el usuario puede quedar atrapado. Se reporta teclado + viewport chico.',
        },
        { key: 'c', label: 'Solo importa en desktop con mouse.' },
        { key: 'd', label: 'Se espera el rediseño del design system el próximo trimestre.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tu-figma-vs-build',
      competency: 'Handoff',
      type: 'single',
      points: 2,
      context:
        'El build no trae el estado de error que sí está en Figma. El flujo en staging no muestra qué falló.',
      prompt: '¿Qué haces?',
      options: [
        { key: 'a', label: 'Cerrar: «el dev no copió el Figma», sin evidencia.' },
        {
          key: 'b',
          label:
            'Reportar el hueco diseño↔build con captura de ambos y el impacto en el flujo; no es un capricho visual.',
        },
        { key: 'c', label: 'Redibujar tú el error en un PNG y sustituir el ticket.' },
        { key: 'd', label: 'Aprobar: el happy path se ve parecido.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tu-ux-report',
      competency: 'Evidencia',
      type: 'multi',
      points: 2,
      prompt: 'Marca lo que sí va en un reporte de usabilidad para que no parezca «me gusta / no me gusta».',
      options: [
        { key: 'a', label: 'Qué intentaba hacer el usuario y dónde se trabó.' },
        { key: 'b', label: 'Pasos, viewport y captura del estado.' },
        { key: 'c', label: 'Si bloquea una tarea o es cosmética.' },
        { key: 'd', label: '«Yo lo habría diseñado distinto», sin tarea concreta.' },
        { key: 'e', label: 'Referencia al criterio o al flujo acordado, si existe.' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    {
      id: 'tu-rank-release',
      competency: 'Severidad',
      type: 'rank',
      points: 2,
      prompt: 'Ordena qué atacas primero el día del pase (1 = primero).',
      options: [
        { key: 'a', label: 'No se puede completar el flujo de dinero o de acceso.' },
        { key: 'b', label: 'El usuario no entiende un error y reintenta mal.' },
        { key: 'c', label: 'El espaciado del hero no calza con el mock.' },
        { key: 'd', label: 'Un estado vacío sin siguiente paso en un módulo secundario.' },
      ],
      correct: ['a', 'b', 'd', 'c'],
    },
    {
      id: 'tu-preference',
      competency: 'Criterio',
      type: 'single',
      points: 2,
      prompt:
        'A ti te gusta más el CTA a la izquierda. El criterio y el diseño aprobado lo ponen a la derecha. El flujo se completa.',
      options: [
        {
          key: 'a',
          label: 'Bug de UX: tu gusto es el estándar.',
        },
        {
          key: 'b',
          label:
            'No es defecto. Si hay un problema real de uso, se argumenta con tarea y evidencia, no con preferencia personal.',
        },
        { key: 'c', label: 'Se cambia en producción sin avisar.' },
        { key: 'd', label: 'Se bloquea el release hasta un workshop de branding.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tu-destructive',
      competency: 'Flujos',
      type: 'single',
      points: 2,
      prompt:
        '«Eliminar organización» está al lado de «Guardar», mismo estilo, sin confirmación. Un clic borra.',
      options: [
        { key: 'a', label: 'Ahorro de clics: bien.' },
        {
          key: 'b',
          label:
            'Defecto de riesgo: acción destructiva sin fricción. Se reporta con el clic y el resultado irreversible.',
        },
        { key: 'c', label: 'Solo si el cliente ya perdió datos.' },
        { key: 'd', label: 'Se resuelve con un tooltip de «ten cuidado».' },
      ],
      correct: ['b'],
    },
  ]
);

export const TESTER_SECURITY: AssessmentCatalog = catalog(
  'tester-security',
  'Prueba de criterio · Tester de seguridad',
  'Ocho situaciones de testing de seguridad de aplicación en software a la medida. No buscamos pentest de red ni explotación: buscamos alcance, autorización, secretos y evidencia sin hacer más daño. Tienes 15 minutos. Al aprobar, reportas un hallazgo de tu oficio en el sitio. Sin las dos partes no se habilita el CV.',
  [
    {
      id: 'tsc-scope-prod',
      competency: 'Alcance',
      type: 'single',
      points: 2,
      context:
        'El cliente escribe: «hazle pentest a producción esta noche, sin avisar, para ver si aguantan».',
      prompt: '¿Qué haces?',
      options: [
        { key: 'a', label: 'Escanear prod ya: si no hay contrato, igual «hay que demostrar valor».' },
        {
          key: 'b',
          label:
            'No se ataca producción sin alcance por escrito. Se propone ambiente de prueba, reglas de engagement y qué queda fuera.',
        },
        { key: 'c', label: 'Pedir las credenciales de admin de prod y «entrar suave».' },
        { key: 'd', label: 'Ignorar el mensaje: seguridad no es cosa de testers.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tsc-idor-stop',
      competency: 'Autorización',
      type: 'single',
      points: 2,
      context:
        'Con el usuario de prueba A cambias el id en la URL y ves la factura del usuario B.',
      prompt: '¿Cuál es el siguiente paso correcto?',
      options: [
        { key: 'a', label: 'Descargar todas las facturas para un ZIP de evidencia.' },
        {
          key: 'b',
          label:
            'Defecto grave de autorización. Se reporta con dos usuarios de prueba, ids y respuesta; no se explota más ni se pivotea.',
        },
        { key: 'c', label: 'Cerrar: si no está en el UAT, no existe.' },
        { key: 'd', label: 'Avisar por WhatsApp sin ticket, pasos ni recorte.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tsc-authn-authz',
      competency: 'Auth',
      type: 'single',
      points: 2,
      prompt:
        'El login funciona. El usuario A, ya dentro, abre `/invoices/id-de-B` y ve datos de B.',
      options: [
        { key: 'a', label: 'Fallo de autenticación: el login está mal.' },
        {
          key: 'b',
          label:
            'Fallo de autorización: la sesión es válida, pero el recurso de otro no debería entregarse. Se reporta así.',
        },
        { key: 'c', label: 'Detalle de UX: el menú no debería mostrar el enlace.' },
        { key: 'd', label: 'Se ignora si A y B son de la misma empresa en staging.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tsc-secret-json',
      competency: 'Secretos',
      type: 'single',
      points: 2,
      prompt: 'Un endpoint público de listado incluye `api_key` en el JSON.',
      options: [
        { key: 'a', label: 'Pasa: si es público, la clave «es para el front».' },
        {
          key: 'b',
          label:
            'Filtración. Se reporta el campo y un recorte; no se pega la clave completa en Slack ni se reutiliza.',
        },
        { key: 'c', label: 'Probar la clave contra otros ambientes para «medir impacto».' },
        { key: 'd', label: 'Solo cuenta si el cliente pidió OWASP en el contrato.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tsc-cookie-flags',
      competency: 'Cookies',
      type: 'single',
      points: 2,
      prompt:
        'En DevTools una cookie que parece de sesión no trae HttpOnly. El producto maneja cuentas reales.',
      options: [
        { key: 'a', label: 'Cosmético: las banderas de cookie no se prueban.' },
        {
          key: 'b',
          label:
            'Defecto: un script podría leerla. Se reportan nombre y banderas; no se secuestran sesiones de nadie.',
        },
        { key: 'c', label: 'Se abre la sesión de un cliente real para demostrar el robo.' },
        { key: 'd', label: 'Se espera a que alguien reporte XSS y entonces sí importa.' },
      ],
      correct: ['b'],
    },
    {
      id: 'tsc-report-multi',
      competency: 'Evidencia',
      type: 'multi',
      points: 2,
      prompt: 'Marca lo que sí va en un hallazgo de seguridad para que no parezca un ataque.',
      options: [
        { key: 'a', label: 'URL, método y ambiente.' },
        { key: 'b', label: 'Impacto: quién podría ver o hacer qué.' },
        { key: 'c', label: 'Usuarios de prueba, no cuentas reales de clientes.' },
        { key: 'd', label: 'Pegar un dump de PII «para que lo vean».' },
        { key: 'e', label: 'Dejar constancia de que no se explotó más de lo necesario.' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    {
      id: 'tsc-rank-severity',
      competency: 'Severidad',
      type: 'rank',
      points: 2,
      prompt: 'Ordena de mayor a menor severidad para un producto con cuentas reales (1 = primero).',
      options: [
        { key: 'a', label: 'Un usuario autenticado lee facturas de otro (autorización).' },
        { key: 'b', label: 'Cookie de sesión sin flag Secure en un sitio HTTPS.' },
        { key: 'c', label: 'Falta Content-Security-Policy en la landing de marketing.' },
        { key: 'd', label: '«Yo habría usado Argon2 en vez de bcrypt», sin evidencia de fallo.' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    {
      id: 'tsc-hidden-admin',
      competency: 'Autorización',
      type: 'single',
      points: 2,
      prompt:
        'El botón «Admin» está oculto en el front para el rol user. Con el mismo token, GET /api/admin/users responde 200.',
      options: [
        { key: 'a', label: 'Pasa: el usuario normal no ve el botón.' },
        {
          key: 'b',
          label:
            'Defecto de autorización en servidor. Se reporta el request; no se recorre el panel ni se crea un admin.',
        },
        { key: 'c', label: 'Solo CSS: se pide un `display:none` más agresivo.' },
        { key: 'd', label: 'Se publica el endpoint en redes para «presión».' },
      ],
      correct: ['b'],
    },
  ]
);

export const TESTER_GENERAL: AssessmentCatalog = catalog(
  'tester-general',
  'Tester Integral',
  'Examen de criterio — selección múltiple. 8 preguntas · tiempo estimado: 15 minutos. Al aprobar, reportas un hallazgo de cada tipo de prueba en el sitio (funcional, de API y de seguridad). El tablero muestra lo encontrado y lo que falta. Sin las dos partes no se habilita el CV.',
  [
    {
      id: 'ti-tipos-prueba',
      competency: 'Tipos de prueba',
      type: 'single',
      points: 1,
      prompt: '¿Cuál describe mejor una prueba unitaria?',
      options: [
        { key: 'a', label: 'Verifica un flujo completo de usuario en el navegador' },
        {
          key: 'b',
          label: 'Verifica una unidad pequeña de código (función o método) de forma aislada',
        },
        { key: 'c', label: 'Verifica el rendimiento del sistema con muchos usuarios simultáneos' },
      ],
      correct: ['b'],
    },
    {
      id: 'ti-pruebas-funcionales',
      competency: 'Pruebas funcionales',
      type: 'single',
      points: 1,
      prompt: 'En una prueba funcional, ¿qué se valida principalmente?',
      options: [
        {
          key: 'a',
          label: 'Que el sistema cumpla el comportamiento esperado según requisitos o reglas de negocio',
        },
        { key: 'b', label: 'Que el servidor soporte miles de usuarios concurrentes' },
        { key: 'c', label: 'Que el código fuente esté bien indentado' },
      ],
      correct: ['a'],
    },
    {
      id: 'ti-api-postman',
      competency: 'API / Postman',
      type: 'single',
      points: 1,
      prompt:
        'Al probar con Postman un POST /usuarios que crea un recurso, ¿qué indica normalmente una creación exitosa?',
      options: [
        { key: 'a', label: 'Código HTTP 200 o 201 y un cuerpo coherente con lo creado' },
        { key: 'b', label: 'Código HTTP 500 con mensaje “OK”' },
        { key: 'c', label: 'Código HTTP 404 porque el recurso aún no existía' },
      ],
      correct: ['a'],
    },
    {
      id: 'ti-casos-unitarios',
      competency: 'Diseño de casos de prueba unitarios',
      type: 'single',
      points: 1,
      context:
        'Función: aplicarDescuento\nRecibe un precio y un porcentaje de descuento.\nEl precio debe ser un número mayor que cero.\nEl porcentaje debe ser un número entre 0 y 100, ambos inclusive.\nSi las entradas son válidas, devuelve el precio final después de aplicar el descuento.\nSi el precio o el porcentaje no cumplen esas reglas, la operación se rechaza (error / no aplica el descuento).',
      prompt:
        'A partir de la siguiente descripción (fragmento de especificación), ¿cuál diseño de casos de prueba es el más correcto y completo?',
      options: [
        {
          key: 'a',
          label:
            '1. Descuento habitual — precio 100, porcentaje 10 → precio final 90',
        },
        {
          key: 'b',
          label:
            '1. Descuento habitual — precio 100, porcentaje 10 → precio final 90\n2. Sin descuento (límite inferior) — precio 100, porcentaje 0 → precio final 100\n3. Descuento total (límite superior) — precio 100, porcentaje 100 → precio final 0\n4. Otro valor válido — precio 50, porcentaje 50 → precio final 25\n5. Precio inválido (cero) — precio 0, porcentaje 10 → rechazo / error\n6. Precio inválido (negativo) — precio -10, porcentaje 10 → rechazo / error\n7. Porcentaje por debajo del rango — precio 100, porcentaje -5 → rechazo / error\n8. Porcentaje por encima del rango — precio 100, porcentaje 101 → rechazo / error',
        },
        {
          key: 'c',
          label:
            '1. Descuento habitual — precio 100, porcentaje 10 → precio final 90\n2. Mismo escenario otra vez — precio 100, porcentaje 10 → precio final 90\n3. Flujo de compra en pantalla — el usuario abre la tienda, agrega un producto y aplica un cupón → la compra muestra descuento',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'ti-criterio-profesional',
      competency: 'Criterio profesional',
      type: 'single',
      points: 1,
      prompt: 'Un fallo solo ocurre “a veces”. ¿Cuál es la mejor primera acción?',
      options: [
        { key: 'a', label: 'Reportarlo sin pasos porque es intermitente' },
        {
          key: 'b',
          label:
            'Intentar reproducirlo, anotar condiciones (datos, ambiente, pasos) y reportar con evidencia',
        },
        { key: 'c', label: 'Esperar a que un usuario lo reporte en producción' },
      ],
      correct: ['b'],
    },
    {
      id: 'ti-jmeter',
      competency: 'Rendimiento / carga (JMeter)',
      type: 'single',
      points: 1,
      prompt: '¿Para qué se usa principalmente JMeter?',
      options: [
        { key: 'a', label: 'Diseñar la interfaz visual de la aplicación' },
        {
          key: 'b',
          label:
            'Simular carga (usuarios o peticiones) y observar tiempos de respuesta y estabilidad',
        },
        { key: 'c', label: 'Sustituir por completo las pruebas unitarias' },
      ],
      correct: ['b'],
    },
    {
      id: 'ti-seguridad',
      competency: 'Seguridad',
      type: 'single',
      points: 1,
      prompt: 'Al probar una API de inicio de sesión, ¿qué enfoque es el más adecuado?',
      options: [
        { key: 'a', label: 'Probar solo el acceso con usuario y contraseña correctos' },
        {
          key: 'b',
          label:
            'Probar también credenciales inválidas, acceso sin token y que no se expongan datos sensibles en la respuesta',
        },
        { key: 'c', label: 'Desactivar HTTPS para inspeccionar el tráfico con más facilidad' },
      ],
      correct: ['b'],
    },
    {
      id: 'ti-automatizacion',
      competency: 'Automatización',
      type: 'single',
      points: 1,
      prompt: '¿Qué conviene automatizar primero?',
      options: [
        {
          key: 'a',
          label:
            'Escenarios estables, repetitivos y de alto valor (por ejemplo, login y una API crítica)',
        },
        { key: 'b', label: 'Solo las pantallas con mejor diseño visual' },
        {
          key: 'c',
          label: 'Todo el sistema de punta a punta desde el primer día, sin pruebas unitarias',
        },
      ],
      correct: ['a'],
    },
  ]
);
