import { describe, expect, it } from 'vitest';
import { attentionItemKey, filterAttentionItems, snoozeUntilIso } from './attention';
import {
  filterIncomingForReleaseAttention,
  occupiedLooksByProject,
  releaseAttentionFromIncoming,
  releaseAttentionFromRequest,
  releaseIncomingAttentionId,
  staffCanSeeReleaseAttention,
} from './release-attention';

const preview = {
  deploymentId: 'dpl_new',
  previewUrl: 'https://nirc-new.vercel.app',
  sha: 'aaaaaaaa',
  createdAt: '2026-09-19T18:00:00.000Z',
  message: 'feat: landing',
};

describe('staffCanSeeReleaseAttention', () => {
  it('is limited to admin and PM', () => {
    expect(staffCanSeeReleaseAttention('admin')).toBe(true);
    expect(staffCanSeeReleaseAttention({ role: 'pm' })).toBe(true);
    expect(staffCanSeeReleaseAttention({ role: 'dev' })).toBe(false);
    expect(staffCanSeeReleaseAttention({ role: 'dev', capabilities: ['site_access'] })).toBe(false);
  });
});

describe('releaseIncomingAttentionId', () => {
  it('prefers deployment id, then sha, then host', () => {
    expect(releaseIncomingAttentionId(preview)).toBe('dpl_new');
    expect(releaseIncomingAttentionId({ ...preview, deploymentId: null })).toBe('aaaaaaaa');
    expect(
      releaseIncomingAttentionId({
        deploymentId: null,
        sha: null,
        previewUrl: 'https://nirc-host.vercel.app/path',
        createdAt: preview.createdAt,
      })
    ).toBe('nirc-host.vercel.app');
  });
});

describe('filterIncomingForReleaseAttention', () => {
  it('keeps a new Incoming deploy', () => {
    const kept = filterIncomingForReleaseAttention([preview], []);
    expect(kept.map((row) => row.deploymentId)).toEqual(['dpl_new']);
  });

  it('hides Incoming already succeeded or otherwise occupied', () => {
    const occupied = occupiedLooksByProject([
      {
        project_id: 'p1',
        commit_sha: 'aaaaaaaa',
        preview_url: 'https://old.vercel.app',
      },
    ]);
    expect(filterIncomingForReleaseAttention([preview], occupied.get('p1') ?? [])).toEqual([]);
  });

  it('hides Incoming that matches an open request sha', () => {
    const occupied = occupiedLooksByProject([
      {
        project_id: 'p1',
        commit_sha: 'aaaaaaaa',
        preview_url: 'https://nirc-new.vercel.app',
      },
    ]);
    expect(filterIncomingForReleaseAttention([preview], occupied.get('p1') ?? [])).toEqual([]);
  });

  it('drops dirty and main/master previews', () => {
    const kept = filterIncomingForReleaseAttention(
      [
        { ...preview, dirty: true, deploymentId: 'dpl_dirty' },
        { ...preview, branch: 'main', sha: 'bbbbbbbb', deploymentId: 'dpl_main' },
        { ...preview, branch: 'preview/ops-release', sha: 'cccccccc', deploymentId: 'dpl_ok' },
      ],
      []
    );
    expect(kept.map((row) => row.deploymentId)).toEqual(['dpl_ok']);
  });
});

describe('releaseAttentionFromIncoming', () => {
  it('keys each Incoming deploy so snooze does not hide a newer one', () => {
    const first = releaseAttentionFromIncoming({
      projectName: 'NIRC',
      projectSlug: 'nirc',
      preview,
    });
    const newer = releaseAttentionFromIncoming({
      projectName: 'NIRC',
      projectSlug: 'nirc',
      preview: { ...preview, deploymentId: 'dpl_newer', sha: 'bbbbbbbb', createdAt: '2026-09-19T19:00:00.000Z' },
    });
    expect(first?.key).toBe(attentionItemKey('release_qa', 'dpl_new'));
    expect(newer?.key).toBe(attentionItemKey('release_qa', 'dpl_newer'));
    expect(first?.subtitle).toBe('Deploy listo para producción');
    expect(first?.href).toBe('/projects/nirc?tab=releases');

    const now = new Date('2026-09-19T20:00:00.000Z');
    const filtered = filterAttentionItems(
      [first!, newer!],
      [{ item_key: first!.key, until: snoozeUntilIso(now) }],
      now,
      0
    );
    expect(filtered.map((row) => row.key)).toEqual([newer!.key]);
  });
});

describe('releaseAttentionFromRequest', () => {
  it('emits pending QA and failed promotes, not in-flight approved rows', () => {
    const pending = releaseAttentionFromRequest({
      id: 'req-qa',
      status: 'pending_approval',
      projectName: 'NIRC',
      projectSlug: 'nirc',
      createdAt: preview.createdAt,
    });
    const failed = releaseAttentionFromRequest({
      id: 'req-fail',
      status: 'failed',
      projectName: 'NIRC',
      projectSlug: 'nirc',
      createdAt: preview.createdAt,
    });
    expect(pending?.subtitle).toBe('Preview pendiente de QA');
    expect(failed?.subtitle).toBe('Promote a producción falló');
    expect(
      releaseAttentionFromRequest({
        id: 'req-ok',
        status: 'approved',
        projectName: 'NIRC',
        projectSlug: 'nirc',
        createdAt: preview.createdAt,
      })
    ).toBeNull();
  });

  it('does not duplicate Incoming when a failed request already occupies the sha', () => {
    const occupied = occupiedLooksByProject([
      { project_id: 'p1', commit_sha: 'aaaaaaaa', preview_url: preview.previewUrl },
    ]);
    const incoming = filterIncomingForReleaseAttention([preview], occupied.get('p1') ?? []);
    const failed = releaseAttentionFromRequest({
      id: 'req-fail',
      status: 'failed',
      projectName: 'NIRC',
      projectSlug: 'nirc',
      createdAt: preview.createdAt,
    });
    expect(incoming).toEqual([]);
    expect(failed?.key).toBe(attentionItemKey('release_qa', 'req-fail'));
  });
});
