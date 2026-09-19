import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatVercelApiError,
  isVercelProductionTarget,
  listVercelPreviews,
  promoteVercelDeployment,
  deleteVercelDeployment,
} from './vercel';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('isVercelProductionTarget', () => {
  it('only treats production as alias-eligible', () => {
    expect(isVercelProductionTarget('production')).toBe(true);
    expect(isVercelProductionTarget(null)).toBe(false);
    expect(isVercelProductionTarget('preview')).toBe(false);
  });
});

describe('formatVercelApiError', () => {
  it('extracts the Vercel error message', () => {
    expect(
      formatVercelApiError(
        422,
        '{"error":{"code":"unprocessable_entity","message":"Resource cannot be processed."}}',
        'Vercel alias promote'
      )
    ).toBe('Vercel alias promote (422): Resource cannot be processed.');
  });
});

describe('promoteVercelDeployment', () => {
  const prevToken = process.env.VERCEL_RELEASES_TOKEN;

  beforeEach(() => {
    process.env.VERCEL_RELEASES_TOKEN = 'tok';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevToken === undefined) delete process.env.VERCEL_RELEASES_TOKEN;
    else process.env.VERCEL_RELEASES_TOKEN = prevToken;
  });

  it('rebuilds a preview as a new production deployment', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/v13/deployments/dpl_preview') && !init?.method) {
        return jsonResponse(200, { uid: 'dpl_preview', name: 'nirc', target: 'preview' });
      }
      if (url.includes('/v13/deployments') && init?.method === 'POST') {
        expect(url).toContain('forceNew=1');
        expect(url).toContain('teamId=team_abc');
        const body = JSON.parse(String(init.body));
        expect(body).toMatchObject({
          name: 'nirc',
          project: 'prj_nirc',
          deploymentId: 'dpl_preview',
          target: 'production',
          meta: { action: 'promote' },
        });
        return jsonResponse(200, {
          uid: 'dpl_prod',
          url: 'nirc-prod-codiva-dev.vercel.app',
          inspectorUrl: 'https://vercel.com/codiva/nirc/dpl_prod',
        });
      }
      throw new Error(`unexpected fetch ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await promoteVercelDeployment({
      projectId: 'prj_nirc',
      deploymentId: 'dpl_preview',
      teamId: 'team_abc',
    });

    expect(result).toEqual({
      ok: true,
      mode: 'rebuild',
      deploymentId: 'dpl_prod',
      inspectUrl: 'https://vercel.com/codiva/nirc/dpl_prod',
      url: 'https://nirc-prod-codiva-dev.vercel.app',
    });
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/v10/projects/'))).toBe(
      false
    );
  });

  it('alias-promotes an existing production deployment without rebuilding', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/v13/deployments/dpl_live') && !init?.method) {
        return jsonResponse(200, {
          uid: 'dpl_live',
          name: 'nirc',
          url: 'nirc-codiva-dev.vercel.app',
          target: 'production',
        });
      }
      if (url.includes('/v10/projects/prj_nirc/promote/dpl_live') && init?.method === 'POST') {
        expect(init.body).toBe('{}');
        return new Response(null, { status: 201 });
      }
      throw new Error(`unexpected fetch ${init?.method ?? 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await promoteVercelDeployment({
      projectId: 'prj_nirc',
      deploymentId: 'dpl_live',
      teamId: 'team_abc',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mode).toBe('alias');
      expect(result.url).toBe('https://nirc-codiva-dev.vercel.app');
    }
  });
});

describe('listVercelPreviews', () => {
  const prevToken = process.env.VERCEL_RELEASES_TOKEN;

  beforeEach(() => {
    process.env.VERCEL_RELEASES_TOKEN = 'tok';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevToken === undefined) delete process.env.VERCEL_RELEASES_TOKEN;
    else process.env.VERCEL_RELEASES_TOKEN = prevToken;
  });

  it('lists READY previews without alias lookups in lite mode', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).not.toContain('/aliases');
      expect(url).toContain('/v6/deployments');
      expect(url).toContain('state=READY');
      return jsonResponse(200, {
        deployments: [
          {
            uid: 'dpl_prod',
            url: 'nirc-prod.vercel.app',
            target: 'production',
            meta: { githubCommitSha: 'ffffffff', githubCommitRef: 'preview/ops-release' },
          },
          {
            uid: 'dpl_main',
            url: 'nirc-main.vercel.app',
            target: 'preview',
            meta: { githubCommitSha: 'eeeeeeee', githubCommitRef: 'main' },
          },
          {
            uid: 'dpl_dirty',
            url: 'nirc-dirty.vercel.app',
            target: 'preview',
            meta: { githubCommitSha: 'dddddddd', githubCommitRef: 'preview/ops-release', gitDirty: '1' },
          },
          {
            uid: 'dpl_ok',
            url: 'nirc-preview.vercel.app',
            target: 'preview',
            createdAt: Date.parse('2026-09-19T18:00:00.000Z'),
            inspectorUrl: 'https://vercel.com/codiva/nirc/dpl_ok',
            meta: {
              githubCommitSha: 'aaaaaaaa',
              githubCommitRef: 'preview/ops-release',
              githubCommitMessage: 'feat: landing',
            },
          },
        ],
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const listed = await listVercelPreviews({
      projectId: 'prj_nirc',
      teamId: 'team_abc',
      includeAliases: false,
    });

    expect(listed.error).toBeNull();
    expect(listed.items).toEqual([
      {
        deploymentId: 'dpl_ok',
        previewUrl: 'https://nirc-preview.vercel.app',
        inspectUrl: 'https://vercel.com/codiva/nirc/dpl_ok',
        sha: 'aaaaaaaa',
        message: 'feat: landing',
        author: null,
        branch: 'preview/ops-release',
        createdAt: '2026-09-19T18:00:00.000Z',
        dirty: false,
        hasGitAlias: false,
      },
    ]);
  });
});

describe('deleteVercelDeployment', () => {
  const prevToken = process.env.VERCEL_RELEASES_TOKEN;

  beforeEach(() => {
    process.env.VERCEL_RELEASES_TOKEN = 'tok';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (prevToken === undefined) delete process.env.VERCEL_RELEASES_TOKEN;
    else process.env.VERCEL_RELEASES_TOKEN = prevToken;
  });

  it('deletes a preview deployment', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      expect(init?.method).toBe('DELETE');
      expect(url).toContain('/v13/deployments/dpl_preview');
      expect(url).toContain('teamId=team_abc');
      return jsonResponse(200, { uid: 'dpl_preview', state: 'DELETED' });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      deleteVercelDeployment({ deploymentId: 'dpl_preview', teamId: 'team_abc' })
    ).resolves.toEqual({ ok: true });
  });

  it('treats 404 as already gone', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('gone', { status: 404 }))
    );

    await expect(deleteVercelDeployment({ deploymentId: 'dpl_gone' })).resolves.toEqual({
      ok: true,
    });
  });
});
