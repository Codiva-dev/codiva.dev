import {
  CAREER_DISCIPLINE_LABELS,
  HUNT_COVER_CRAFTS,
  type CareerDiscipline,
} from '@/lib/ops/career-disciplines';

export type HuntSurface = 'career' | 'marketing';
export type HuntDifficulty = 'easy' | 'medium' | 'hard';

export type HuntSeed = {
  id: string;
  title: string;
  surface: HuntSurface;
  /** Path prefixes that count, or ['*'] for any public page. */
  paths: string[];
  /** Frases distintivas del defecto plantado. Hace falta al menos una (o `minAnchors`). */
  anchors: string[];
  /** Palabras de apoyo. No bastan solas. */
  keywords: string[];
  /** Cuántas anclas distintas tienen que aparecer. Por defecto 1. */
  minAnchors?: number;
  /** Oficio dueño del hallazgo. Full stack cuenta front o back. */
  craft: CareerDiscipline;
  difficulty: HuntDifficulty;
};

export const HUNT_DIFFICULTY_POINTS: Record<HuntDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 4,
};

export const HUNT_SEEDS: HuntSeed[] = [
  {
    id: 'career-copyright-year',
    title: 'Copyright del pie en la bolsa con año fijo 2024',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['2024'],
    keywords: ['copyright', 'año', 'ano', 'year', 'pie', 'footer', 'reservados', 'derechos'],
    craft: 'qa',
    difficulty: 'easy',
  },
  {
    id: 'career-lang-en',
    title: 'Texto en inglés (lang=en) en la bolsa en español',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: [
      'lang=en',
      'lang="en"',
      "lang='en'",
      'open positions',
      'html lang',
      'idioma del html',
      'idioma del documento',
    ],
    keywords: ['idioma', 'ingles', 'english', 'i18n', 'html', 'lang', 'documento'],
    craft: 'ux-ui',
    difficulty: 'easy',
  },
  {
    id: 'career-mapa-404',
    title: 'Enlace «Mapa del sitio» a una ruta que no existe',
    surface: 'career',
    paths: ['/empleos', '/', '/mapa'],
    anchors: ['mapa del sitio', 'mapa de sitio', '/mapa', 'sitemap'],
    keywords: ['404', 'not found', 'no existe', 'no encontrada', 'roto'],
    craft: 'qa',
    difficulty: 'easy',
  },
  {
    id: 'career-icon-unnamed',
    title: 'Control solo-ícono sin nombre accesible en el pie de la bolsa',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: [
      'aria-label',
      'aria label',
      'nombre accesible',
      'accesible',
      'accesibilidad',
      'lector de pantalla',
      'screen reader',
      'sr-only',
      'icono de ayuda',
      'boton de ayuda',
      'boton "?"',
      "boton '?'",
      'icono "?"',
      "icono '?'",
      'simbolo "?"',
      "simbolo '?'",
      'boton ?',
      'icono ?',
    ],
    keywords: ['aria', 'label', 'boton', 'icono', 'iconos', 'footer', 'pie', 'ayuda', 'simbolo'],
    craft: 'ux-ui',
    difficulty: 'medium',
  },
  {
    id: 'footer-social-hit-targets',
    title: 'Iconos sociales con tamaños de clic distintos (22 / 20 / 18)',
    surface: 'marketing',
    paths: ['*'],
    anchors: ['22px', '20px', '18px', '22', '20', '18'],
    minAnchors: 2,
    keywords: ['linkedin', 'github', 'instagram', 'icono', 'iconos', 'social', 'hit', 'target', 'tamano', 'clic'],
    craft: 'ux-ui',
    difficulty: 'medium',
  },
  {
    id: 'career-skip-mismatch',
    title: 'Skip link apunta a #contenido y el main no tiene ese id',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['skip', 'saltar al contenido', 'saltar contenido', '#contenido', 'skip to'],
    keywords: ['contenido', 'ancla', 'main', 'teclado', 'id', 'href'],
    craft: 'frontend',
    difficulty: 'medium',
  },
  {
    id: 'nav-logo-not-keyboard',
    title: 'El wordmark del navbar es un div clicable, no un enlace: no se activa con teclado',
    surface: 'marketing',
    paths: ['*'],
    anchors: [
      'teclado',
      'keyboard',
      'enter',
      'con el teclado',
      'keypress',
      'div clicable',
      'no es un enlace',
      'no es un link',
    ],
    keywords: ['logo', 'wordmark', 'div', 'navbar', 'enlace', 'link', 'accesib'],
    craft: 'frontend',
    difficulty: 'hard',
  },
  {
    id: 'career-feed-content-type',
    title: 'Feed JSON de vacantes con Content-Type text/html y campo enviroment mal escrito',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['enviroment', 'content-type', 'content type', 'text/html'],
    keywords: ['feed', 'json', 'html', 'cabecera', 'header', 'api'],
    craft: 'backend',
    difficulty: 'hard',
  },
  {
    id: 'career-feed-empty-jobs',
    title: 'El feed JSON dice jobs: [] mientras el listado de la bolsa sí muestra vacantes',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['jobs: []', 'jobs:[]', '"jobs": []', '"jobs":[]', 'jobs vacio', 'jobs vacío'],
    keywords: ['feed', 'vacio', 'vacantes', 'listado', 'desfas', 'contrato', 'json'],
    craft: 'fullstack',
    difficulty: 'hard',
  },
  {
    id: 'career-feed-debug-key',
    title: 'Feed JSON público con debug_api_key a la vista',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['debug_api_key', 'cdv_hunt_not_a_secret', 'cdv_hunt'],
    keywords: ['api_key', 'api-key', 'secreto', 'secret', 'clave', 'token', 'filtr', 'leak', 'debug', 'feed'],
    craft: 'security',
    difficulty: 'easy',
  },
  {
    id: 'career-debug-cookie',
    title: 'Cookie codiva_debug_session sin HttpOnly',
    surface: 'career',
    paths: ['/empleos', '/', '/api/careers/feed'],
    anchors: ['codiva_debug_session', 'httponly', 'http-only', 'http only'],
    keywords: ['cookie', 'sesion', 'session', 'flag', 'bandera', 'debug'],
    craft: 'security',
    difficulty: 'medium',
  },
  {
    id: 'career-powered-by',
    title: 'Cabecera X-Powered-By: Express en el feed de vacantes',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['x-powered-by', 'powered-by', 'powered by express', 'x powered by'],
    keywords: ['express', 'cabecera', 'header', 'fingerprint', 'huella', 'feed'],
    craft: 'security',
    difficulty: 'hard',
  },
  {
    id: 'career-robots-interna',
    title: 'robots.txt Disallow de /empleos/interna (ruta que no existe)',
    surface: 'career',
    paths: ['/robots.txt', '/empleos', '/'],
    anchors: ['robots.txt', 'robots'],
    keywords: ['disallow', 'interna', '/empleos/interna', 'crawler'],
    craft: 'security',
    difficulty: 'medium',
  },
  {
    id: 'career-ghost-job',
    title: 'Tarjeta «Ingeniero de plataforma» a una vacante que no existe',
    surface: 'career',
    paths: ['/empleos', '/', '/ingeniero-plataforma'],
    anchors: ['ingeniero de plataforma', '/ingeniero-plataforma'],
    keywords: ['404', 'no existe', 'vacante', 'tarjeta', 'listado', 'roto'],
    craft: 'qa',
    difficulty: 'medium',
  },
  {
    id: 'career-sort-noop',
    title: 'El control «Ordenar por fecha» no cambia el listado',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['ordenar por fecha', 'ordenar', 'por fecha'],
    keywords: ['select', 'listado', 'no cambia', 'no hace', 'orden'],
    craft: 'qa',
    difficulty: 'medium',
  },
  {
    id: 'career-sync-stale',
    title: '«Última sincronización con el feed: 1 ene 2024» con vacantes vigentes',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['ultima sincronizacion', '1 ene 2024', '1 de enero de 2024', 'sincronizacion con el feed'],
    minAnchors: 2,
    keywords: ['stale', 'desfas', 'viejo', 'feed', 'fecha'],
    craft: 'qa',
    difficulty: 'hard',
  },
  {
    id: 'career-pagination-2-of-1',
    title: 'Paginación «Página 2 de 1» en el listado de la bolsa',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['pagina 2 de 1', 'página 2 de 1', '2 de 1'],
    keywords: ['paginacion', 'paginador', 'listado', 'inconsist'],
    craft: 'qa',
    difficulty: 'hard',
  },
  {
    id: 'career-search-en',
    title: 'Placeholder «Search open positions...» en la bolsa en español',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['search open positions', 'open positions'],
    keywords: ['placeholder', 'busqueda', 'ingles', 'idioma', 'input'],
    craft: 'ux-ui',
    difficulty: 'easy',
  },
  {
    id: 'career-breadcrumb-en',
    title: 'Miga de pan «Home / Careers» en inglés sobre copy en español',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['home / careers', 'home/careers', 'home / careers'],
    keywords: ['breadcrumb', 'miga', 'ingles', 'idioma', 'careers'],
    craft: 'ux-ui',
    difficulty: 'easy',
  },
  {
    id: 'career-filter-contrast',
    title: '«Solo remoto» en gris claro sobre blanco: contraste insuficiente',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['solo remoto', 'contraste', 'gris claro', 'zinc-300'],
    minAnchors: 2,
    keywords: ['legible', 'accesib', 'wcag', 'color', 'filtro'],
    craft: 'ux-ui',
    difficulty: 'hard',
  },
  {
    id: 'career-tiny-legal',
    title: 'Aviso legal a 9px en zinc-400 casi ilegible',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['recalculo de ranking', 'recálculo de ranking', '9px', 'text-[9px]'],
    keywords: ['legible', 'tipografia', 'aviso', 'contraste', 'pequeno'],
    craft: 'ux-ui',
    difficulty: 'hard',
  },
  {
    id: 'career-share-span',
    title: '«Compartir listado» es un span clicable, no un botón ni enlace',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['compartir listado', 'span', 'role="button"'],
    keywords: ['teclado', 'boton', 'enlace', 'click', 'accesib'],
    craft: 'frontend',
    difficulty: 'easy',
  },
  {
    id: 'career-tabindex-hunt',
    title: 'tabIndex={3} positivo en «Compartir listado» rompe el orden de foco',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['tabindex', 'tabindex=3', 'tab index', 'orden de foco'],
    keywords: ['teclado', 'tab', 'foco', 'focus', 'positivo'],
    craft: 'frontend',
    difficulty: 'easy',
  },
  {
    id: 'career-nested-button',
    title: 'Botón «Guardar» anidado dentro del enlace de la vacante fantasma',
    surface: 'career',
    paths: ['/empleos', '/', '/ingeniero-plataforma'],
    anchors: ['guardar', 'boton dentro', 'anidado', 'nested'],
    keywords: ['enlace', 'html', 'interactivo', 'tarjeta', 'ingeniero'],
    craft: 'frontend',
    difficulty: 'medium',
  },
  {
    id: 'career-role-link',
    title: '«Ver archivo de vacantes» es un div role="link" sin href',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['ver archivo de vacantes', 'role="link"', 'role=link', 'sin href'],
    keywords: ['div', 'enlace', 'teclado', 'href', 'accesib'],
    craft: 'frontend',
    difficulty: 'hard',
  },
  {
    id: 'feed-http-date-2024',
    title: 'El feed declara http_date / Date del 1 de enero de 2024',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['http_date', 'wed, 01 jan 2024', '01 jan 2024', '1 de enero de 2024'],
    keywords: ['date', 'cabecera', 'header', 'stale', 'feed'],
    craft: 'backend',
    difficulty: 'easy',
  },
  {
    id: 'feed-get-201',
    title: 'GET /api/careers/feed responde HTTP 201 Created',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['201 created', 'status 201', 'codigo 201', 'http 201'],
    keywords: ['get', 'created', 'status', 'feed', 'rest'],
    craft: 'backend',
    difficulty: 'easy',
  },
  {
    id: 'health-db-conected',
    title: 'Health JSON con db: "conected" (typo) y ok: false',
    surface: 'career',
    paths: ['/api/careers/health', '/empleos'],
    anchors: ['conected', 'db": "conected"', "db: 'conected'"],
    keywords: ['health', 'typo', 'ok', 'json', 'estado'],
    craft: 'backend',
    difficulty: 'easy',
  },
  {
    id: 'health-ok-false-200',
    title: 'GET /api/careers/health devuelve 200 con ok: false',
    surface: 'career',
    paths: ['/api/careers/health', '/empleos'],
    anchors: ['ok: false', '"ok": false', 'ok false', '200'],
    minAnchors: 2,
    keywords: ['health', 'status', 'inconsist', 'degrad', 'json'],
    craft: 'backend',
    difficulty: 'medium',
  },
  {
    id: 'feed-link-interna',
    title: 'Cabecera Link del feed apunta a /empleos/interna (rel=next)',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['rel="next"', 'rel=next', '/empleos/interna'],
    minAnchors: 2,
    keywords: ['link', 'cabecera', 'header', 'paginacion', 'feed'],
    craft: 'backend',
    difficulty: 'medium',
  },
  {
    id: 'feed-allow-post',
    title: 'GET del feed declara Allow: POST',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['allow: post', 'allow post', 'allow:post'],
    keywords: ['cabecera', 'header', 'metodo', 'get', 'feed'],
    craft: 'backend',
    difficulty: 'hard',
  },
  {
    id: 'health-retry-after',
    title: 'Health 200 incluye Retry-After: 120',
    surface: 'career',
    paths: ['/api/careers/health', '/empleos'],
    anchors: ['retry-after', 'retry after', 'retry-after: 120'],
    keywords: ['health', 'cabecera', 'header', '200', 'reintento'],
    craft: 'backend',
    difficulty: 'hard',
  },
  {
    id: 'feed-total-3',
    title: 'El feed dice total: 3 con jobs: [] mientras el listado sí muestra vacantes',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['total: 3', '"total": 3', 'total 3'],
    keywords: ['feed', 'listado', 'vacantes', 'desfas', 'json', 'conteo'],
    craft: 'fullstack',
    difficulty: 'easy',
  },
  {
    id: 'career-filter-remoto',
    title: '«Solo remoto» aparece presionado y no filtra el listado',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['solo remoto', 'aria-pressed', 'no filtra'],
    minAnchors: 2,
    keywords: ['filtro', 'no filtra', 'listado', 'remoto', 'ui'],
    craft: 'fullstack',
    difficulty: 'easy',
  },
  {
    id: 'feed-apply-interna',
    title: 'apply_url del feed apunta a /empleos/interna',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['apply_url', '/empleos/interna'],
    minAnchors: 2,
    keywords: ['feed', 'postular', 'contrato', 'json', 'ruta'],
    craft: 'fullstack',
    difficulty: 'medium',
  },
  {
    id: 'career-canonical-www',
    title: 'Canonical de la bolsa apunta a www.../empleos en vez del host career',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['canonical', 'rel=canonical', 'www.codiva.dev/empleos', 'codiva.dev/empleos'],
    keywords: ['seo', 'host', 'career', 'meta', 'listado'],
    craft: 'fullstack',
    difficulty: 'medium',
  },
  {
    id: 'career-meta-zero',
    title: 'Meta description dice «0 vacantes abiertas» con listado poblado',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['0 vacantes abiertas', '0 vacantes', 'meta description'],
    keywords: ['meta', 'seo', 'listado', 'desfas', 'og'],
    craft: 'fullstack',
    difficulty: 'hard',
  },
  {
    id: 'career-csrf-meta',
    title: 'Meta csrf-token fijo hunt-csrf en la bolsa',
    surface: 'career',
    paths: ['/empleos', '/'],
    anchors: ['csrf-token', 'hunt-csrf', 'csrf token'],
    keywords: ['meta', 'csrf', 'fijo', 'token', 'seguridad'],
    craft: 'security',
    difficulty: 'easy',
  },
  {
    id: 'feed-debug-user',
    title: 'Cabecera X-Debug-User: admin@codiva.dev en el feed público',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['x-debug-user', 'admin@codiva.dev', 'debug-user'],
    keywords: ['cabecera', 'header', 'email', 'filtr', 'feed'],
    craft: 'security',
    difficulty: 'easy',
  },
  {
    id: 'feed-cors-credentials',
    title: 'CORS * con Access-Control-Allow-Credentials: true en el feed',
    surface: 'career',
    paths: ['/api/careers/feed', '/empleos'],
    anchors: ['access-control-allow-origin', 'allow-credentials', 'allow-origin: *'],
    minAnchors: 2,
    keywords: ['cors', 'credentials', 'cookie', 'feed', 'header'],
    craft: 'security',
    difficulty: 'hard',
  },
];

const HUNT_DIFFICULTY_LABEL: Record<HuntDifficulty, string> = {
  easy: 'fácil',
  medium: 'medio',
  hard: 'difícil',
};

export function huntSeedCatalogText() {
  const levels: HuntDifficulty[] = ['easy', 'medium', 'hard'];
  const lines = [
    `Hallazgos plantados en la vacante de tester (${HUNT_SEEDS.length}):`,
    '',
  ];
  for (const craft of HUNT_COVER_CRAFTS) {
    const seeds = HUNT_SEEDS.filter((seed) => seed.craft === craft);
    lines.push(`${CAREER_DISCIPLINE_LABELS[craft]} (${seeds.length})`);
    for (const difficulty of levels) {
      for (const seed of seeds.filter((row) => row.difficulty === difficulty)) {
        const where = seed.paths.includes('*') ? 'sitio' : seed.paths.join(', ');
        lines.push(
          `- [${HUNT_DIFFICULTY_LABEL[difficulty]} · ${seed.surface}] ${seed.title} · ${where}`
        );
      }
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

export function huntSeedById(id: string): HuntSeed | null {
  return HUNT_SEEDS.find((s) => s.id === id) ?? null;
}

export function huntRequiredForCatalog(catalogKey: string | null | undefined): boolean {
  return String(catalogKey || '').startsWith('tester-');
}

export function huntRequiredForPosting(
  requiresHunt: boolean | null | undefined,
  catalogKey?: string | null
): boolean {
  if (typeof requiresHunt === 'boolean') return requiresHunt;
  return huntRequiredForCatalog(catalogKey);
}
