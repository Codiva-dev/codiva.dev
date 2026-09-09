import { describe, expect, it } from 'vitest';
import { renderRecruitingDossierHtml, renderRecruitingPipelineHtml, type RecruitingDossier } from './recruiting-report';
import type { HuntTrailQuality } from './hunt/trail';

const trail: HuntTrailQuality = {
  pageViews: 8,
  uniquePages: 5,
  browsedSite: true,
  visitedMarketing: true,
  visitedCareer: true,
  visitedFeed: true,
  formOnly: false,
  msToFirstCraft: 240_000,
  firstCraftAt: '2026-08-20T18:00:00.000Z',
};

const dossier = (overrides: Partial<RecruitingDossier> = {}): RecruitingDossier => ({
  attemptId: '11111111-1111-4111-8111-111111111111',
  fullName: 'Ana Pérez',
  email: 'ana@x.com',
  vacancy: 'Tester',
  craft: 'QA frontend',
  status: 'completed',
  stage: 'ready',
  stageLabel: 'Listos para CV',
  passed: true,
  scorePct: 88,
  scoreCorrect: 7,
  scoreTotal: 8,
  attemptNumber: 1,
  durationLabel: '12 min 3s',
  blurCount: 0,
  startedAt: '2026-08-20T17:00:00.000Z',
  completedAt: '2026-08-20T17:15:00.000Z',
  applied: false,
  applicationStatusLabel: null,
  interviewLabel: null,
  interviews: [],
  appliedAt: null,
  consideration: 'solid',
  considerationLabel: 'Sólido',
  craftHits: 1,
  findingsTotal: 2,
  difficultyMix: '1 media',
  competencies: [{ name: 'Evidencia', ok: true }],
  findings: [
    {
      title: 'Feed con clave de debug',
      pageUrl: 'https://career.codiva.dev/api/careers/feed',
      description: 'El JSON público expone debug_api_key.',
      expected: null,
      counts: true,
      difficultyLabel: 'Media',
      evidenceCount: 1,
      createdAt: '2026-08-20T18:00:00.000Z',
      reviewDiscarded: false,
    },
    {
      title: 'El botón es gris',
      pageUrl: 'https://codiva.dev/',
      description: 'No me gusta el color.',
      expected: null,
      counts: false,
      difficultyLabel: null,
      evidenceCount: 0,
      createdAt: '2026-08-20T18:05:00.000Z',
      reviewDiscarded: true,
    },
  ],
  trail,
  trailRoute: 'Inicio → Servicios → Feed JSON (reportó) → Hallazgos',
  ...overrides,
});

describe('renderRecruitingDossierHtml', () => {
  it('names the bolsa phase and the hunt route', () => {
    const html = renderRecruitingDossierHtml(dossier());
    expect(html).toContain('Listos para CV');
    expect(html).toContain('No ha postulado');
    expect(html).toContain('Ruta: Inicio → Servicios → Feed JSON (reportó) → Hallazgos');
    expect(html).toContain('1 media');
    expect(html).toContain('Descartado en revisión · no cuenta');
  });

  it('shows application status and interview progress when they already sent a CV', () => {
    const html = renderRecruitingDossierHtml(
      dossier({
        stage: 'applied',
        stageLabel: 'Con CV',
        applied: true,
        applicationStatusLabel: 'Entrevista',
        interviewLabel: 'Entrevista · 1/3',
        appliedAt: '2026-08-19T12:00:00.000Z',
      })
    );
    expect(html).toContain('Con CV');
    expect(html).toContain('Entrevista · 1/3');
  });

  it('includes interview rounds and comments when there is progress', () => {
    const html = renderRecruitingDossierHtml(
      dossier({
        stage: 'applied',
        stageLabel: 'Con CV',
        applied: true,
        applicationStatusLabel: 'Entrevista',
        interviewLabel: 'Entrevista · 1/3',
        interviews: [
          {
            title: 'Filtro',
            kindLabel: 'Filtro',
            status: 'done',
            statusLabel: 'Realizada',
            outcomeLabel: 'Avanzar',
            interviewer: 'María Ops',
            conductedAt: '2026-08-19T16:00:00.000Z',
              comments: [
              {
                body: 'Clara con el oficio. Sigue a técnica.',
                author: 'María Ops',
                createdAt: '2026-08-19T16:30:00.000Z',
              },
            ],
            reports: [{ filename: 'filtro-agencia.pdf', notes: 'Recomendamos avanzar' }],
          },
          {
            title: 'Técnica',
            kindLabel: 'Técnica',
            status: 'planned',
            statusLabel: 'Pendiente',
            outcomeLabel: null,
            interviewer: null,
            conductedAt: null,
            comments: [],
            reports: [],
          },
        ],
      })
    );
    expect(html).toContain('Entrevistas');
    expect(html).toContain('Filtro');
    expect(html).toContain('Realizada');
    expect(html).toContain('Avanzar');
    expect(html).toContain('Clara con el oficio. Sigue a técnica.');
    expect(html).toContain('filtro-agencia.pdf');
    expect(html).toContain('Técnica');
    expect(html).toContain('Pendiente');
  });

  it('omits the interview block when rounds are only planned and have no comments', () => {
    const html = renderRecruitingDossierHtml(
      dossier({
        interviews: [
          {
            title: 'Filtro',
            kindLabel: 'Filtro',
            status: 'planned',
            statusLabel: 'Pendiente',
            outcomeLabel: null,
            interviewer: null,
            conductedAt: null,
            comments: [],
            reports: [],
          },
        ],
      })
    );
    expect(html).not.toContain('<h2>Entrevistas</h2>');
  });

  it('omits window-blur telemetry for partner downloads', () => {
    const html = renderRecruitingDossierHtml(dossier({ blurCount: 3 }), { audience: 'partner' });
    expect(html).toContain('12 min 3s');
    expect(html).not.toContain('salidas de ventana');
    expect(renderRecruitingDossierHtml(dossier({ blurCount: 3 }))).toContain('3 salidas de ventana');
  });
});

describe('renderRecruitingPipelineHtml', () => {
  it('groups people by bolsa phase instead of one flat table', () => {
    const html = renderRecruitingPipelineHtml({
      vacancy: 'Tester',
      ready: [
        {
          attemptId: 'a',
          applicationId: null,
          fullName: 'Ana Pérez',
          email: 'ana@x.com',
          vacancy: 'Tester',
          craft: 'QA frontend',
          stage: 'ready',
          passed: true,
          scorePct: 88,
          consideration: 'solid',
          considerationLabel: 'Sólido',
          craftHits: 1,
          findingsTotal: 1,
          difficultyMix: '1 media',
          trailLabel: '5 pág. · sitio · feed',
          browsedSite: true,
          applied: false,
          applicationStatusLabel: null,
          interviewLabel: null,
          interviews: [],
          completedAt: '2026-08-20T17:15:00.000Z',
          startedAt: '2026-08-20T17:00:00.000Z',
          appliedAt: null,
        },
      ],
      applied: [
        {
          attemptId: 'b',
          applicationId: 'app-1',
          fullName: 'Luis Mora',
          email: 'luis@x.com',
          vacancy: 'Tester',
          craft: 'QA backend',
          stage: 'applied',
          passed: true,
          scorePct: 75,
          consideration: 'minimum',
          considerationLabel: 'Mínimo',
          craftHits: 1,
          findingsTotal: 1,
          difficultyMix: '1 fácil',
          trailLabel: '3 pág. · sitio',
          browsedSite: true,
          applied: true,
          applicationStatusLabel: 'Revisada',
          interviewLabel: 'Entrevista · 0/3',
          interviews: [],
          completedAt: '2026-08-18T17:15:00.000Z',
          startedAt: '2026-08-18T17:00:00.000Z',
          appliedAt: '2026-08-18T18:00:00.000Z',
        },
      ],
      test: [],
      hired: [],
      discarded: [],
    });
    expect(html).toContain('Listos para CV · 1');
    expect(html).toContain('Con CV · 1');
    expect(html).toContain('1 listos · 1 con CV');
    expect(html).toContain('Revisada');
    expect(html).toContain('Entrevista · 0/3');
    expect(html).not.toContain('En prueba');
    expect(html).not.toContain('Aquí se decide');
    expect(html).not.toContain('Falta el CV');
  });

  it('lists interview comments under the candidate when there is progress', () => {
    const html = renderRecruitingPipelineHtml({
      vacancy: 'Tester',
      ready: [],
      applied: [
        {
          attemptId: 'b',
          applicationId: 'app-1',
          fullName: 'Luis Mora',
          email: 'luis@x.com',
          vacancy: 'Tester',
          craft: 'QA backend',
          stage: 'applied',
          passed: true,
          scorePct: 75,
          consideration: 'minimum',
          considerationLabel: 'Mínimo',
          craftHits: 1,
          findingsTotal: 1,
          difficultyMix: '1 fácil',
          trailLabel: '3 pág. · sitio',
          browsedSite: true,
          applied: true,
          applicationStatusLabel: 'Entrevista',
          interviewLabel: 'Entrevista · 1/3',
          interviews: [
            {
              title: 'Filtro',
              kindLabel: 'Filtro',
              status: 'done',
              statusLabel: 'Realizada',
              outcomeLabel: 'Avanzar',
              interviewer: null,
              conductedAt: '2026-08-19T16:00:00.000Z',
              comments: [
                {
                  body: 'Sigue a técnica.',
                  author: 'María Ops',
                  createdAt: '2026-08-19T16:30:00.000Z',
                },
              ],
              reports: [],
            },
          ],
          completedAt: '2026-08-18T17:15:00.000Z',
          startedAt: '2026-08-18T17:00:00.000Z',
          appliedAt: '2026-08-18T18:00:00.000Z',
        },
      ],
      test: [],
      hired: [],
      discarded: [],
    });
    expect(html).toContain('Luis Mora');
    expect(html).toContain('Filtro');
    expect(html).toContain('Sigue a técnica.');
    expect(html).toContain('María Ops');
  });
});
