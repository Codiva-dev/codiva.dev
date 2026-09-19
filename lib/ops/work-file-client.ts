import {
  WORK_FILE_PROBLEM_I18N,
  workFileLabel,
  workFileProblem,
} from '@/lib/ops/work-board';

type Translate = (key: string, options?: Record<string, string | number>) => string;

type SignOk = { ok: true; signedUrl: string; path: string };
type ApiErr = { ok?: false; error?: string };

async function postJson<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/ops/assignment-file', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: (T & ApiErr) | null = null;
  try {
    data = (await res.json()) as T & ApiErr;
  } catch {
    data = null;
  }
  if (!res.ok || !data || data.ok === false) {
    throw new Error(data?.error || `upload ${res.status}`);
  }
  return data;
}

export async function uploadWorkAssignmentFiles(
  assignmentId: string,
  files: File[],
  t: Translate
) {
  if (!files.length) throw new Error(t('ops.asignaciones.fileRequired'));

  for (const file of files) {
    const problem = workFileProblem(file);
    const name = workFileLabel(file.name) || t('ops.asignaciones.unnamedFile');
    if (problem) throw new Error(t(WORK_FILE_PROBLEM_I18N[problem], { name }));

    const sign = await postJson<SignOk>({
      intent: 'sign',
      assignmentId,
      fileName: file.name,
      contentType: file.type,
      byteSize: file.size,
    });
    if (!sign.signedUrl || !sign.path) {
      throw new Error(t('ops.asignaciones.fileUploadFailed', { name }));
    }

    const put = await fetch(sign.signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
    });
    if (!put.ok) throw new Error(t('ops.asignaciones.fileUploadFailed', { name }));

    await postJson({
      intent: 'complete',
      assignmentId,
      path: sign.path,
      fileName: file.name,
      contentType: file.type,
    });
  }
}
