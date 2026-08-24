import type { CareerDiscipline } from '@/lib/ops/career-disciplines';

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
];

export function huntSeedById(id: string): HuntSeed | null {
  return HUNT_SEEDS.find((s) => s.id === id) ?? null;
}

export function huntRequiredForCatalog(catalogKey: string | null | undefined): boolean {
  return String(catalogKey || '').startsWith('tester-');
}
