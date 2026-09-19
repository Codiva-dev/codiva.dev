'use server';

import { revalidatePath } from 'next/cache';
import { throwDb, throwExternal, throwPublic } from '@/lib/ops/throw-db';
import {
  assertCapability,
  assertProjectAccessOrThrow,
  type StaffAccess,
} from '@/lib/ops/auth';
import { logActivity } from '@/lib/ops/activity';
import {
  attachCiStatuses,
  closePullRequest,
  dispatchCiWorkflow,
  dispatchPromoteWorkflow,
  getGitRefSha,
  listGitHubPreviews,
  listOpenPulls,
  matchPullToPreview,
  mergePullRequest,
  OPS_RELEASE_BRANCH,
  releasesTokenConfigured,
  reviewPullRequest,
  upsertOpsReleaseBranch,
  type CiStatus,
  type GitHubPull,
} from '@/lib/ops/releases/github';
import { filterPromotedPreviews, incomingEmptyHint } from '@/lib/ops/releases/preview-filter';
import { withVercelPreviewBypass } from '@/lib/ops/releases/preview-url';
import { createClient } from '@/lib/supabase/server';
import {
  cleanupStaleVercelPreviews,
  deleteVercelDeployment,
  getVercelAutomationBypassSecret,
  listVercelPreviews,
  promoteVercelDeployment,
  resolveVercelDeploymentId,
  vercelTokenConfigured,
} from '@/lib/ops/releases/vercel';

/** Promote pipeline: admin or PM only (not client, not default for dev). */
async function assertReleaseOps(projectId: string): Promise<StaffAccess> {
  const access = await assertCapability('site_access');
  await assertProjectAccessOrThrow(access, projectId);
  const role = access.staff.role;
  if (role !== 'admin' && role !== 'pm') {
    await throwPublic('ops.releases.adminPmOnly');
  }
  return access;
}

export type ReleaseSettingsRow = {
  project_id: string;
  enabled: boolean;
  github_owner: string | null;
  github_repo: string | null;
  promote_workflow: string;
  promote_ref: string;
  deployment_url_input: string;
  vercel_project_id: string | null;
  vercel_team_id: string | null;
  client_can_request: boolean;
  require_staff_approval: boolean;
  notes: string;
};

export type ReleaseRequestRow = {
  id: string;
  project_id: string;
  status: string;
  preview_url: string;
  production_url: string | null;
  notes: string;
  commit_sha: string | null;
  commit_message: string | null;
  vercel_deployment_id: string | null;
  error_message: string | null;
  github_run_url: string | null;
  requested_by_kind: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type IncomingPreview = {
  source: 'vercel' | 'github';
  previewUrl: string;
  openUrl: string;
  deploymentId: string | null;
  inspectUrl: string | null;
  sha: string | null;
  message: string | null;
  author: string | null;
  branch: string | null;
  createdAt: string;
  dirty: boolean;
  hasGitAlias: boolean;
  ci: CiStatus | null;
  pull: GitHubPull | null;
};

export type IncomingPreviewsResult = {
  items: IncomingPreview[];
  pulls: GitHubPull[];
  error: string | null;
  hint: string | null;
  previewAccessSecret: string | null;
};

function revalidateReleasePaths(projectId: string, slug?: string | null) {
  revalidatePath(`/projects/${projectId}`);
  if (slug) revalidatePath(`/projects/${slug}`);
  revalidatePath('/pendientes');
  revalidatePath(`/p`);
  if (slug) {
    revalidatePath(`/p/${slug}`);
    revalidatePath(`/p/${slug}/sitio`);
    revalidatePath(`/ops/p/${slug}/sitio`);
  }
}

async function projectSlug(
  supabase: Awaited<ReturnType<typeof assertCapability>>['supabase'],
  projectId: string
): Promise<string | null> {
  const { data } = await supabase.from('projects').select('slug').eq('id', projectId).maybeSingle();
  return data?.slug ?? null;
}

export async function upsertReleaseSettings(projectId: string, formData: FormData) {
  const { supabase, user } = await assertReleaseOps(projectId);

  const enabled = formData.get('enabled') === 'on';
  const github_owner = String(formData.get('githubOwner') || '').trim() || null;
  const github_repo = String(formData.get('githubRepo') || '').trim() || null;

  const payload = {
    project_id: projectId,
    enabled,
    github_owner,
    github_repo,
    promote_workflow: String(formData.get('promoteWorkflow') || 'promote-production.yml').trim(),
    promote_ref: String(formData.get('promoteRef') || 'main').trim(),
    deployment_url_input: String(formData.get('deploymentUrlInput') || 'deployment_url').trim(),
    vercel_project_id: String(formData.get('vercelProjectId') || '').trim() || null,
    vercel_team_id: String(formData.get('vercelTeamId') || '').trim() || null,
    client_can_request: false,
    require_staff_approval: formData.get('requireStaffApproval') === 'on',
    notes: String(formData.get('notes') || ''),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('project_release_settings').upsert(payload, {
    onConflict: 'project_id',
  });
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project',
    entityId: projectId,
    action: 'release_settings_updated',
    actorId: user.id,
    metadata: {
      project_id: projectId,
      enabled,
      has_github: Boolean(github_owner && github_repo),
      has_vercel: Boolean(String(formData.get('vercelProjectId') || '').trim()),
    },
  });

  revalidateReleasePaths(projectId, await projectSlug(supabase, projectId));
}

export async function loadIncomingPreviews(
  settings: ReleaseSettingsRow | null
): Promise<IncomingPreviewsResult> {
  if (!settings?.enabled) {
    return { items: [], pulls: [], error: null, hint: 'disabled', previewAccessSecret: null };
  }

  let items: IncomingPreview[] = [];
  let error: string | null = null;
  let pulls: GitHubPull[] = [];

  if (settings.github_owner && settings.github_repo && releasesTokenConfigured()) {
    const listed = await listOpenPulls({
      owner: settings.github_owner,
      repo: settings.github_repo,
    });
    pulls = listed.items;
    if (listed.error) error = listed.error;
  }

  if (settings.vercel_project_id && vercelTokenConfigured()) {
    const listed = await listVercelPreviews({
      projectId: settings.vercel_project_id,
      teamId: settings.vercel_team_id,
    });
    items = listed.items.map((item) => ({
      ...item,
      source: 'vercel' as const,
      openUrl: item.previewUrl,
      ci: null,
      pull: matchPullToPreview(pulls, item),
    }));
    error = listed.error || error;
  } else if (settings.github_owner && settings.github_repo && releasesTokenConfigured()) {
    const listed = await listGitHubPreviews({
      owner: settings.github_owner,
      repo: settings.github_repo,
    });
    items = listed.items.map((item) => ({
      ...item,
      source: 'github' as const,
      deploymentId: null,
      openUrl: item.previewUrl,
      dirty: false,
      hasGitAlias: /-git-/.test(item.previewUrl),
      ci: null,
      pull: matchPullToPreview(pulls, item),
    }));
    error = listed.error || error;
  } else if (!pulls.length) {
    return { items: [], pulls: [], error: null, hint: 'misconfigured', previewAccessSecret: null };
  }

  if (
    settings.github_owner &&
    settings.github_repo &&
    releasesTokenConfigured() &&
    items.length
  ) {
    const statuses = await attachCiStatuses(
      settings.github_owner,
      settings.github_repo,
      items.map((item) => item.sha)
    );
    items = items.map((item) => ({
      ...item,
      ci: item.sha ? statuses.get(item.sha) ?? null : null,
    }));
  }

  // Incoming = Vercel (or GitHub) preview deploys ready for QA. Open PRs are
  // attached when they match; they are not required. A closed smoke PR must
  // not hide a READY preview from Ops.
  const attached = new Set(items.flatMap((item) => (item.pull ? [item.pull.number] : [])));
  pulls = pulls.filter((p) => !attached.has(p.number));

  // Hide previews already accepted into production (sha / preview host).
  if (items.length && settings.project_id) {
    const supabase = await createClient();
    const { data: promoted } = await supabase
      .from('project_release_requests')
      .select('commit_sha, preview_url')
      .eq('project_id', settings.project_id)
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })
      .limit(40);
    items = filterPromotedPreviews(
      items,
      (promoted ?? []).map((row) => ({
        sha: row.commit_sha as string | null,
        previewUrl: row.preview_url as string | null,
      }))
    );
  }

  const bypass = settings.vercel_project_id
    ? await getVercelAutomationBypassSecret({
        projectId: settings.vercel_project_id,
        teamId: settings.vercel_team_id,
      })
    : null;
  items = items.map((item) => ({
    ...item,
    openUrl: withVercelPreviewBypass(item.previewUrl, bypass),
  }));

  let hint: string | null = null;
  if (
    !items.length &&
    settings.github_owner &&
    settings.github_repo &&
    releasesTokenConfigured()
  ) {
    const [mainSha, previewSha] = await Promise.all([
      getGitRefSha({
        owner: settings.github_owner,
        repo: settings.github_repo,
        ref: settings.promote_ref || 'main',
      }),
      getGitRefSha({
        owner: settings.github_owner,
        repo: settings.github_repo,
        ref: OPS_RELEASE_BRANCH,
      }),
    ]);
    hint = incomingEmptyHint({ mainSha, previewSha });
  }

  return { items, pulls, error, hint, previewAccessSecret: bypass };
}

export async function decideGithubPull(projectId: string, formData: FormData) {
  const { supabase, user } = await assertReleaseOps(projectId);
  const decision = String(formData.get('decision') || '').trim();
  const number = Number(formData.get('pullNumber'));
  if (!Number.isInteger(number) || number < 1) await throwPublic('ops.releases.errPull');
  if (decision !== 'merge' && decision !== 'reject') await throwPublic('ops.releases.errDecision');

  const { data: settings } = await supabase
    .from('project_release_settings')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!settings?.enabled) await throwPublic('ops.releases.incomingDisabled');
  const owner = settings.github_owner?.trim();
  const repo = settings.github_repo?.trim();
  if (!owner || !repo) await throwPublic('ops.releases.incomingMisconfigured');

  if (decision === 'merge') {
    const result = await mergePullRequest({ owner, repo, number });
    if (!result.ok) throw await throwExternal(result.error, 'ops.releases.errGithub');
  } else {
    const review = await reviewPullRequest({
      owner,
      repo,
      number,
      event: 'REQUEST_CHANGES',
      body: 'Rechazado desde Codiva Ops. Cerrado sin merge.',
    });
    if (!review.ok) {
      await reviewPullRequest({
        owner,
        repo,
        number,
        event: 'COMMENT',
        body: 'Rechazado desde Codiva Ops. Cerrado sin merge.',
      });
    }
    const closed = await closePullRequest({ owner, repo, number });
    if (!closed.ok) throw await throwExternal(closed.error, 'ops.releases.errGithub');
  }

  await logActivity({
    entityType: 'project',
    entityId: projectId,
    action: decision === 'merge' ? 'release_pr_merged' : 'release_pr_rejected',
    actorId: user.id,
    metadata: { project_id: projectId, pull: number, owner, repo },
  });

  revalidateReleasePaths(projectId, await projectSlug(supabase, projectId));
}

export async function acceptAndPromoteIncoming(projectId: string, formData: FormData) {
  const { supabase, user } = await assertReleaseOps(projectId);

  const preview_url = String(formData.get('previewUrl') || '').trim();
  if (!preview_url) await throwPublic('ops.releases.errPreviewUrl');

  const { data: settings } = await supabase
    .from('project_release_settings')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!settings?.enabled) await throwPublic('ops.releases.incomingDisabled');

  const deploymentId = String(formData.get('deploymentId') || '').trim() || null;
  const commit_sha = String(formData.get('sha') || '').trim() || null;
  const commit_message = String(formData.get('message') || '').trim() || null;

  const { data, error } = await supabase
    .from('project_release_requests')
    .insert({
      project_id: projectId,
      status: 'approved',
      preview_url,
      production_url: String(formData.get('productionUrl') || '').trim() || null,
      notes: commit_message || '',
      commit_sha,
      commit_message,
      vercel_deployment_id: deploymentId,
      requested_by: user.id,
      requested_by_kind: 'staff',
      approved_by: user.id,
    })
    .select('id')
    .single();
  if (error || !data) throw await throwDb(error);

  await logActivity({
    entityType: 'project_release_request',
    entityId: data.id,
    action: 'approved',
    actorId: user.id,
    metadata: { project_id: projectId, kind: 'incoming', sha: commit_sha },
  });

  await dispatchReleasePromote(data.id, projectId);
}

export async function approveReleaseRequest(requestId: string, projectId: string) {
  const { supabase, user } = await assertReleaseOps(projectId);

  const { error } = await supabase
    .from('project_release_requests')
    .update({
      status: 'approved',
      approved_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('project_id', projectId)
    .eq('status', 'pending_approval');
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_release_request',
    entityId: requestId,
    action: 'approved',
    actorId: user.id,
    metadata: { project_id: projectId },
  });

  revalidateReleasePaths(projectId, await projectSlug(supabase, projectId));
}

export async function cancelReleaseRequest(requestId: string, projectId: string) {
  const { supabase, user } = await assertReleaseOps(projectId);

  const { error } = await supabase
    .from('project_release_requests')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('project_id', projectId)
    .in('status', ['pending_approval', 'approved', 'failed']);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_release_request',
    entityId: requestId,
    action: 'cancelled',
    actorId: user.id,
    metadata: { project_id: projectId },
  });

  revalidateReleasePaths(projectId, await projectSlug(supabase, projectId));
}

export async function dispatchReleasePromote(requestId: string, projectId: string) {
  const { supabase, user } = await assertReleaseOps(projectId);

  const { data: req, error: reqErr } = await supabase
    .from('project_release_requests')
    .select('*')
    .eq('id', requestId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (reqErr) throw await throwDb(reqErr);
  if (!req) await throwPublic('ops.releases.errRequest');
  if (!['approved', 'failed'].includes(req.status)) {
    await throwPublic('ops.releases.errNotDispatchable');
  }

  const { data: settings } = await supabase
    .from('project_release_settings')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!settings?.enabled) {
    await throwPublic('ops.releases.incomingDisabled');
  }

  await supabase
    .from('project_release_requests')
    .update({
      status: 'dispatching',
      error_message: null,
      updated_at: new Date().toISOString(),
      dispatched_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  const vercelProjectId = settings.vercel_project_id as string | null | undefined;
  const vercelTeamId = settings.vercel_team_id as string | null | undefined;
  let deploymentId = (req.vercel_deployment_id as string | null) || null;

  if (!deploymentId && vercelProjectId && vercelTokenConfigured()) {
    deploymentId = await resolveVercelDeploymentId({
      previewUrl: req.preview_url,
      teamId: vercelTeamId,
    });
    if (deploymentId) {
      await supabase
        .from('project_release_requests')
        .update({ vercel_deployment_id: deploymentId })
        .eq('id', requestId);
    }
  }

  type DispatchResult =
    | { ok: true; runUrl: string | null; deploymentId?: string; url?: string | null }
    | { ok: false; error: string; missingToken?: boolean; source: 'vercel' | 'github' | 'config' };

  let result: DispatchResult;

  const previewDeploymentId = deploymentId;

  if (vercelProjectId && deploymentId && vercelTokenConfigured()) {
    const promoted = await promoteVercelDeployment({
      projectId: vercelProjectId,
      deploymentId,
      teamId: vercelTeamId,
    });
    result = promoted.ok
      ? {
          ok: true,
          runUrl: promoted.inspectUrl,
          deploymentId: promoted.deploymentId,
          url: promoted.url,
        }
      : { ok: false, error: promoted.error, missingToken: promoted.missingToken, source: 'vercel' };
  } else if (settings.github_owner && settings.github_repo) {
    const dispatched = await dispatchPromoteWorkflow({
      owner: settings.github_owner,
      repo: settings.github_repo,
      workflow: settings.promote_workflow,
      ref: settings.promote_ref,
      deploymentUrlInput: settings.deployment_url_input,
      previewUrl: req.preview_url,
    });
    result = dispatched.ok
      ? { ok: true, runUrl: dispatched.runUrl }
      : { ok: false, error: dispatched.error, missingToken: dispatched.missingToken, source: 'github' };
  } else {
    result = {
      ok: false,
      source: 'config',
      error:
        'Configura Vercel project ID (promote directo) o GitHub owner/repo + workflow (dispatch).',
    };
  }

  if (!result.ok) {
    await supabase
      .from('project_release_requests')
      .update({
        status: 'failed',
        error_message: result.error,
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    await logActivity({
      entityType: 'project_release_request',
      entityId: requestId,
      action: 'dispatch_failed',
      actorId: user.id,
      metadata: { project_id: projectId, error: result.error, missing_token: result.missingToken },
    });

    revalidateReleasePaths(projectId, await projectSlug(supabase, projectId));
    if (result.source === 'config') await throwPublic('ops.releases.incomingMisconfigured');
    throw await throwExternal(
      result.error,
      result.source === 'vercel' ? 'ops.releases.errVercel' : 'ops.releases.errGithub'
    );
  }

  const buildUrl = result.url?.trim() || null;
  const stableProductionUrl =
    typeof req.production_url === 'string' ? req.production_url.trim() : '';

  await supabase
    .from('project_release_requests')
    .update({
      status: 'succeeded',
      github_run_url: result.runUrl,
      vercel_deployment_id: result.deploymentId ?? deploymentId,
      production_url: buildUrl || stableProductionUrl || null,
      error_message: null,
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  // Preview → production rebuild leaves the old preview READY; remove it from Incoming.
  if (
    previewDeploymentId &&
    result.deploymentId &&
    previewDeploymentId !== result.deploymentId &&
    vercelTokenConfigured()
  ) {
    await deleteVercelDeployment({
      deploymentId: previewDeploymentId,
      teamId: vercelTeamId,
    });
  }

  if (stableProductionUrl) {
    await supabase
      .from('projects')
      .update({
        site_production_url: stableProductionUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
  }

  await logActivity({
    entityType: 'project_release_request',
    entityId: requestId,
    action: 'dispatched',
    actorId: user.id,
    metadata: { project_id: projectId, run_url: result.runUrl },
  });

  revalidateReleasePaths(projectId, await projectSlug(supabase, projectId));
}

export async function markReleaseSucceededManually(requestId: string, projectId: string) {
  const { supabase, user } = await assertReleaseOps(projectId);

  const { error } = await supabase
    .from('project_release_requests')
    .update({
      status: 'succeeded',
      notes: 'Marcado como promovido manualmente (Vercel/GitHub fuera de Codiva).',
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'project_release_request',
    entityId: requestId,
    action: 'manual_succeeded',
    actorId: user.id,
    metadata: { project_id: projectId },
  });

  revalidateReleasePaths(projectId, await projectSlug(supabase, projectId));
}

/** Remove a preview deploy from Vercel so it leaves Incoming. */
export async function discardIncomingPreview(projectId: string, formData: FormData) {
  const { supabase, user } = await assertReleaseOps(projectId);
  const deploymentId = String(formData.get('deploymentId') || '').trim();
  if (!deploymentId) await throwPublic('ops.releases.errDeploymentId');

  const { data: settings } = await supabase
    .from('project_release_settings')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!settings?.enabled) await throwPublic('ops.releases.incomingDisabled');
  if (!vercelTokenConfigured()) await throwPublic('ops.releases.errVercel');

  const deleted = await deleteVercelDeployment({
    deploymentId,
    teamId: settings.vercel_team_id,
  });
  if (!deleted.ok) throw await throwExternal(deleted.error, 'ops.releases.errVercel');

  await logActivity({
    entityType: 'project',
    entityId: projectId,
    action: 'release_preview_discarded',
    actorId: user.id,
    metadata: { deployment_id: deploymentId },
  });

  revalidateReleasePaths(projectId, await projectSlug(supabase, projectId));
}

/**
 * Point preview/ops-release at main HEAD so CI builds a clean QA preview for Ops.
 */
export async function prepareOpsRelease(projectId: string) {
  const { supabase, user } = await assertReleaseOps(projectId);

  const { data: settings } = await supabase
    .from('project_release_settings')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!settings?.enabled) await throwPublic('ops.releases.incomingDisabled');
  const owner = settings.github_owner?.trim();
  const repo = settings.github_repo?.trim();
  if (!owner || !repo) await throwPublic('ops.releases.incomingMisconfigured');
  if (!releasesTokenConfigured()) await throwPublic('ops.releases.errGithub');

  const result = await upsertOpsReleaseBranch({
    owner,
    repo,
    fromRef: settings.promote_ref || 'main',
    branch: OPS_RELEASE_BRANCH,
  });
  if (!result.ok) {
    throw await throwExternal(result.error, 'ops.releases.errGithub');
  }

  const dispatched = await dispatchCiWorkflow({
    owner,
    repo,
    ref: OPS_RELEASE_BRANCH,
  });
  if (!dispatched.ok && !dispatched.missing) {
    throw await throwExternal(dispatched.error, 'ops.releases.errGithub');
  }

  await logActivity({
    entityType: 'project',
    entityId: projectId,
    action: 'release_prepare',
    actorId: user.id,
    metadata: {
      branch: result.branch,
      sha: result.sha,
      created: result.created,
      url: result.url,
    },
  });

  revalidateReleasePaths(projectId, await projectSlug(supabase, projectId));
}

/** Delete dirty / old Vercel previews (keeps newest git-alias per SHA). */
export async function cleanupIncomingPreviews(projectId: string) {
  const { supabase, user } = await assertReleaseOps(projectId);

  const { data: settings } = await supabase
    .from('project_release_settings')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();

  if (!settings?.enabled) await throwPublic('ops.releases.incomingDisabled');
  if (!settings.vercel_project_id) await throwPublic('ops.releases.incomingMisconfigured');
  if (!vercelTokenConfigured()) await throwPublic('ops.releases.errVercel');

  const result = await cleanupStaleVercelPreviews({
    projectId: settings.vercel_project_id,
    teamId: settings.vercel_team_id,
  });
  if (result.error) throw await throwExternal(result.error, 'ops.releases.errVercel');

  await logActivity({
    entityType: 'project',
    entityId: projectId,
    action: 'release_previews_cleaned',
    actorId: user.id,
    metadata: { deleted: result.deleted },
  });

  revalidateReleasePaths(projectId, await projectSlug(supabase, projectId));
}

export { releasesTokenConfigured, vercelTokenConfigured };
