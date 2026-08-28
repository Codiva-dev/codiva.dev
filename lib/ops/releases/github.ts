/**
 * Dispatch GitHub Actions promote workflow for a project release.
 * Token: GITHUB_RELEASES_TOKEN (preferred) or GITHUB_TOKEN - server-only.
 */

export type PromoteDispatchInput = {
  owner: string;
  repo: string;
  workflow: string;
  ref: string;
  deploymentUrlInput: string;
  previewUrl: string;
};

export type PromoteDispatchResult =
  | { ok: true; runUrl: string | null }
  | { ok: false; error: string; missingToken?: boolean };

function githubToken(): string | null {
  const t =
    process.env.GITHUB_RELEASES_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    null;
  return t || null;
}

export async function dispatchPromoteWorkflow(
  input: PromoteDispatchInput
): Promise<PromoteDispatchResult> {
  const token = githubToken();
  if (!token) {
    return {
      ok: false,
      missingToken: true,
      error:
        'Falta GITHUB_RELEASES_TOKEN (o GITHUB_TOKEN) en el entorno de Codiva. Configura el secret y reintenta, o promueve manualmente en GitHub/Vercel.',
    };
  }

  const owner = input.owner.trim();
  const repo = input.repo.trim();
  const workflow = encodeURIComponent(input.workflow.trim());
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: input.ref.trim() || 'main',
      inputs: {
        [input.deploymentUrlInput.trim() || 'deployment_url']: input.previewUrl,
      },
    }),
  });

  if (res.status === 204 || res.status === 201) {
    return {
      ok: true,
      runUrl: `https://github.com/${owner}/${repo}/actions/workflows/${input.workflow.trim()}`,
    };
  }

  const body = await res.text().catch(() => '');
  return {
    ok: false,
    error: `GitHub dispatch falló (${res.status}): ${body.slice(0, 400) || res.statusText}`,
  };
}

export function releasesTokenConfigured(): boolean {
  return Boolean(githubToken());
}

function githubHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export type CiStatus = {
  state: 'success' | 'pending' | 'failure' | 'error' | 'unknown';
  url: string | null;
  description: string | null;
};

export type GitHubPreview = {
  previewUrl: string;
  inspectUrl: string | null;
  sha: string | null;
  message: string | null;
  author: string | null;
  branch: string | null;
  createdAt: string;
};

export async function getCommitCiStatus(input: {
  owner: string;
  repo: string;
  sha: string;
}): Promise<CiStatus> {
  const token = githubToken();
  if (!token) return { state: 'unknown', url: null, description: null };

  const owner = encodeURIComponent(input.owner.trim());
  const repo = encodeURIComponent(input.repo.trim());
  const sha = encodeURIComponent(input.sha.trim());
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}/status`, {
    headers: githubHeaders(token),
    cache: 'no-store',
  });

  if (res.ok) {
    const data = (await res.json()) as {
      state?: string;
      total_count?: number;
      target_url?: string | null;
      description?: string | null;
      statuses?: Array<{ target_url?: string | null }>;
    };
    const state = data.state;
    if (state === 'success' || state === 'failure' || state === 'error' || (state === 'pending' && (data.total_count ?? 0) > 0)) {
      return {
        state,
        url: data.target_url || data.statuses?.[0]?.target_url || null,
        description: data.description ?? null,
      };
    }
  }

  const checksRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs`,
    { headers: githubHeaders(token), cache: 'no-store' }
  );
  if (!checksRes.ok) return { state: 'unknown', url: null, description: null };

  const checks = (await checksRes.json()) as {
    check_runs?: Array<{
      conclusion?: string | null;
      status?: string;
      html_url?: string | null;
      name?: string;
    }>;
  };
  const runs = checks.check_runs ?? [];
  if (!runs.length) return { state: 'unknown', url: null, description: null };

  const conclusions = runs.map((r) => r.conclusion);
  const pending = runs.some((r) => r.status !== 'completed' || !r.conclusion);
  const failed = conclusions.some((c) => c === 'failure' || c === 'timed_out' || c === 'cancelled' || c === 'action_required');
  const url = runs.find((r) => r.html_url)?.html_url ?? null;

  if (pending) return { state: 'pending', url, description: null };
  if (failed) return { state: 'failure', url, description: null };
  return { state: 'success', url, description: null };
}

export async function attachCiStatuses(
  owner: string,
  repo: string,
  shas: Array<string | null | undefined>
): Promise<Map<string, CiStatus>> {
  const unique = [...new Set(shas.filter((s): s is string => Boolean(s?.trim())))];
  const entries = await Promise.all(
    unique.map(async (sha) => [sha, await getCommitCiStatus({ owner, repo, sha })] as const)
  );
  return new Map(entries);
}

function isProductionEnv(name: string): boolean {
  const n = name.toLowerCase();
  if (n.includes('preview') || n.includes('staging')) return false;
  return n === 'production' || n.includes('prod');
}

export async function listGitHubPreviews(input: {
  owner: string;
  repo: string;
}): Promise<{ items: GitHubPreview[]; error: string | null }> {
  const token = githubToken();
  if (!token) {
    return { items: [], error: 'Falta GITHUB_RELEASES_TOKEN en el entorno de Codiva.' };
  }

  const owner = encodeURIComponent(input.owner.trim());
  const repo = encodeURIComponent(input.repo.trim());
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/deployments?per_page=15`, {
    headers: githubHeaders(token),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return {
      items: [],
      error: `GitHub deployments falló (${res.status}): ${body.slice(0, 300) || res.statusText}`,
    };
  }

  const deployments = (await res.json()) as Array<{
    sha?: string;
    ref?: string;
    environment?: string;
    created_at?: string;
    statuses_url?: string;
    description?: string;
  }>;

  const candidates = deployments.filter((d) => !isProductionEnv(String(d.environment || '')));
  const settled = await Promise.all(
    candidates.slice(0, 10).map(async (d) => {
      if (!d.statuses_url) return null;
      const st = await fetch(d.statuses_url, { headers: githubHeaders(token), cache: 'no-store' });
      if (!st.ok) return null;
      const statuses = (await st.json()) as Array<{
        environment_url?: string;
        target_url?: string;
        log_url?: string;
      }>;
      const withUrl = statuses.find((s) => s.environment_url || s.target_url);
      const previewUrl = withUrl?.environment_url || withUrl?.target_url;
      if (!previewUrl) return null;
      return {
        previewUrl,
        inspectUrl: withUrl?.log_url ?? null,
        sha: d.sha ?? null,
        message: d.description ?? null,
        author: null,
        branch: d.ref ?? null,
        createdAt: d.created_at ?? new Date().toISOString(),
      } satisfies GitHubPreview;
    })
  );

  const items: GitHubPreview[] = [];
  const seen = new Set<string>();
  for (const item of settled) {
    if (!item || seen.has(item.previewUrl)) continue;
    seen.add(item.previewUrl);
    items.push(item);
    if (items.length >= 8) break;
  }

  return { items, error: null };
}

export type GitHubPull = {
  number: number;
  title: string;
  url: string;
  branch: string;
  sha: string | null;
  draft: boolean;
};

function normRef(ref: string | null | undefined): string {
  return (ref ?? '').replace(/^refs\/heads\//, '').trim();
}

export function matchPullToPreview(
  pulls: GitHubPull[],
  input: { branch?: string | null; sha?: string | null }
): GitHubPull | null {
  const branch = normRef(input.branch);
  const sha = input.sha?.trim() ?? '';
  return (
    pulls.find((p) => sha && p.sha && p.sha === sha) ||
    pulls.find((p) => branch && p.branch === branch) ||
    null
  );
}

export async function listOpenPulls(input: {
  owner: string;
  repo: string;
}): Promise<{ items: GitHubPull[]; error: string | null }> {
  const token = githubToken();
  if (!token) return { items: [], error: null };

  const owner = encodeURIComponent(input.owner.trim());
  const repo = encodeURIComponent(input.repo.trim());
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=20`,
    { headers: githubHeaders(token), cache: 'no-store' }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 404) {
      return {
        items: [],
        error:
          'GitHub no ve el repo (404). En GITHUB_RELEASES_TOKEN: acceso a este repo + Pull requests Read/Write y Contents Write.',
      };
    }
    return {
      items: [],
      error: `GitHub PRs falló (${res.status}): ${body.slice(0, 300) || res.statusText}`,
    };
  }

  const rows = (await res.json()) as Array<{
    number: number;
    title?: string;
    html_url?: string;
    draft?: boolean;
    head?: { ref?: string; sha?: string };
  }>;

  return {
    items: rows.map((p) => ({
      number: p.number,
      title: p.title?.trim() || `#${p.number}`,
      url: p.html_url || `https://github.com/${input.owner}/${input.repo}/pull/${p.number}`,
      branch: normRef(p.head?.ref),
      sha: p.head?.sha ?? null,
      draft: Boolean(p.draft),
    })),
    error: null,
  };
}

export async function getGitRefSha(input: {
  owner: string;
  repo: string;
  ref: string;
}): Promise<string | null> {
  const owner = encodeURIComponent(input.owner.trim());
  const repo = encodeURIComponent(input.repo.trim());
  const ref = input.ref.trim().replace(/^refs\/heads\//, '');
  if (!owner || !repo || !ref) return null;
  const res = await githubJson(`/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(ref)}`);
  if (!res.ok) return null;
  try {
    const parsed = JSON.parse(res.body) as { object?: { sha?: string } };
    const sha = parsed.object?.sha?.trim() ?? '';
    return sha.length >= 7 ? sha : null;
  } catch {
    return null;
  }
}

async function githubJson(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: string }> {
  const token = githubToken();
  if (!token) return { ok: false, status: 0, body: 'Falta GITHUB_RELEASES_TOKEN.' };
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      ...githubHeaders(token),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const body = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, body };
}

export async function reviewPullRequest(input: {
  owner: string;
  repo: string;
  number: number;
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const owner = encodeURIComponent(input.owner.trim());
  const repo = encodeURIComponent(input.repo.trim());
  const res = await githubJson(`/repos/${owner}/${repo}/pulls/${input.number}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ event: input.event, body: input.body }),
  });
  if (!res.ok) {
    return { ok: false, error: `GitHub review falló (${res.status}): ${res.body.slice(0, 300)}` };
  }
  return { ok: true };
}

export async function closePullRequest(input: {
  owner: string;
  repo: string;
  number: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const owner = encodeURIComponent(input.owner.trim());
  const repo = encodeURIComponent(input.repo.trim());
  const res = await githubJson(`/repos/${owner}/${repo}/pulls/${input.number}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed' }),
  });
  if (!res.ok) {
    return { ok: false, error: `GitHub close falló (${res.status}): ${res.body.slice(0, 300)}` };
  }
  return { ok: true };
}

export async function mergePullRequest(input: {
  owner: string;
  repo: string;
  number: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const owner = encodeURIComponent(input.owner.trim());
  const repo = encodeURIComponent(input.repo.trim());
  const res = await githubJson(`/repos/${owner}/${repo}/pulls/${input.number}/merge`, {
    method: 'PUT',
    body: JSON.stringify({ merge_method: 'squash' }),
  });
  if (!res.ok) {
    return { ok: false, error: `GitHub merge falló (${res.status}): ${res.body.slice(0, 300)}` };
  }
  return { ok: true };
}

/** Default branch Codiva uses to stage a QA preview from main HEAD. */
export const OPS_RELEASE_BRANCH = 'preview/ops-release';

/**
 * Point preview/ops-release (or custom) at the tip of fromRef (default main).
 * Callers should dispatch CI afterwards: a same-SHA update has no push event.
 */
export async function upsertOpsReleaseBranch(input: {
  owner: string;
  repo: string;
  fromRef?: string;
  branch?: string;
}): Promise<
  | { ok: true; sha: string; branch: string; created: boolean; url: string }
  | { ok: false; error: string; missingToken?: boolean }
> {
  const token = githubToken();
  if (!token) {
    return {
      ok: false,
      missingToken: true,
      error: 'Falta GITHUB_RELEASES_TOKEN (o GITHUB_TOKEN) en el entorno de Codiva.',
    };
  }

  const owner = input.owner.trim();
  const repo = input.repo.trim();
  const fromRef = (input.fromRef?.trim() || 'main').replace(/^refs\/heads\//, '');
  const branch = (input.branch?.trim() || OPS_RELEASE_BRANCH).replace(/^refs\/heads\//, '');
  const ownerEnc = encodeURIComponent(owner);
  const repoEnc = encodeURIComponent(repo);

  const tip = await githubJson(`/repos/${ownerEnc}/${repoEnc}/git/ref/heads/${encodeURIComponent(fromRef)}`);
  if (!tip.ok) {
    return {
      ok: false,
      error: `No se pudo leer ${fromRef} (${tip.status}): ${tip.body.slice(0, 300)}`,
    };
  }

  let sha = '';
  try {
    const parsed = JSON.parse(tip.body) as { object?: { sha?: string } };
    sha = parsed.object?.sha?.trim() ?? '';
  } catch {
    sha = '';
  }
  if (!sha) return { ok: false, error: `Respuesta inválida al leer ${fromRef}.` };

  const existing = await githubJson(
    `/repos/${ownerEnc}/${repoEnc}/git/ref/heads/${encodeURIComponent(branch)}`
  );

  if (existing.ok) {
    const updated = await githubJson(
      `/repos/${ownerEnc}/${repoEnc}/git/refs/heads/${encodeURIComponent(branch)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ sha, force: true }),
      }
    );
    if (!updated.ok) {
      return {
        ok: false,
        error: `No se pudo actualizar ${branch} (${updated.status}): ${updated.body.slice(0, 300)}`,
      };
    }
    return {
      ok: true,
      sha,
      branch,
      created: false,
      url: `https://github.com/${owner}/${repo}/tree/${branch}`,
    };
  }

  const created = await githubJson(`/repos/${ownerEnc}/${repoEnc}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  });
  if (!created.ok) {
    return {
      ok: false,
      error: `No se pudo crear ${branch} (${created.status}): ${created.body.slice(0, 300)}`,
    };
  }

  return {
    ok: true,
    sha,
    branch,
    created: true,
    url: `https://github.com/${owner}/${repo}/tree/${branch}`,
  };
}

/** Kick CI on a ref. Needed when the branch SHA did not change (no push event). */
export async function dispatchCiWorkflow(input: {
  owner: string;
  repo: string;
  ref: string;
  workflow?: string;
}): Promise<{ ok: true } | { ok: false; error: string; missing?: boolean }> {
  const owner = encodeURIComponent(input.owner.trim());
  const repo = encodeURIComponent(input.repo.trim());
  const workflow = encodeURIComponent(input.workflow?.trim() || 'ci.yml');
  const ref = input.ref.trim().replace(/^refs\/heads\//, '');
  if (!owner || !repo || !ref) {
    return { ok: false, error: 'Falta owner, repo o ref para disparar CI.' };
  }

  const res = await githubJson(`/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref }),
  });
  if (res.status === 204 || res.ok) return { ok: true };
  if (res.status === 404) {
    return { ok: false, missing: true, error: `No existe el workflow ${input.workflow || 'ci.yml'}.` };
  }
  return {
    ok: false,
    error: `GitHub workflow dispatch falló (${res.status}): ${res.body.slice(0, 300)}`,
  };
}
