import { describe, expect, it } from 'vitest';
import { matchHuntReport } from './match';

describe('matchHuntReport', () => {
  it('matches the career copyright seed on the career host', () => {
    const match = matchHuntReport({
      pageUrl: 'https://career.codiva.dev/',
      title: 'Copyright 2024 en el pie',
      description: 'El footer de la bolsa muestra derechos reservados con año fijo 2024.',
      discipline: 'qa',
    });
    expect(match?.seedId).toBe('career-copyright-year');
    expect(match?.countsForCraft).toBe(true);
  });

  it('does not count a career seed reported from marketing', () => {
    const match = matchHuntReport({
      pageUrl: 'https://codiva.dev/empleos',
      title: 'Copyright 2024 en el pie',
      description: 'El footer muestra derechos reservados con año fijo 2024.',
      discipline: 'qa',
    });
    expect(match).toBeNull();
  });

  it('matches the public feed debug key', () => {
    const match = matchHuntReport({
      pageUrl: 'https://career.codiva.dev/api/careers/feed',
      title: 'debug_api_key en el feed',
      description: 'El JSON público expone debug_api_key cdv_hunt_not_a_secret junto a jobs vacíos.',
      discipline: 'security',
    });
    expect(match?.seedId).toBe('career-feed-debug-key');
    expect(match?.countsForCraft).toBe(true);
  });

  it('returns null when there are no seed anchors', () => {
    const match = matchHuntReport({
      pageUrl: 'https://codiva.dev/',
      title: 'El botón es gris',
      description: 'No me gusta el color del CTA flotante en mobile.',
      discipline: 'ux-ui',
    });
    expect(match).toBeNull();
  });

  it('matches the unnamed help control when reported as a dead footer button', () => {
    const match = matchHuntReport({
      pageUrl: 'https://career.codiva.dev',
      title: 'El botón "?" del footer no realiza ninguna acción',
      description:
        'En la página de Empleos, al final del sitio aparece un botón con el símbolo "?". Al hacer clic no abre ningún enlace, ventana, ayuda ni realiza alguna acción.',
      expected: 'Esperaba que mostrara información de ayuda.',
      discipline: 'frontend',
    });
    expect(match?.seedId).toBe('career-icon-unnamed');
    expect(match?.countsForCraft).toBe(true);
  });

  it('matches the unnamed help control from an a11y description', () => {
    const match = matchHuntReport({
      pageUrl: 'https://career.codiva.dev/',
      title: 'El ícono de ayuda no tiene nombre accesible',
      description: 'El botón ? del pie no tiene aria-label y el lector de pantalla no lo anuncia.',
      discipline: 'ux-ui',
    });
    expect(match?.seedId).toBe('career-icon-unnamed');
    expect(match?.countsForCraft).toBe(true);
  });

  it('matches the career html lang=en seed', () => {
    const match = matchHuntReport({
      pageUrl: 'https://career.codiva.dev/',
      title: 'El HTML de la bolsa está en inglés',
      description: 'Inspeccioné el documento: html lang="en" con copy en español.',
      discipline: 'ux-ui',
    });
    expect(match?.seedId).toBe('career-lang-en');
    expect(match?.countsForCraft).toBe(true);
  });

  it('matches the navbar wordmark keyboard seed', () => {
    const match = matchHuntReport({
      pageUrl: 'https://codiva.dev/',
      title: 'El logo no se activa con teclado',
      description: 'El wordmark del navbar es un div clicable, no un enlace. Enter no hace nada.',
      discipline: 'frontend',
    });
    expect(match?.seedId).toBe('nav-logo-not-keyboard');
    expect(match?.countsForCraft).toBe(true);
  });

  it('does not treat a mobile menu focus trap as a planted seed', () => {
    const match = matchHuntReport({
      pageUrl: 'https://career.codiva.dev',
      title: 'El menú móvil no bloquea el fondo ni retiene el foco',
      description:
        'Con el menú hamburguesa abierto el contenido de atrás sigue haciendo scroll y Tab sale del menú.',
      expected: 'El foco del teclado debería mantenerse dentro del menú hasta cerrarlo.',
      discipline: 'frontend',
    });
    expect(match).toBeNull();
  });

  it('matches the ghost platform-engineer card', () => {
    const match = matchHuntReport({
      pageUrl: 'https://career.codiva.dev/',
      title: 'Ingeniero de plataforma 404',
      description: 'La tarjeta Ingeniero de plataforma del listado apunta a /ingeniero-plataforma y no existe.',
      discipline: 'qa',
    });
    expect(match?.seedId).toBe('career-ghost-job');
  });

  it('matches GET 201 on the public feed', () => {
    const match = matchHuntReport({
      pageUrl: 'https://career.codiva.dev/api/careers/feed',
      title: 'El GET del feed responde 201 Created',
      description: 'Pedí el feed JSON y el status HTTP 201 Created en un GET.',
      discipline: 'backend',
    });
    expect(match?.seedId).toBe('feed-get-201');
  });

  it('matches the health db typo', () => {
    const match = matchHuntReport({
      pageUrl: 'https://career.codiva.dev/api/careers/health',
      title: 'db conected',
      description: 'El JSON de estado tiene db: "conected" con el typo.',
      discipline: 'backend',
    });
    expect(match?.seedId).toBe('health-db-conected');
  });

  it('counts a former QA seed for a frontend tester (functional type)', () => {
    const match = matchHuntReport({
      pageUrl: 'https://career.codiva.dev/',
      title: 'Copyright 2024 en el pie',
      description: 'El footer de la bolsa muestra derechos reservados con año fijo 2024.',
      discipline: 'frontend',
    });
    expect(match?.seedId).toBe('career-copyright-year');
    expect(match?.craft).toBe('functional');
    expect(match?.countsForCraft).toBe(true);
  });

  it('counts a former backend seed for a full-stack tester (API type)', () => {
    const match = matchHuntReport({
      pageUrl: 'https://career.codiva.dev/api/careers/feed',
      title: 'El GET del feed responde 201 Created',
      description: 'Pedí el feed JSON y el status HTTP 201 Created en un GET.',
      discipline: 'fullstack',
    });
    expect(match?.seedId).toBe('feed-get-201');
    expect(match?.craft).toBe('api');
    expect(match?.countsForCraft).toBe(true);
  });

  it('does not count a functional seed for a full-stack tester', () => {
    const match = matchHuntReport({
      pageUrl: 'https://codiva.dev/',
      title: 'El logo no se activa con teclado',
      description: 'El wordmark del navbar es un div clicable, no un enlace. Enter no hace nada.',
      discipline: 'fullstack',
    });
    expect(match?.seedId).toBe('nav-logo-not-keyboard');
    expect(match?.craft).toBe('functional');
    expect(match?.countsForCraft).toBe(false);
  });
});
