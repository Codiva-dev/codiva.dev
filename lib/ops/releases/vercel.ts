/**
 * Vercel REST: list preview deployments and publish to production.
 * Previews rebuild with Production env; existing production deploys alias-switch.
 * Token: VERCEL_RELEASES_TOKEN (preferred) or VERCEL_TOKEN - server-only.
 */

import {
  dedupePreviewsBySha,
  isDirtyVercelMeta,
  isIntegrationGitRef,
  previewHasGitAlias,
  selectStalePreviewIds,
} from '@/lib/ops/releases/preview-filter';

export type VercelPreview = {
  deploymentId: string;
  previewUrl: string;
  inspectUrl: string | null;
  sha: string | null;
  message: string | null;
  author: string | null;
  branch: string | null;
  createdAt: string;
  dirty: boolean;
  hasGitAlias: boolean;
};

export type VercelPromoteMode = 'alias' | 'rebuild';

export type VercelPromoteResult =
  | {
      ok: true;
      inspectUrl: string | null;
      deploymentId: string;
      mode: VercelPromoteMode;
      url: string | null;
    }
  | { ok: false; error: string; missingToken?: boolean };

export function isVercelProductionTarget(target: string | null | undefined): boolean {
  return target === 'production';
}

export function formatVercelApiError(status: number, body: string, label: string): string {
  const raw = body.trim();
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string; code?: string } };
    const message = parsed.error?.message?.trim();
    if (message) return `${label} (${status}): ${message}`;
  } catch {
    /* plain text */
  }
  return `${label} (${status}): ${raw.slice(0, 400) || 'sin detalle'}`;
}

function vercelToken(): string | null {
  const t =
    process.env.VERCEL_RELEASES_TOKEN?.trim() || process.env.VERCEL_TOKEN?.trim() || null;
  return t || null;
}

export function vercelTokenConfigured(): boolean {
  return Boolean(vercelToken());
}

function vercelHeaders(token: string, json = false): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
  };
}

type VercelEnvRow = { key?: string; value?: string | null };

/** Protection Bypass for Automation (`VERCEL_AUTOMATION_BYPASS_SECRET`) on the client project. */
export async function getVercelAutomationBypassSecret(input: {
  projectId: string;
  teamId?: string | null;
}): Promise<string | null> {
  const token = vercelToken();
  const projectId = input.projectId.trim();
  if (!token || !projectId) return null;

  const qs = teamQueryPrefix(input.teamId);
  const sep = qs.includes('?') ? '&' : '?';
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env${qs}${sep}decrypt=true`,
    { headers: vercelHeaders(token), cache: 'no-store' }
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { envs?: VercelEnvRow[] } | VercelEnvRow[];
  const rows = Array.isArray(data) ? data : (data.envs ?? []);
  const row = rows.find(
    (env) => env.key === 'VERCEL_AUTOMATION_BYPASS_SECRET' && env.value?.trim()
  );
  return row?.value?.trim() || null;
}

function teamQuery(teamId: string | null | undefined): string {
  const id = teamId?.trim();
  if (!id) return '';
  if (id.startsWith('team_')) return `&teamId=${encodeURIComponent(id)}`;
  return `&slug=${encodeURIComponent(id)}`;
}

function teamQueryPrefix(teamId: string | null | undefined): string {
  const id = teamId?.trim();
  if (!id) return '';
  if (id.startsWith('team_')) return `?teamId=${encodeURIComponent(id)}`;
  return `?slug=${encodeURIComponent(id)}`;
}

function asHttps(url: string): string {
  const trimmed = url.trim().replace(/^https?:\/\//, '');
  return `https://${trimmed}`;
}

function hostOnly(url: string): string {
  return url.trim().replace(/^https?:\/\//, '').split('/')[0] ?? '';
}

/** Prefer branch/git aliases over the opaque deployment hostname. */
function pickPreviewHost(deploymentHost: string, aliases: string[]): string {
  const clean = aliases
    .map((a) => hostOnly(a))
    .filter(Boolean)
    .filter((a) => a !== deploymentHost);
  const git = clean.find((a) => /-git-/.test(a));
  if (git) return git;
  const stable = clean.find((a) => !/^[a-z0-9]+-[a-z0-9]{8,}-[a-z0-9-]+\.vercel\.app$/i.test(a));
  if (stable) return stable;
  return clean[0] || deploymentHost;
}

async function listDeploymentAliases(
  token: string,
  deploymentId: string,
  teamId?: string | null
): Promise<string[]> {
  const qs = teamQueryPrefix(teamId);
  const res = await fetch(
    `https://api.vercel.com/v2/deployments/${encodeURIComponent(deploymentId)}/aliases${qs}`,
    { headers: vercelHeaders(token), cache: 'no-store' }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { aliases?: Array<{ alias?: string }> };
  return (data.aliases ?? []).map((a) => a.alias).filter((a): a is string => Boolean(a));
}

type VercelDeployment = {
  uid?: string;
  url?: string | null;
  inspectorUrl?: string | null;
  created?: number;
  createdAt?: number;
  target?: string | null;
  meta?: Record<string, string | undefined>;
};

export async function listVercelPreviews(input: {
  projectId: string;
  teamId?: string | null;
}): Promise<{ items: VercelPreview[]; error: string | null }> {
  const token = vercelToken();
  if (!token) {
    return {
      items: [],
      error: 'Falta VERCEL_RELEASES_TOKEN (o VERCEL_TOKEN) en el entorno de Codiva.',
    };
  }

  const projectId = input.projectId.trim();
  if (!projectId) return { items: [], error: null };

  const url = `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&state=READY&limit=40${teamQuery(input.teamId)}`;
  const res = await fetch(url, { headers: vercelHeaders(token), cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return {
      items: [],
      error: `Vercel list deployments falló (${res.status}): ${body.slice(0, 300) || res.statusText}`,
    };
  }

  const data = (await res.json()) as { deployments?: VercelDeployment[] };
  const candidates: VercelDeployment[] = [];
  for (const d of data.deployments ?? []) {
    if (d.target === 'production') continue;
    if (!d.uid || !d.url) continue;
    if (isDirtyVercelMeta(d.meta)) continue;
    if (isIntegrationGitRef(d.meta?.githubCommitRef ?? d.meta?.githubCommitRef)) continue;
    candidates.push(d);
    if (candidates.length >= 20) break;
  }

  const mapped: VercelPreview[] = await Promise.all(
    candidates.map(async (d) => {
      const meta = d.meta ?? {};
      const createdMs = d.createdAt ?? d.created ?? Date.now();
      const deploymentHost = hostOnly(d.url!);
      const aliases = await listDeploymentAliases(token, d.uid!, input.teamId);
      const previewUrl = asHttps(pickPreviewHost(deploymentHost, aliases));
      return {
        deploymentId: d.uid!,
        previewUrl,
        inspectUrl: d.inspectorUrl ?? null,
        sha: meta.githubCommitSha ?? null,
        message: meta.githubCommitMessage ?? null,
        author: meta.githubCommitAuthorName ?? null,
        branch: meta.githubCommitRef ?? null,
        createdAt: new Date(createdMs).toISOString(),
        dirty: false,
        hasGitAlias: previewHasGitAlias(previewUrl, aliases),
      };
    })
  );

  const items = dedupePreviewsBySha(mapped).slice(0, 8);
  return { items, error: null };
}

/** List preview deploys including dirty ones (for cleanup). */
export async function listVercelPreviewsForCleanup(input: {
  projectId: string;
  teamId?: string | null;
}): Promise<{ items: VercelPreview[]; error: string | null }> {
  const token = vercelToken();
  if (!token) {
    return {
      items: [],
      error: 'Falta VERCEL_RELEASES_TOKEN (o VERCEL_TOKEN) en el entorno de Codiva.',
    };
  }

  const projectId = input.projectId.trim();
  if (!projectId) return { items: [], error: null };

  const url = `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&state=READY&limit=40${teamQuery(input.teamId)}`;
  const res = await fetch(url, { headers: vercelHeaders(token), cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return {
      items: [],
      error: `Vercel list deployments falló (${res.status}): ${body.slice(0, 300) || res.statusText}`,
    };
  }

  const data = (await res.json()) as { deployments?: VercelDeployment[] };
  const items: VercelPreview[] = [];
  for (const d of data.deployments ?? []) {
    if (d.target === 'production' || !d.uid || !d.url) continue;
    const meta = d.meta ?? {};
    const createdMs = d.createdAt ?? d.created ?? Date.now();
    const deploymentHost = hostOnly(d.url);
    const previewUrl = asHttps(deploymentHost);
    items.push({
      deploymentId: d.uid,
      previewUrl,
      inspectUrl: d.inspectorUrl ?? null,
      sha: meta.githubCommitSha ?? null,
      message: meta.githubCommitMessage ?? null,
      author: meta.githubCommitAuthorName ?? null,
      branch: meta.githubCommitRef ?? null,
      createdAt: new Date(createdMs).toISOString(),
      dirty: isDirtyVercelMeta(meta),
      hasGitAlias: previewHasGitAlias(previewUrl),
    });
  }
  return { items, error: null };
}

/** Delete dirty previews and ones older than 7 days (keeps newest git-alias per SHA). */
export async function cleanupStaleVercelPreviews(input: {
  projectId: string;
  teamId?: string | null;
}): Promise<{ deleted: number; error: string | null }> {
  const listed = await listVercelPreviewsForCleanup(input);
  if (listed.error) return { deleted: 0, error: listed.error };

  const staleIds = new Set(selectStalePreviewIds(listed.items));
  for (const item of listed.items) {
    if (item.dirty) staleIds.add(item.deploymentId);
  }

  let deleted = 0;
  for (const deploymentId of staleIds) {
    const result = await deleteVercelDeployment({
      deploymentId,
      teamId: input.teamId,
    });
    if (result.ok) deleted += 1;
  }
  return { deleted, error: null };
}

export async function resolveVercelDeploymentId(input: {
  previewUrl: string;
  teamId?: string | null;
}): Promise<string | null> {
  const token = vercelToken();
  if (!token) return null;
  const host = input.previewUrl.trim().replace(/^https?:\/\//, '').split('/')[0];
  if (!host) return null;
  const qs = teamQueryPrefix(input.teamId);
  const res = await fetch(`https://api.vercel.com/v13/deployments/${encodeURIComponent(host)}${qs}`, {
    headers: vercelHeaders(token),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { uid?: string; id?: string };
  return data.uid || data.id || null;
}

type VercelDeploymentDetail = {
  uid?: string;
  id?: string;
  name?: string | null;
  url?: string | null;
  target?: string | null;
  inspectorUrl?: string | null;
};

export function deploymentPublicUrl(url?: string | null): string | null {
  const host = url?.trim();
  if (!host) return null;
  return asHttps(host);
}

async function getVercelDeployment(
  token: string,
  deploymentId: string,
  teamId?: string | null
): Promise<VercelDeploymentDetail | null> {
  const qs = teamQueryPrefix(teamId);
  const res = await fetch(
    `https://api.vercel.com/v13/deployments/${encodeURIComponent(deploymentId)}${qs}`,
    { headers: vercelHeaders(token), cache: 'no-store' }
  );
  if (!res.ok) return null;
  return (await res.json()) as VercelDeploymentDetail;
}

function inspectUrlFor(deploymentId: string, inspectorUrl?: string | null): string {
  const custom = inspectorUrl?.trim();
  return custom || `https://vercel.com/deployments/${deploymentId}`;
}

async function aliasPromoteProduction(input: {
  token: string;
  projectId: string;
  deploymentId: string;
  teamId?: string | null;
}): Promise<VercelPromoteResult> {
  const projectId = encodeURIComponent(input.projectId);
  const deploymentId = encodeURIComponent(input.deploymentId);
  const qs = teamQueryPrefix(input.teamId);
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/promote/${deploymentId}${qs}`,
    {
      method: 'POST',
      headers: vercelHeaders(input.token, true),
      body: JSON.stringify({}),
    }
  );

  if (res.status === 201 || res.status === 202 || res.ok) {
    const detail = await getVercelDeployment(input.token, input.deploymentId, input.teamId);
    return {
      ok: true,
      mode: 'alias',
      deploymentId: input.deploymentId,
      inspectUrl: inspectUrlFor(input.deploymentId, detail?.inspectorUrl),
      url: deploymentPublicUrl(detail?.url),
    };
  }

  const body = await res.text().catch(() => '');
  return { ok: false, error: formatVercelApiError(res.status, body, 'Vercel alias promote') };
}

async function rebuildPreviewAsProduction(input: {
  token: string;
  projectId: string;
  deploymentId: string;
  projectName?: string | null;
  teamId?: string | null;
}): Promise<VercelPromoteResult> {
  const qs = teamQueryPrefix(input.teamId);
  const sep = qs.includes('?') ? '&' : '?';
  const res = await fetch(`https://api.vercel.com/v13/deployments${qs}${sep}forceNew=1`, {
    method: 'POST',
    headers: vercelHeaders(input.token, true),
    body: JSON.stringify({
      name: input.projectName?.trim() || 'promote',
      project: input.projectId,
      deploymentId: input.deploymentId,
      target: 'production',
      meta: { action: 'promote' },
    }),
  });

  const body = await res.text().catch(() => '');
  if (!res.ok) {
    return { ok: false, error: formatVercelApiError(res.status, body, 'Vercel production rebuild') };
  }

  let data: { uid?: string; id?: string; url?: string | null; inspectorUrl?: string | null } = {};
  try {
    data = body ? (JSON.parse(body) as typeof data) : {};
  } catch {
    data = {};
  }
  const newId = data.uid || data.id || input.deploymentId;
  const url =
    deploymentPublicUrl(data.url) ||
    deploymentPublicUrl((await getVercelDeployment(input.token, newId, input.teamId))?.url);
  return {
    ok: true,
    mode: 'rebuild',
    deploymentId: newId,
    inspectUrl: inspectUrlFor(newId, data.inspectorUrl),
    url,
  };
}

/** Preview → new Production build. Existing Production deploy → alias switch (no rebuild). */
export async function promoteVercelDeployment(input: {
  projectId: string;
  deploymentId: string;
  teamId?: string | null;
}): Promise<VercelPromoteResult> {
  const token = vercelToken();
  if (!token) {
    return {
      ok: false,
      missingToken: true,
      error: 'Falta VERCEL_RELEASES_TOKEN (o VERCEL_TOKEN) en el entorno de Codiva.',
    };
  }

  const projectId = input.projectId.trim();
  const deploymentId = input.deploymentId.trim();
  const existing = await getVercelDeployment(token, deploymentId, input.teamId);

  if (isVercelProductionTarget(existing?.target)) {
    const aliased = await aliasPromoteProduction({
      token,
      projectId,
      deploymentId,
      teamId: input.teamId,
    });
    if (aliased.ok && !aliased.url) {
      return { ...aliased, url: deploymentPublicUrl(existing?.url) };
    }
    return aliased;
  }

  return rebuildPreviewAsProduction({
    token,
    projectId,
    deploymentId,
    projectName: existing?.name,
    teamId: input.teamId,
  });
}

/** Drop a preview after it was rebuilt into production (best-effort). */
export async function deleteVercelDeployment(input: {
  deploymentId: string;
  teamId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string; missingToken?: boolean }> {
  const token = vercelToken();
  if (!token) {
    return {
      ok: false,
      missingToken: true,
      error: 'Falta VERCEL_RELEASES_TOKEN (o VERCEL_TOKEN) en el entorno de Codiva.',
    };
  }

  const deploymentId = input.deploymentId.trim();
  if (!deploymentId) return { ok: false, error: 'Falta deployment id para borrar el preview.' };

  const qs = teamQueryPrefix(input.teamId);
  const res = await fetch(
    `https://api.vercel.com/v13/deployments/${encodeURIComponent(deploymentId)}${qs}`,
    {
      method: 'DELETE',
      headers: vercelHeaders(token),
      cache: 'no-store',
    }
  );

  if (res.ok || res.status === 404) return { ok: true };

  const body = await res.text().catch(() => '');
  return { ok: false, error: formatVercelApiError(res.status, body, 'Vercel delete deployment') };
}
