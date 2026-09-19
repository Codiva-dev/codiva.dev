import { ATTENTION_RANK, attentionItemKey, type AttentionItem } from '@/lib/ops/attention';
import { opsProjectPath } from '@/lib/ops/project-path';
import type { PermissionSubject } from '@/lib/ops/permissions';
import {
  filterPromotedPreviews,
  isIntegrationGitRef,
  normalizePreviewSha,
} from '@/lib/ops/releases/preview-filter';
import {
  listGitHubPreviews,
  releasesTokenConfigured,
} from '@/lib/ops/releases/github';
import { listVercelPreviews, vercelTokenConfigured } from '@/lib/ops/releases/vercel';

export const RELEASE_ATTENTION_FETCH_MS = 4000;
export const RELEASE_ATTENTION_SETTINGS_LIMIT = 20;

export const RELEASE_REQUEST_OCCUPIED_STATUSES = [
  'pending_approval',
  'approved',
  'dispatching',
  'succeeded',
  'failed',
] as const;

export type ReleaseRequestOccupiedStatus = (typeof RELEASE_REQUEST_OCCUPIED_STATUSES)[number];

export const DEFAULT_RELEASE_ATTENTION_COPY = {
  incoming: 'Deploy listo para producción',
  pendingApproval: 'Preview pendiente de QA',
  failed: 'Promote a producción falló',
  fallbackTitle: 'Release',
};

export type ReleaseAttentionCopy = typeof DEFAULT_RELEASE_ATTENTION_COPY;

export type IncomingAttentionPreview = {
  deploymentId?: string | null;
  previewUrl: string;
  sha: string | null;
  message?: string | null;
  createdAt: string;
  dirty?: boolean;
  branch?: string | null;
};

export type OccupiedReleaseLook = {
  sha: string | null;
  previewUrl: string | null;
};

export function staffCanSeeReleaseAttention(staff: PermissionSubject): boolean {
  const role = typeof staff === 'string' ? staff : staff.role;
  return role === 'admin' || role === 'pm';
}

export function releaseIncomingAttentionId(preview: IncomingAttentionPreview): string | null {
  const deploymentId = preview.deploymentId?.trim();
  if (deploymentId) return deploymentId;
  const sha = normalizePreviewSha(preview.sha);
  if (sha) return sha;
  const host = preview.previewUrl.trim().replace(/^https?:\/\//, '').split('/')[0]?.toLowerCase();
  return host || null;
}

export function isPromotableIncomingPreview(item: IncomingAttentionPreview): boolean {
  if (item.dirty) return false;
  if (isIntegrationGitRef(item.branch)) return false;
  return Boolean(releaseIncomingAttentionId(item));
}

export function filterIncomingForReleaseAttention<T extends IncomingAttentionPreview>(
  items: T[],
  occupied: OccupiedReleaseLook[]
): T[] {
  return filterPromotedPreviews(items.filter(isPromotableIncomingPreview), occupied);
}

export function occupiedLooksByProject(
  rows: Array<{ project_id: string; commit_sha?: string | null; preview_url?: string | null }>
): Map<string, OccupiedReleaseLook[]> {
  const byProject = new Map<string, OccupiedReleaseLook[]>();
  for (const row of rows) {
    const list = byProject.get(row.project_id) ?? [];
    list.push({ sha: row.commit_sha ?? null, previewUrl: row.preview_url ?? null });
    byProject.set(row.project_id, list);
  }
  return byProject;
}

function releaseHref(slug: string | null | undefined): string {
  return slug ? opsProjectPath(slug, '?tab=releases') : '/projects';
}

export function releaseAttentionFromIncoming(input: {
  projectName: string | null;
  projectSlug: string | null;
  preview: IncomingAttentionPreview;
  copy?: ReleaseAttentionCopy;
}): AttentionItem | null {
  const id = releaseIncomingAttentionId(input.preview);
  if (!id) return null;
  const copy = input.copy ?? DEFAULT_RELEASE_ATTENTION_COPY;
  return {
    key: attentionItemKey('release_qa', id),
    kind: 'release_qa',
    title: input.projectName || copy.fallbackTitle,
    subtitle: copy.incoming,
    href: releaseHref(input.projectSlug),
    rank: ATTENTION_RANK.release_qa,
    at: input.preview.createdAt,
  };
}

export function releaseAttentionFromRequest(input: {
  id: string;
  status: string;
  projectName: string | null;
  projectSlug: string | null;
  createdAt: string;
  copy?: ReleaseAttentionCopy;
}): AttentionItem | null {
  const copy = input.copy ?? DEFAULT_RELEASE_ATTENTION_COPY;
  const subtitle =
    input.status === 'failed'
      ? copy.failed
      : input.status === 'pending_approval'
        ? copy.pendingApproval
        : null;
  if (!subtitle) return null;
  return {
    key: attentionItemKey('release_qa', input.id),
    kind: 'release_qa',
    title: input.projectName || copy.fallbackTitle,
    subtitle,
    href: releaseHref(input.projectSlug),
    rank: ATTENTION_RANK.release_qa,
    at: input.createdAt,
  };
}

export type ReleaseAttentionSettings = {
  vercel_project_id?: string | null;
  vercel_team_id?: string | null;
  github_owner?: string | null;
  github_repo?: string | null;
};

export async function listIncomingPreviewsForAttention(
  settings: ReleaseAttentionSettings,
  signal?: AbortSignal
): Promise<{ items: IncomingAttentionPreview[]; error: string | null }> {
  const vercelProjectId = settings.vercel_project_id?.trim();
  if (vercelProjectId && vercelTokenConfigured()) {
    const listed = await listVercelPreviews({
      projectId: vercelProjectId,
      teamId: settings.vercel_team_id,
      includeAliases: false,
      signal,
    });
    return listed;
  }

  const owner = settings.github_owner?.trim();
  const repo = settings.github_repo?.trim();
  if (owner && repo && releasesTokenConfigured()) {
    const listed = await listGitHubPreviews({ owner, repo, signal });
    return {
      items: listed.items.map((item) => ({
        deploymentId: null,
        previewUrl: item.previewUrl,
        sha: item.sha,
        message: item.message,
        createdAt: item.createdAt,
        dirty: false,
        branch: item.branch,
      })),
      error: listed.error,
    };
  }

  return { items: [], error: null };
}
