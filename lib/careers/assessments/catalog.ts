import type { AssessmentCatalog } from './types';
import {
  TESTER_BACKEND,
  TESTER_FRONTEND,
  TESTER_FULLSTACK,
  TESTER_GENERAL,
  TESTER_SECURITY,
  TESTER_UX,
} from './tester-catalogs';

const PM: AssessmentCatalog = {
  key: 'project-manager',
  title: 'Prueba de criterio operativo',
  intro:
    'Ocho situaciones reales de un estudio que entrega software a la medida. No hay truco de jerga: buscamos criterio, claridad con el cliente y cuándo escalar. Tienes 15 minutos. Hay que aprobarla para postular.',
  questionCount: 8,
  timeLimitSec: 15 * 60,
  passPct: 70,
  questions: [
    {
      id: 'pm-scope-mid-sprint',
      competency: 'Alcance',
      type: 'single',
      points: 2,
      context:
        'El sprint de esta semana ya está comprometido. El demo con el cliente es el jueves. El miércoles el cliente escribe: «¿podemos meter también el dashboard de métricas esta semana?»',
      prompt: '¿Qué haces primero?',
      options: [
        {
          key: 'a',
          label:
            'Aceptar para no tensar la relación y pedir al equipo que «lo saque como pueda» antes del demo.',
        },
        {
          key: 'b',
          label:
            'Agradecer, explicitar el impacto en el demo y proponer: entra ahora (sale otra cosa) o entra en el siguiente ciclo, con fecha.',
        },
        {
          key: 'c',
          label: 'Ignorar el mensaje hasta después del demo para no distraer al equipo.',
        },
        {
          key: 'd',
          label: 'Decir que no se puede, sin ofrecer alternativa ni fecha.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'pm-done-without-uat',
      competency: 'Calidad de entrega',
      type: 'single',
      points: 2,
      context:
        'Un desarrollador marca un flujo como «listo». No hay evidencia de prueba en staging ni criterios de aceptación cerrados. El cliente pregunta si ya puede usarlo.',
      prompt: '¿Cuál es el siguiente paso correcto?',
      options: [
        {
          key: 'a',
          label: 'Avisar al cliente que ya está listo: el equipo dijo done.',
        },
        {
          key: 'b',
          label:
            'Pedir evidencia mínima (staging + criterios) y no comunicar «listo» al cliente hasta tenerla.',
        },
        {
          key: 'c',
          label: 'Abrir un ticket de QA genérico y seguir con otra cosa; el cliente puede esperar.',
        },
        {
          key: 'd',
          label: 'Pasar a producción para que el cliente lo vea «de verdad».',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'pm-two-stakeholders',
      competency: 'Stakeholders',
      type: 'single',
      points: 2,
      context:
        'Operaciones quiere priorizar un reporte interno. Comercial quiere priorizar un flujo de alta de clientes. Ambos dicen que es «lo más urgente». El equipo solo puede atacar uno esta semana.',
      prompt: '¿Cómo destrabas esto?',
      options: [
        {
          key: 'a',
          label: 'Elegir tú en silencio según quién escribe más seguido.',
        },
        {
          key: 'b',
          label: 'Hacer las dos a medias para que nadie se queje.',
        },
        {
          key: 'c',
          label:
            'Traer a ambos a una alineación corta: impacto, fecha de valor y riesgo. Documentar la decisión y el trade-off.',
        },
        {
          key: 'd',
          label: 'Escalar de inmediato a dirección sin haber intentado alinear.',
        },
      ],
      correct: ['c'],
    },
    {
      id: 'pm-escalate-when',
      competency: 'Escalamiento',
      type: 'single',
      points: 2,
      prompt: '¿En cuál de estos casos debes escalar a dirección de Codiva, no resolverlo solo?',
      options: [
        {
          key: 'a',
          label: 'El cliente pide mover una demo 24 horas y el equipo puede acomodarlo.',
        },
        {
          key: 'b',
          label:
            'El cliente pide un cambio que mueve fecha de entrega o costo, y no hay holgura acordada.',
        },
        {
          key: 'c',
          label: 'Un ticket de copy en un correo transaccional.',
        },
        {
          key: 'd',
          label: 'Reordenar dos bugs menores dentro del mismo sprint ya comprometido.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'pm-status-update',
      competency: 'Comunicación',
      type: 'multi',
      points: 2,
      prompt:
        'Un estatus semanal al cliente de un proyecto a la medida. Marca todo lo que sí debe ir (y nada de relleno).',
      options: [
        { key: 'a', label: 'Qué se entregó o avanzó desde el último corte, en lenguaje de negocio.' },
        { key: 'b', label: 'Bloqueos y decisiones pendientes, con dueño y fecha.' },
        { key: 'c', label: 'El detalle de cada commit y cada archivo tocado.' },
        { key: 'd', label: 'Próximo hito visible y si la fecha sigue en pie o hay riesgo.' },
        { key: 'e', label: 'Opiniones internas del equipo sobre el cliente.' },
      ],
      correct: ['a', 'b', 'd'],
    },
    {
      id: 'pm-skip-qa',
      competency: 'Riesgo',
      type: 'single',
      points: 2,
      context:
        'El cliente insiste en saltarse QA para «llegar al viernes». El flujo toca login y un pago. El equipo avisa que no hay regresión hecha.',
      prompt: '¿Qué haces?',
      options: [
        {
          key: 'a',
          label: 'Aceptar: el cliente asume el riesgo con un mensaje informal en chat.',
        },
        {
          key: 'b',
          label:
            'Explicar el riesgo concreto (login/pago), ofrecer un recorte de alcance que sí se pueda validar, y no pasar a producción a ciegas.',
        },
        {
          key: 'c',
          label: 'Pasar a producción y abrir un ticket de QA «para la semana que entra».',
        },
        {
          key: 'd',
          label: 'Cancelar el proyecto hasta que el cliente deje de presionar.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'pm-no-ac',
      competency: 'Claridad',
      type: 'single',
      points: 1,
      prompt:
        'Llega un ticket: «Arreglar el dashboard». No hay criterio de aceptación ni ejemplo de lo que está mal. El desarrollador pregunta por dónde empezar.',
      options: [
        {
          key: 'a',
          label: 'Pedirle que «revise el dashboard y vea qué se siente raro».',
        },
        {
          key: 'b',
          label:
            'Parar: completar qué está mal, para quién, resultado esperado y cómo se va a verificar, antes de estimar o construir.',
        },
        {
          key: 'c',
          label: 'Estimarlo en 8 horas para no bloquear el tablero.',
        },
        {
          key: 'd',
          label: 'Asignarlo a QA para que ellos adivinen los casos.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'pm-priority-rank',
      competency: 'Priorización',
      type: 'rank',
      points: 2,
      prompt:
        'Ordena de primero a último qué comunicarías hoy al cliente. (1 = lo más urgente de comunicar.)',
      options: [
        { key: 'a', label: 'Un bloqueo que impide el hito de esta semana si no se decide hoy.' },
        { key: 'b', label: 'Un ajuste visual menor que no afecta el flujo comprometido.' },
        { key: 'c', label: 'Una idea de mejora para un módulo que no está en el alcance actual.' },
        { key: 'd', label: 'El recordatorio de la demo ya agendada, con liga y agenda.' },
      ],
      correct: ['a', 'd', 'b', 'c'],
    },
    {
      id: 'pm-estimate-vs-commit',
      competency: 'Expectativas',
      type: 'single',
      points: 2,
      prompt: 'El cliente pregunta «¿cuándo queda?». El equipo tiene una estimación, no un compromiso. ¿Qué contestas?',
      options: [
        {
          key: 'a',
          label: 'La fecha de la estimación, como si fuera una promesa.',
        },
        {
          key: 'b',
          label:
            'La estimación con su incertidumbre, de qué depende, y cuándo se convierte en fecha comprometida.',
        },
        {
          key: 'c',
          label: '«Pronto» para no quedar mal.',
        },
        {
          key: 'd',
          label: 'Una fecha más holgada en secreto, sin decir el criterio.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'pm-change-cost',
      competency: 'Alcance',
      type: 'single',
      points: 1,
      prompt:
        'Un «pequeño cambio» del cliente implica rehacer un flujo ya aceptado en UAT. ¿Cuál es la lectura correcta?',
      options: [
        {
          key: 'a',
          label: 'Si es pequeño para el cliente, es pequeño para el equipo.',
        },
        {
          key: 'b',
          label:
            'Es un cambio de alcance: se estima impacto (tiempo/costo), se acuerda, y recién entonces entra.',
        },
        {
          key: 'c',
          label: 'Se hace gratis para cuidar la relación, siempre.',
        },
        {
          key: 'd',
          label: 'Se rechaza por principio, aunque el impacto sea de una hora y esté presupuestado.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'pm-handoff',
      competency: 'Proceso',
      type: 'single',
      points: 1,
      context:
        'Diseño entrega pantallas. Desarrollo dice que faltan estados vacíos, errores y el caso móvil. El cliente ya vio el Figma y cree que «ya está».',
      prompt: '¿Qué haces?',
      options: [
        {
          key: 'a',
          label: 'Pedir a desarrollo que improvise los estados para no retrasar.',
        },
        {
          key: 'b',
          label:
            'Hacer explícito el hueco, completar el handoff (estados, errores, móvil) y alinear con el cliente qué entra en esta entrega.',
        },
        {
          key: 'c',
          label: 'Culpar a diseño en el hilo del cliente.',
        },
        {
          key: 'd',
          label: 'Saltar a producción con lo que hay en Figma.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'pm-risk-demo',
      competency: 'Riesgo',
      type: 'single',
      points: 1,
      context:
        'Faltan dos días para la demo. La persona de diseño está bloqueada por un acceso que el cliente no ha dado. El flujo a mostrar depende de esas pantallas.',
      prompt: '¿Cuál es la jugada más sana?',
      options: [
        {
          key: 'a',
          label: 'Esperar en silencio a que el acceso llegue.',
        },
        {
          key: 'b',
          label:
            'Escalar el acceso hoy, armar un plan B de demo (lo que sí se puede mostrar) y avisar el riesgo con tiempo.',
        },
        {
          key: 'c',
          label: 'Cancelar la demo sin ofrecer alternativa.',
        },
        {
          key: 'd',
          label: 'Inventar las pantallas en la demo y «ya lo ajustamos después».',
        },
      ],
      correct: ['b'],
    },
  ],
};

const QA: AssessmentCatalog = {
  key: 'tester-qa',
  title: 'Prueba de criterio · Tester QA',
  intro:
    'Ocho situaciones de testing transversal en productos a la medida que operan negocios reales. Buscamos reportes reproducibles, criterio de severidad y no confundir un defecto con una preferencia. Tienes 15 minutos. Al aprobar, reportas un hallazgo de tu oficio en el sitio. Sin las dos partes no se habilita el CV.',
  questionCount: 8,
  timeLimitSec: 15 * 60,
  passPct: 70,
  questions: [
    {
      id: 'qa-severity-vs-priority',
      competency: 'Severidad',
      type: 'single',
      points: 2,
      prompt: '¿Cuál describe mejor la diferencia entre severidad y prioridad?',
      options: [
        {
          key: 'a',
          label: 'Son lo mismo: si es grave, se arregla ya.',
        },
        {
          key: 'b',
          label:
            'Severidad = impacto en el producto/usuario. Prioridad = cuándo conviene atacarlo dado el negocio y la entrega.',
        },
        {
          key: 'c',
          label: 'Prioridad la pone QA; severidad la pone el cliente.',
        },
        {
          key: 'd',
          label: 'Severidad es cuántos casos de prueba fallaron.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'qa-bug-report-missing',
      competency: 'Evidencia',
      type: 'multi',
      points: 2,
      prompt:
        'Un reporte dice: «El login no sirve». Marca todo lo que le falta para que desarrollo pueda actuar sin adivinar.',
      options: [
        { key: 'a', label: 'Pasos concretos para reproducir, en orden.' },
        { key: 'b', label: 'Resultado esperado vs. resultado obtenido.' },
        { key: 'c', label: 'Ambiente (URL, usuario de prueba, navegador) y evidencia (captura o video).' },
        { key: 'd', label: 'Una opinión sobre si al desarrollador «le falta experiencia».' },
        { key: 'e', label: 'Frecuencia: siempre, a veces, solo con un rol o dato.' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    {
      id: 'qa-bug-vs-preference',
      competency: 'Criterio',
      type: 'single',
      points: 2,
      prompt:
        'El cliente dice: «El botón debería ser más verde». No hay criterio de aceptación de color. El flujo funciona. ¿Qué es?',
      options: [
        {
          key: 'a',
          label: 'Defecto bloqueante: hay que parar el release.',
        },
        {
          key: 'b',
          label:
            'Preferencia / cambio de diseño: se documenta, se confirma con diseño/PM, no se reporta como bug de producto.',
        },
        {
          key: 'c',
          label: 'Regresión crítica de accesibilidad, siempre.',
        },
        {
          key: 'd',
          label: 'Se ignora por completo, sin dejar rastro.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'qa-regression',
      competency: 'Regresión',
      type: 'single',
      points: 2,
      context:
        'Se corrigió un error en el alta de usuarios. El desarrollador dice que ya está. Tú verificas el alta y funciona.',
      prompt: '¿Qué más haces antes de cerrar?',
      options: [
        {
          key: 'a',
          label: 'Nada: el caso reportado ya pasa.',
        },
        {
          key: 'b',
          label:
            'Reverificar el caso original y los flujos vecinos (login, roles, listado, un caso de error) por si el arreglo rompió otra cosa.',
        },
        {
          key: 'c',
          label: 'Pedir al cliente que lo pruebe él en producción.',
        },
        {
          key: 'd',
          label: 'Abrir un ticket nuevo genérico de «revisar todo el sistema».',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'qa-cant-repro',
      competency: 'Investigación',
      type: 'single',
      points: 2,
      prompt: 'No puedes reproducir un defecto que el cliente reportó en una llamada. ¿Qué haces?',
      options: [
        {
          key: 'a',
          label: 'Cerrarlo como «no es bug» el mismo día.',
        },
        {
          key: 'b',
          label:
            'Pedir datos que falten (usuario, hora, URL, captura), intentar en el mismo ambiente y dejar constancia de lo intentado. No descartar a ciegas.',
        },
        {
          key: 'c',
          label: 'Insistir en que el cliente se equivocó.',
        },
        {
          key: 'd',
          label: 'Marcarlo crítico y exigir un hotfix sin evidencia.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'qa-auth-paths',
      competency: 'Cobertura',
      type: 'multi',
      points: 2,
      prompt:
        'Vas a probar un flujo de inicio de sesión nuevo. Además del happy path (credenciales correctas), ¿qué sí deberías cubrir?',
      options: [
        { key: 'a', label: 'Contraseña incorrecta y usuario inexistente: mensaje y que no entre.' },
        { key: 'b', label: 'Sesión expirada o cierre de sesión: no deja datos de otro usuario.' },
        { key: 'c', label: 'Solo el diseño del botón en Figma, sin ejecutar el flujo.' },
        { key: 'd', label: 'Recuperación de contraseña o el error de red, si existen en el alcance.' },
        { key: 'e', label: 'Entrar con un rol y verificar que no vea pantallas de otro rol.' },
      ],
      correct: ['a', 'b', 'd', 'e'],
    },
    {
      id: 'qa-uat-vs-qa',
      competency: 'UAT',
      type: 'single',
      points: 1,
      prompt: '¿Cuál es la distinción más útil entre QA del estudio y UAT del cliente?',
      options: [
        {
          key: 'a',
          label: 'UAT reemplaza a QA: si el cliente no se queja, está bien.',
        },
        {
          key: 'b',
          label:
            'QA verifica que lo construido cumple criterios y no rompe lo anterior. UAT confirma que sirve al negocio del cliente en su operación.',
        },
        {
          key: 'c',
          label: 'QA solo mira UI; UAT solo mira APIs.',
        },
        {
          key: 'd',
          label: 'No hay diferencia; son dos nombres para lo mismo.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'qa-env-mismatch',
      competency: 'Ambientes',
      type: 'single',
      points: 2,
      prompt: 'En staging el flujo pasa. En producción el cliente ve un error. ¿Qué no debes hacer?',
      options: [
        {
          key: 'a',
          label: 'Comparar versión desplegada, datos y configuración entre ambientes.',
        },
        {
          key: 'b',
          label: 'Reproducir con una cuenta equivalente a la del cliente, no solo con la tuya de prueba.',
        },
        {
          key: 'c',
          label:
            'Cerrar el ticket porque «en staging sí jala», sin mirar producción ni evidenciar la diferencia.',
        },
        {
          key: 'd',
          label: 'Reportar ambiente, versión y pasos en el defecto.',
        },
      ],
      correct: ['c'],
    },
    {
      id: 'qa-incomplete-ac',
      competency: 'Criterios',
      type: 'single',
      points: 1,
      prompt:
        'El criterio de aceptación dice: «El usuario puede pagar». No menciona errores, comprobante ni qué pasa si la tarjeta falla.',
      options: [
        {
          key: 'a',
          label: 'Probar solo el pago feliz y aprobar.',
        },
        {
          key: 'b',
          label:
            'Señalar el hueco a PM/desarrollo, proponer casos (éxito, fallo, comprobante) y no dar por cerrado un pago a medias.',
        },
        {
          key: 'c',
          label: 'Inventar 40 casos de borde sin avisar a nadie y bloquear la entrega en silencio.',
        },
        {
          key: 'd',
          label: 'Dejarlo pasar: «ya lo verá el cliente en UAT».',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'qa-severity-rank',
      competency: 'Severidad',
      type: 'rank',
      points: 2,
      prompt: 'Ordena estos hallazgos de mayor a menor severidad para un producto en producción.',
      options: [
        { key: 'a', label: 'Un usuario puede ver datos de otra cuenta después de iniciar sesión.' },
        { key: 'b', label: 'El botón de guardar no registra un pago y no muestra error.' },
        { key: 'c', label: 'Un texto de ayuda tiene una falta de ortografía en una pantalla secundaria.' },
        { key: 'd', label: 'El listado tarda 2s más de lo ideal, pero completa bien.' },
      ],
      correct: ['a', 'b', 'd', 'c'],
    },
    {
      id: 'qa-exploratory-when',
      competency: 'Estrategia',
      type: 'single',
      points: 1,
      prompt: '¿Cuándo aporta más una pasada exploratoria que solo seguir un checklist?',
      options: [
        {
          key: 'a',
          label: 'Nunca: el checklist basta si está largo.',
        },
        {
          key: 'b',
          label:
            'Cuando el flujo es nuevo o cambió, para descubrir huecos que el script aún no cubre, además de, no en lugar de, los casos acordados.',
        },
        {
          key: 'c',
          label: 'Solo el día del release en producción, sin ambiente de prueba.',
        },
        {
          key: 'd',
          label: 'Cuando no quieres escribir reportes.',
        },
      ],
      correct: ['b'],
    },
    {
      id: 'qa-fix-verify',
      competency: 'Cierre',
      type: 'single',
      points: 1,
      prompt: 'El desarrollador dice «ya quedó» y adjunta un commit. ¿Qué evidencia cierra el defecto?',
      options: [
        {
          key: 'a',
          label: 'El mensaje del commit.',
        },
        {
          key: 'b',
          label:
            'Reproducir el caso original en el ambiente acordado, confirmar el resultado esperado y una regresión corta de lo tocado.',
        },
        {
          key: 'c',
          label: 'Que el ticket cambió a «done» en el tablero.',
        },
        {
          key: 'd',
          label: 'Una captura del código, sin ejecutar el flujo.',
        },
      ],
      correct: ['b'],
    },
  ],
};

export const ASSESSMENT_CATALOGS: Record<string, AssessmentCatalog> = {
  [PM.key]: PM,
  [QA.key]: QA,
  [TESTER_FRONTEND.key]: TESTER_FRONTEND,
  [TESTER_BACKEND.key]: TESTER_BACKEND,
  [TESTER_FULLSTACK.key]: TESTER_FULLSTACK,
  [TESTER_UX.key]: TESTER_UX,
  [TESTER_GENERAL.key]: TESTER_GENERAL,
  [TESTER_SECURITY.key]: TESTER_SECURITY,
};

export function getAssessmentCatalog(key: string | null | undefined): AssessmentCatalog | null {
  if (!key) return null;
  if (key === 'tester') return TESTER_GENERAL;
  return ASSESSMENT_CATALOGS[key] ?? null;
}

export function isAssessmentCatalogKey(key: string | null | undefined): boolean {
  return Boolean(key && (key === 'tester' || ASSESSMENT_CATALOGS[key]));
}

export function assessmentCatalogChoices(): { key: string; title: string }[] {
  return Object.values(ASSESSMENT_CATALOGS).map((catalog) => ({
    key: catalog.key,
    title: catalog.title,
  }));
}
