import BrandedFileInput from '@/components/ops/BrandedFileInput';
import ToastForm from '@/components/ops/ToastForm';
import { getT } from '@/i18n/locale';
import {
  createDocumentRequest,
  createDocumentRequestFromPreset,
  markDocumentSigned,
  runDocumentRetentionDisposal,
  updateDocumentRequestStatus,
  uploadDocument,
} from '@/lib/ops/actions';
import { DOCUMENT_REQUEST_PRESETS } from '@/lib/ops/document-request-presets';
import { labelsFor } from '@/lib/ops/labels';
import { isLegacyQuotePackDocument } from '@/lib/ops/quotes';
import { isHttpUrl } from '@/lib/ops/requested-url';
import { isLegacyNdaDraftDocument, opsFileHref } from '@/lib/ops/storage';
import type { ActivityRow, DocumentRequestRow, DocumentRow, FileAccessRow } from './types';

export default async function ProjectDocumentosTab({
  projectId,
  documents,
  docRequests,
  fileAccess,
  recentActivity,
  memberEmails,
}: {
  projectId: string;
  documents: DocumentRow[];
  docRequests: DocumentRequestRow[];
  fileAccess: FileAccessRow[];
  recentActivity: ActivityRow[];
  memberEmails: Map<string, string>;
}) {
  const t = await getT();
  const {
    DOCUMENT_TYPE_LABELS,
    DOCUMENT_SOURCE_LABELS,
    DOCUMENT_REQUEST_STATUS_LABELS,
    DOCUMENT_REQUEST_INPUT_LABELS,
    formatDate,
  } = labelsFor(t.locale);
  const existingRequestCodes = new Set(
    docRequests.map((r) => r.code).filter((code): code is string => Boolean(code))
  );
  const availableRequestPresets = DOCUMENT_REQUEST_PRESETS.filter(
    (preset) => !existingRequestCodes.has(preset.code)
  );
  const staffDocuments = documents;

  return (
<div className="space-y-6">
  <div className="flex flex-wrap gap-2">
    <ToastForm success={t('ops.project.retentionRun')} action={async () => { 'use server'; await runDocumentRetentionDisposal(); }}>
      <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
        {t('ops.project.runRetention')}
      </button>
    </ToastForm>
    <a
      href={`/api/ops/projects/${projectId}/compliance-export`}
      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
    >
      {t('ops.project.downloadExport')}
    </a>
  </div>

  <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
    <div>
      <h3 className="font-semibold">{t('ops.project.clientRequests')}</h3>
      <p className="mt-1 text-sm text-zinc-500">
        {t('ops.project.clientRequestsHint')}
      </p>
    </div>
    {availableRequestPresets.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {availableRequestPresets.map((preset) => (
          <ToastForm
            key={preset.code}
            success={t('ops.project.requestCreated')}
            action={async () => {
              'use server';
              await createDocumentRequestFromPreset(projectId, preset.code);
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              + {preset.title}
            </button>
          </ToastForm>
        ))}
      </div>
    ) : null}
    <ToastForm success={t('ops.project.requestCreated')}
      action={async (fd) => {
        'use server';
        await createDocumentRequest(projectId, fd);
      }}
      className="grid gap-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2"
    >
      <input
        name="title"
        required
        placeholder={t('ops.project.requestTitle')}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2"
      />
      <input
        name="code"
        placeholder={t('ops.project.requestCode')}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
      />
      <select name="inputMode" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
        {Object.entries(DOCUMENT_REQUEST_INPUT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <select name="expectedType" className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm">
        {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <input
        name="sortOrder"
        type="number"
        defaultValue={((docRequests ?? []).length + 1) * 10}
        placeholder={t('ops.project.requestOrder')}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
      />
      <textarea
        name="description"
        rows={2}
        placeholder={t('ops.project.requestDesc')}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2"
      />
      <textarea
        name="instructions"
        rows={2}
        placeholder={t('ops.project.requestInstructions')}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-2"
      />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="required" defaultChecked />
        {t('ops.project.required')}
      </label>
      <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white sm:col-span-2 sm:w-fit">
        {t('ops.project.createRequest')}
      </button>
    </ToastForm>

    <ul className="space-y-2">
      {(docRequests ?? []).map((r) => (
        <li
          key={r.id}
          className="rounded-lg border border-zinc-200 px-4 py-3 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">
                {r.title}
                {r.code ? (
                  <span className="ml-2 font-mono text-xs text-zinc-400">{r.code}</span>
                ) : null}
              </p>
              <p className="text-zinc-500">
                {DOCUMENT_REQUEST_STATUS_LABELS[r.status] ?? r.status}
                {' · '}
                {DOCUMENT_REQUEST_INPUT_LABELS[r.input_mode] ?? r.input_mode}
                {r.required ? t('ops.project.requiredSuffix') : ''}
              </p>
              {r.description && <p className="mt-1 text-zinc-600">{r.description}</p>}
              {r.response_text &&
                (isHttpUrl(r.response_text) ? (
                  <a
                    href={r.response_text}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block break-all text-sm text-codiva-primary hover:underline"
                  >
                    {r.response_text}
                  </a>
                ) : (
                  <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded bg-zinc-50 p-2 text-xs text-zinc-700">
                    {r.response_text}
                  </pre>
                ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {r.status !== 'open' && (
                <ToastForm success={t('ops.project.requestReopened')}
                  action={async () => {
                    'use server';
                    await updateDocumentRequestStatus(projectId, r.id, 'open');
                  }}
                >
                  <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                    {t('ops.project.reopen')}
                  </button>
                </ToastForm>
              )}
              {r.status === 'open' && (
                <>
                  <ToastForm success={t('ops.project.requestWaived')}
                    action={async () => {
                      'use server';
                      await updateDocumentRequestStatus(projectId, r.id, 'waived');
                    }}
                  >
                    <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                      {t('ops.project.waive')}
                    </button>
                  </ToastForm>
                  <ToastForm success={t('ops.project.requestCancelled')}
                    action={async () => {
                      'use server';
                      await updateDocumentRequestStatus(projectId, r.id, 'cancelled');
                    }}
                  >
                    <button type="submit" className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                      {t('ops.project.cancel')}
                    </button>
                  </ToastForm>
                </>
              )}
            </div>
          </div>
        </li>
      ))}
      {!docRequests?.length && (
        <p className="text-sm text-zinc-500">{t('ops.project.noRequests')}</p>
      )}
    </ul>
  </section>

  <ToastForm success={t('ops.project.docUploaded')} action={async (fd) => { 'use server'; await uploadDocument(projectId, fd); }} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
    <h3 className="font-semibold">{t('ops.project.uploadDoc')}</h3>
    <p className="text-sm text-zinc-500">
      {t('ops.project.uploadDocHint')}
    </p>
    <input name="title" placeholder={t('ops.project.title')} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
    <select name="type" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
      <option value="contract">{DOCUMENT_TYPE_LABELS.contract}</option>
      <option value="nda">{DOCUMENT_TYPE_LABELS.nda}</option>
      <option value="other">{DOCUMENT_TYPE_LABELS.other}</option>
    </select>
    <textarea name="notes" placeholder={t('ops.project.notesClient')} rows={2} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
    <BrandedFileInput required multiple hint={t('ops.project.fileHint')} />
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visibleToClient" defaultChecked /> {t('ops.project.visibleClientCheck')}</label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="signed" /> {t('ops.project.signed')}</label>
    <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm text-white">{t('ops.project.upload')}</button>
  </ToastForm>
  <ul className="space-y-2">
    {staffDocuments.map((d) => {
      const href = (() => {
        const base = opsFileHref(d.file_path, d.file_url);
        if (!base) return null;
        if (base.startsWith('/api/ops/file')) return `${base}&documentId=${encodeURIComponent(d.id)}`;
        return base;
      })();
      return (
      <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm">
        <div>
          <p className="font-medium">
            {d.title} {d.signed ? '✓' : ''}
            {d.disposed_at ? t('ops.project.disposed') : ''}
          </p>
          <p className="text-zinc-500">
            {DOCUMENT_TYPE_LABELS[d.type] ?? d.type}
            {' · '}
            {d.source ? DOCUMENT_SOURCE_LABELS[d.source] ?? d.source : 'staff'}
            {' · '}
            {formatDate(d.uploaded_at)}
            {d.scan_status ? ` · scan:${d.scan_status}` : ''}
            {d.retain_until ? t('ops.project.retainUntil', { date: formatDate(d.retain_until) }) : ''}
            {isLegacyQuotePackDocument(d) ? t('ops.project.legacyQuotePack') : ''}
            {isLegacyNdaDraftDocument(d) ? t('ops.project.legacyNda') : ''}
          </p>
          {d.content_sha256 && (
            <p className="mt-1 font-mono text-xs text-zinc-400" title={d.content_sha256}>
              SHA-256: {d.content_sha256.slice(0, 20)}…
            </p>
          )}
          {d.notes && <p className="mt-1 text-zinc-600">{d.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          {href && (
            <a href={href} target="_blank" rel="noreferrer" className="text-codiva-primary hover:underline">
              {t('ops.project.view')}
            </a>
          )}
          {!d.signed && (
            <ToastForm success={t('ops.project.markedSigned')} action={async () => { 'use server'; await markDocumentSigned(d.id, projectId, true); }}>
              <button type="submit" className="rounded-lg border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50">
                {t('ops.project.markSigned')}
              </button>
            </ToastForm>
          )}
        </div>
      </li>
      );
    })}
  </ul>

  <section className="rounded-xl border border-zinc-200 bg-white p-5">
    <h3 className="mb-1 font-semibold">{t('ops.project.auditTitle')}</h3>
    <p className="mb-3 text-sm text-zinc-500">{t('ops.project.auditHint')}</p>
    <ul className="space-y-2 text-sm">
      {(fileAccess ?? []).slice(0, 10).map((a) => (
        <li key={a.id} className="rounded-lg border border-zinc-100 px-3 py-2">
          <span className="font-medium">{t('ops.project.download')}</span>
          {' · '}
          {memberEmails.get(a.actor_id ?? '') ?? a.actor_id?.slice(0, 8) ?? t('ops.project.system')}
          {' · '}
          <span className="text-zinc-500">{formatDate(a.created_at)}</span>
          {a.ip && <span className="text-zinc-400"> · {a.ip}</span>}
          <p className="truncate text-xs text-zinc-400">{a.file_path}</p>
        </li>
      ))}
      {(recentActivity ?? [])
        .filter((a) => a.action === 'uploaded' || a.action === 'legal_accepted')
        .slice(0, 10)
        .map((a) => (
          <li key={a.id} className="rounded-lg border border-zinc-100 px-3 py-2">
            <span className="font-medium">
              {a.action === 'legal_accepted' ? t('ops.project.legalAccepted') : t('ops.project.docUploadedEvent')}
            </span>
            {' · '}
            {memberEmails.get(a.actor_id ?? '') ?? a.actor_id?.slice(0, 8) ?? t('ops.project.system')}
            {' · '}
            <span className="text-zinc-500">{formatDate(a.created_at)}</span>
          </li>
        ))}
      {!fileAccess?.length &&
        !(recentActivity ?? []).some((a) => a.action === 'uploaded' || a.action === 'legal_accepted') && (
          <p className="text-zinc-500">{t('ops.project.noAudit')}</p>
        )}
    </ul>
  </section>
</div>
  );
}
