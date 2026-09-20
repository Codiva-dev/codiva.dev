'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  requireStaffWrite,
  requireAdminStaff,
  requirePortalAccess,
  assertCapabilityWrite,
  assertProjectAccessOrThrow,
} from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { logActivity } from '@/lib/ops/activity';
import { documentRequestPresetByCode } from '@/lib/ops/document-request-presets';
import {
  isHttpUrl,
  normalizeRequestedUrl,
  resolveFileOrUrlInput,
} from '@/lib/ops/requested-url';
import {
  sendClientEmail,
  notifyStaff,
} from '@/lib/ops/email';
import { getT } from '@/i18n/locale';
import { throwDb } from '@/lib/ops/throw-db';
import {
  templateStaffAlert,
  templateLegalReacceptance,
} from '@/lib/ops/email-templates';
import { LEGAL_DOCS_VERSION } from '@/lib/ops/legal/version';
import { projectPortalUrl } from '@/lib/ops/host';
import {
  opsProjectPathById,
  opsProjectUrl,
} from '@/lib/ops/project-path';
import { uploadOpsFile } from '@/lib/ops/storage';
import {
  ingestProjectDocument,
  ingestOrgDocument,
  markOrganizationMutualNdaSigned,
  disposeExpiredDocuments,
} from '@/lib/ops/document-ingest';
import { getRequestAudit } from '@/lib/ops/request-audit';
import {
  formFiles,
  titlesForUploads,
  OPS_FORM_MAX_FILES,
} from '@/lib/ops/form-files';
import {
  architectureStarterHtml,
  isCanvasKind,
  MAX_ARCHITECTURE_HTML_CHARS,
  readClientPackHtml,
} from '@/lib/ops/architecture';

export async function uploadDocument(projectId: string, formData: FormData) {
  const access = await assertCapabilityWrite('documents');
  await assertProjectAccessOrThrow(access, projectId);
  const { user, supabase } = access;
  const files = formFiles(formData);
  if (!files.length) throw new Error('Archivo requerido');
  if (files.length > OPS_FORM_MAX_FILES) {
    throw new Error(`Máximo ${OPS_FORM_MAX_FILES} archivos`);
  }

  const sharedTitle = String(formData.get('title') || '').trim();
  const type = String(formData.get('type') || 'other');
  const signed = formData.get('signed') === 'on';
  const visibleToClient = formData.get('visibleToClient') === 'on';
  const notes = String(formData.get('notes') || '');
  const audit = await getRequestAudit();

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .maybeSingle();
  const organizationId = project?.organization_id ?? null;
  const isSignedNda = type === 'nda' && signed && Boolean(organizationId);

  for (const [index, file] of files.entries()) {
    const title =
      files.length === 1
        ? sharedTitle || file.name
        : sharedTitle
          ? `${sharedTitle} - ${file.name}`
          : file.name;

    const { doc, sha256, path, scan } = isSignedNda
      ? await ingestOrgDocument({
          organizationId: organizationId!,
          projectId,
          file,
          type,
          title,
          notes,
          signed: true,
          visibleToClient,
          source: 'staff',
          uploadedBy: user.id,
          folder: 'nda',
          audit,
        })
      : await ingestProjectDocument({
          projectId,
          file,
          type,
          title,
          notes,
          signed,
          visibleToClient,
          source: 'staff',
          uploadedBy: user.id,
          folder: 'documents',
          audit,
        });

    if (isSignedNda && organizationId && index === 0) {
      await markOrganizationMutualNdaSigned({ organizationId, documentId: doc.id });
      revalidatePath('/p', 'layout');
    }

    await logActivity({
      entityType: 'document',
      entityId: doc.id,
      action: 'uploaded',
      actorId: user.id,
      metadata: {
        project_id: projectId,
        title,
        type,
        source: 'staff',
        file_path: path,
        content_sha256: sha256,
        scan_status: scan.status,
        scan_provider: scan.provider,
        ip: audit.ip,
        user_agent: audit.userAgent,
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function createDeliverable(projectId: string, formData: FormData) {
  const access = await assertCapabilityWrite('deliverables');
  await assertProjectAccessOrThrow(access, projectId);
  const { user, supabase } = access;

  const files = formFiles(formData);
  if (files.length > OPS_FORM_MAX_FILES) {
    throw new Error(`Máximo ${OPS_FORM_MAX_FILES} archivos`);
  }

  const titles = titlesForUploads(String(formData.get('title') || ''), files);
  if (!titles.length) throw new Error('Título o archivo requerido');

  const kind = String(formData.get('kind') || 'other');
  const sortOrder = parseInt(String(formData.get('sortOrder') || '0'), 10) || 0;
  const description = String(formData.get('description') || '');
  const url = String(formData.get('url') || '') || null;
  const visibleToClient = formData.get('visibleToClient') === 'on';
  const rows = files.length ? files.map((file, index) => ({ file, title: titles[index] })) : [{ file: null, title: titles[0] }];

  for (const [index, row] of rows.entries()) {
    let filePath: string | null = null;
    let fileUrl: string | null = null;
    if (row.file) {
      const uploaded = await uploadOpsFile(row.file, `projects/${projectId}/deliverables`);
      filePath = uploaded.path;
      fileUrl = uploaded.url;
    }

    const { data: deliverable, error } = await supabase
      .from('deliverables')
      .insert({
        project_id: projectId,
        title: row.title,
        description,
        url,
        file_path: filePath,
        file_url: fileUrl,
        visible_to_client: visibleToClient,
        kind,
        sort_order: sortOrder + index,
      })
      .select('id')
      .single();
    if (error || !deliverable) throw await throwDb(error);

    await logActivity({
      entityType: 'deliverable',
      entityId: deliverable.id,
      action: 'created',
      actorId: user.id,
      metadata: {
        project_id: projectId,
        title: row.title,
        kind,
        file_path: filePath,
      },
    });
  }

  revalidatePath(`/projects/${projectId}`);
}

export async function createArchitectureCanvas(projectId: string, formData: FormData) {
  const access = await assertCapabilityWrite('deliverables');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error('Título requerido');

  const kindRaw = String(formData.get('kind') || 'architecture');
  const kind = isCanvasKind(kindRaw) ? kindRaw : 'architecture';
  const sortOrder = parseInt(String(formData.get('sortOrder') || '0'), 10) || 0;
  const visibleToClient = formData.get('visibleToClient') === 'on';
  const bodyHtml = architectureStarterHtml(title);

  const { data: deliverable, error } = await supabase
    .from('deliverables')
    .insert({
      project_id: projectId,
      title,
      description: String(formData.get('description') || ''),
      url: null,
      body_html: bodyHtml,
      visible_to_client: visibleToClient,
      kind,
      sort_order: sortOrder,
    })
    .select('id')
    .single();
  if (error || !deliverable) throw await throwDb(error);

  await logActivity({
    entityType: 'deliverable',
    entityId: deliverable.id,
    action: 'created',
    actorId: user.id,
    metadata: { project_id: projectId, title, kind, source: 'ops_architecture' },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/p', 'layout');
  const t = await getT();
  const { redirectWithToast } = await import('@/lib/ops/toast');
  redirectWithToast(
    await opsProjectPathById(supabase, projectId, `/arquitectura/${deliverable.id}`),
    t('ops.architecture.created')
  );
}

export async function updateArchitectureCanvas(projectId: string, deliverableId: string, formData: FormData) {
  const access = await assertCapabilityWrite('deliverables');
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase, user } = access;

  const { data: existing } = await supabase
    .from('deliverables')
    .select('id, kind')
    .eq('id', deliverableId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (!existing) throw new Error('Canvas no encontrado');

  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error('Título requerido');

  const kindRaw = String(formData.get('kind') || existing.kind || 'architecture');
  const kind = isCanvasKind(kindRaw) ? kindRaw : 'architecture';
  const sortOrder = parseInt(String(formData.get('sortOrder') || '0'), 10) || 0;
  const visibleToClient = formData.get('visibleToClient') === 'on';
  const bodyHtml = String(formData.get('bodyHtml') || '');
  if (bodyHtml.length > MAX_ARCHITECTURE_HTML_CHARS) {
    throw new Error('El HTML supera el tamaño máximo permitido');
  }

  const { error } = await supabase
    .from('deliverables')
    .update({
      title,
      description: String(formData.get('description') || ''),
      kind,
      sort_order: sortOrder,
      visible_to_client: visibleToClient,
      body_html: bodyHtml,
    })
    .eq('id', deliverableId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'deliverable',
    entityId: deliverableId,
    action: 'updated',
    actorId: user.id,
    metadata: { project_id: projectId, title, kind, visible_to_client: visibleToClient },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/arquitectura/${deliverableId}`);
  revalidatePath('/p', 'layout');
}

export async function hydrateArchitectureFromPacks(projectId: string): Promise<number> {
  const access = await requireStaffWrite();
  await assertProjectAccessOrThrow(access, projectId);
  if (!can(access.staff, 'deliverables')) return 0;
  const { supabase } = access;

  const { data: rows, error } = await supabase
    .from('deliverables')
    .select('id, kind, url, body_html')
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  let adopted = 0;
  for (const row of rows ?? []) {
    if (!isCanvasKind(row.kind)) continue;
    if (row.body_html?.trim()) continue;
    const html = await readClientPackHtml(row.url);
    if (!html) continue;
    const { error: updateError } = await supabase
      .from('deliverables')
      .update({ body_html: html })
      .eq('id', row.id)
      .eq('project_id', projectId);
    if (updateError) throw await throwDb(updateError);
    adopted += 1;
  }

  if (adopted > 0) {
    await logActivity({
      entityType: 'project',
      entityId: projectId,
      action: 'architecture_adopted',
      actorId: access.user.id,
      metadata: { adopted },
    });
  }

  return adopted;
}

export async function adoptArchitecturePacks(projectId: string) {
  const access = await assertCapabilityWrite('deliverables');
  const adopted = await hydrateArchitectureFromPacks(projectId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/p', 'layout');
  const { redirectWithToast } = await import('@/lib/ops/toast');
  const t = await getT();
  redirectWithToast(
    await opsProjectPathById(access.supabase, projectId, '?tab=arquitectura'),
    adopted > 0
      ? t('ops.architecture.packsAdopted', { count: adopted })
      : t('ops.architecture.packsNone')
  );
}

export async function markDocumentSigned(documentId: string, projectId: string, signed = true) {
  const access = await assertCapabilityWrite('documents');
  await assertProjectAccessOrThrow(access, projectId);
  const { error } = await access.supabase
    .from('documents')
    .update({ signed })
    .eq('id', documentId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);
  revalidatePath(`/projects/${projectId}`);
}

export async function setDeliverableVisibility(
  projectId: string,
  deliverableId: string,
  visibleToClient: boolean
) {
  const access = await assertCapabilityWrite('deliverables');
  await assertProjectAccessOrThrow(access, projectId);
  const { error } = await access.supabase
    .from('deliverables')
    .update({ visible_to_client: visibleToClient })
    .eq('id', deliverableId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/p', 'layout');
}

export async function setQuoteVisibility(
  projectId: string,
  quoteId: string,
  visibleToClient: boolean
) {
  const access = await assertCapabilityWrite('quotes');
  await assertProjectAccessOrThrow(access, projectId);
  const { error } = await access.supabase
    .from('quotes')
    .update({ visible_to_client: visibleToClient })
    .eq('id', quoteId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/p', 'layout');
}

export async function acceptPortalLegalDocuments(slug: string, formData: FormData) {
  const access = await requirePortalAccess(slug);
  if (access.isStaffPreview) {
    throw new Error('La vista previa staff no registra aceptaciones');
  }

  const acceptTerms = formData.get('acceptTerms') === 'on';
  const acceptPrivacy = formData.get('acceptPrivacy') === 'on';
  const acceptNda = formData.get('acceptNda') === 'on';
  if (!acceptTerms || !acceptPrivacy || !acceptNda) {
    throw new Error('Debes aceptar Términos, Aviso de Privacidad y NDA');
  }

  const { LEGAL_DOCS_VERSION } = await import('@/lib/ops/legal/version');
  const now = new Date().toISOString();
  const admin = createAdminClient();

  const acceptancePatch = {
    terms_accepted_at: now,
    terms_version: LEGAL_DOCS_VERSION,
    privacy_accepted_at: now,
    privacy_version: LEGAL_DOCS_VERSION,
    nda_accepted_at: now,
    nda_version: LEGAL_DOCS_VERSION,
    accepted_at: now,
  };

  const { data: members, error } = await admin
    .from('project_members')
    .update(acceptancePatch)
    .eq('user_id', access.user.id)
    .select('id, project_id');

  if (error) throw await throwDb(error);
  if (!members?.length) throw new Error('Membresía no encontrada');

  const audit = await getRequestAudit();
  for (const member of members) {
    await logActivity({
      entityType: 'project_member',
      entityId: member.id,
      action: 'legal_accepted',
      actorId: access.user.id,
      metadata: {
        project_id: member.project_id,
        project_slug: slug,
        version: LEGAL_DOCS_VERSION,
        documents: ['terms', 'privacy', 'nda'],
        propagated: member.project_id !== access.project.id,
        ip: audit.ip,
        user_agent: audit.userAgent,
      },
    });
  }

  const { redirectWithToast } = await import('@/lib/ops/toast');
  const t = await getT();
  redirectWithToast(`/p/${slug}`, t('portal.legalAccept.accepted'));
}

export async function createDocumentRequest(projectId: string, formData: FormData) {
  const access = await assertCapabilityWrite('documents');
  await assertProjectAccessOrThrow(access, projectId);
  const { user, supabase } = access;
  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error('Título requerido');

  const inputMode = String(formData.get('inputMode') || 'file');
  if (!['file', 'text', 'credentials', 'url'].includes(inputMode)) {
    throw new Error('Modo de respuesta inválido');
  }

  const { data, error } = await supabase
    .from('document_requests')
    .insert({
      project_id: projectId,
      code: String(formData.get('code') || '').trim() || null,
      title,
      description: String(formData.get('description') || '').trim(),
      instructions: String(formData.get('instructions') || '').trim(),
      expected_type: String(formData.get('expectedType') || 'other'),
      input_mode: inputMode,
      required: formData.get('required') === 'on',
      sort_order: parseInt(String(formData.get('sortOrder') || '0'), 10) || 0,
      due_date: String(formData.get('dueDate') || '') || null,
      created_by: user.id,
      visible_to_client: formData.get('visibleToClient') !== 'off',
      status: 'open',
    })
    .select('id')
    .single();
  if (error || !data) throw await throwDb(error);

  await logActivity({
    entityType: 'document_request',
    entityId: data.id,
    action: 'created',
    actorId: user.id,
    metadata: { project_id: projectId, title, input_mode: inputMode },
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function createDocumentRequestFromPreset(projectId: string, presetCode: string) {
  const preset = documentRequestPresetByCode(presetCode);
  if (!preset) throw new Error('Plantilla desconocida');

  const access = await requireStaffWrite();
  await assertProjectAccessOrThrow(access, projectId);
  const { supabase } = access;

  const { data: existing } = await supabase
    .from('document_requests')
    .select('id')
    .eq('project_id', projectId)
    .eq('code', preset.code)
    .maybeSingle();
  if (existing) throw new Error('Esa solicitud ya existe en este proyecto');

  const fd = new FormData();
  fd.set('code', preset.code);
  fd.set('title', preset.title);
  fd.set('description', preset.description);
  fd.set('instructions', preset.instructions);
  fd.set('expectedType', preset.expectedType);
  fd.set('inputMode', preset.inputMode);
  fd.set('sortOrder', String(preset.sortOrder));
  if (preset.required) fd.set('required', 'on');
  await createDocumentRequest(projectId, fd);
}

export async function updateDocumentRequestStatus(
  projectId: string,
  requestId: string,
  status: 'open' | 'waived' | 'cancelled'
) {
  const access = await assertCapabilityWrite('documents');
  await assertProjectAccessOrThrow(access, projectId);
  const { user, supabase } = access;
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'open') {
    patch.fulfilled_at = null;
    patch.fulfilled_document_id = null;
  }

  const { error } = await supabase
    .from('document_requests')
    .update(patch)
    .eq('id', requestId)
    .eq('project_id', projectId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'document_request',
    entityId: requestId,
    action: `status_${status}`,
    actorId: user.id,
    metadata: { project_id: projectId, status },
  });

  revalidatePath(`/projects/${projectId}`);
}

/** Cliente responde a una solicitud abierta (archivo, texto o accesos). */
export async function clientFulfillDocumentRequest(
  projectId: string,
  slug: string,
  formData: FormData
) {
  const access = await requirePortalAccess(slug);
  if (access.isStaffPreview) {
    throw new Error('Usa una cuenta de cliente para responder solicitudes');
  }
  const { user, project } = access;
  if (project.id !== projectId) throw new Error('Proyecto inválido');

  const requestId = String(formData.get('requestId') || '');
  if (!requestId) throw new Error('Solicitud requerida');

  const admin = createAdminClient();
  const { data: req } = await admin
    .from('document_requests')
    .select('*')
    .eq('id', requestId)
    .eq('project_id', projectId)
    .eq('visible_to_client', true)
    .maybeSingle();

  if (!req || req.status !== 'open') {
    throw new Error('Esta solicitud no está disponible');
  }

  const notes = String(formData.get('notes') || '').trim();
  const audit = await getRequestAudit();
  let documentId: string | null = null;
  let sha256 = '';
  let path = '';
  let scanStatus = 'n/a';
  let responseText: string | null = null;

  if (req.input_mode === 'file') {
    const resolved = resolveFileOrUrlInput(
      formData.get('file') as File | null,
      String(formData.get('responseText') || '')
    );
    const isSignedNda = req.expected_type === 'nda';
    const organizationId = project.organization_id;

    if (resolved.kind === 'url') {
      responseText = resolved.url;
    } else if (isSignedNda && organizationId) {
      const { doc, sha256: hash, path: storedPath, scan } = await ingestOrgDocument({
        organizationId,
        projectId,
        file: resolved.file,
        type: req.expected_type,
        title: req.title,
        notes,
        signed: true,
        visibleToClient: true,
        source: 'client',
        uploadedBy: user.id,
        folder: 'nda',
        requestId: req.id,
        audit,
      });
      documentId = doc.id;
      sha256 = hash;
      path = storedPath;
      scanStatus = scan.status;
      await markOrganizationMutualNdaSigned({ organizationId, documentId: doc.id });
    } else {
      const { doc, sha256: hash, path: storedPath, scan } = await ingestProjectDocument({
        projectId,
        file: resolved.file,
        type: req.expected_type,
        title: req.title,
        notes,
        signed: isSignedNda,
        visibleToClient: true,
        source: 'client',
        uploadedBy: user.id,
        folder: 'inbound',
        requestId: req.id,
        audit,
        organizationId,
      });
      documentId = doc.id;
      sha256 = hash;
      path = storedPath;
      scanStatus = scan.status;
    }
  } else if (req.input_mode === 'credentials') {
    const payload = {
      provider: String(formData.get('provider') || '').trim(),
      domain: String(formData.get('domain') || '').trim(),
      panelUrl: String(formData.get('panelUrl') || '').trim(),
      username: String(formData.get('username') || '').trim(),
      accessNotes: String(formData.get('accessNotes') || '').trim(),
      notes,
    };
    if (!payload.provider && !payload.domain && !payload.accessNotes) {
      throw new Error('Indica al menos proveedor, dominio o notas de acceso');
    }
    responseText = JSON.stringify(payload, null, 2);
  } else if (req.input_mode === 'url') {
    responseText = normalizeRequestedUrl(String(formData.get('responseText') || ''));
  } else {
    responseText = String(formData.get('responseText') || '').trim();
    if (!responseText) throw new Error('Escribe la información solicitada');
  }

  const { error: updateError } = await admin
    .from('document_requests')
    .update({
      status: 'fulfilled',
      fulfilled_document_id: documentId,
      fulfilled_at: new Date().toISOString(),
      response_text: responseText,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.id)
    .eq('status', 'open');
  if (updateError) throw await throwDb(updateError);

  await logActivity({
    entityType: 'document_request',
    entityId: req.id,
    action: 'fulfilled',
    actorId: user.id,
    metadata: {
      project_id: projectId,
      title: req.title,
      input_mode: req.input_mode,
      document_id: documentId,
      content_sha256: sha256 || undefined,
      file_path: path || undefined,
      scan_status: scanStatus,
      ip: audit.ip,
      user_agent: audit.userAgent,
    },
  });

  await notifyStaff({
    subject: `Respuesta del cliente - ${project.name}`,
    html: templateStaffAlert(
      `Solicitud respondida · ${project.name}`,
      [
        `Solicitud: ${req.title}`,
        `Modo: ${req.input_mode}`,
        sha256
          ? `SHA-256: ${sha256.slice(0, 16)}…`
          : isHttpUrl(responseText)
            ? `URL: ${responseText}`
            : `Respuesta: texto/accesos`,
        `Notas: ${notes || '-'}`,
      ],
      { ctaLabel: 'Ver documentos', ctaHref: opsProjectUrl(slug, '?tab=documentos') }
    ),
  }).catch(() => {});

  revalidatePath(`/p/${slug}/documentos`);
  revalidatePath(`/projects/${projectId}`);
}

/** @deprecated usar clientFulfillDocumentRequest con requestId */
export async function clientUploadDocument(projectId: string, slug: string, formData: FormData) {
  return clientFulfillDocumentRequest(projectId, slug, formData);
}

export async function runDocumentRetentionDisposal() {
  await requireAdminStaff();
  const result = await disposeExpiredDocuments(200);
  await logActivity({
    entityType: 'system',
    entityId: '00000000-0000-4000-8000-000000000001',
    action: 'retention_disposal',
    metadata: { disposed: result.disposed },
  });
  return result;
}

export async function clientAcceptQuote(quoteId: string, slug: string) {
  const access = await requirePortalAccess(slug);
  if (access.isStaffPreview) throw new Error('La vista previa staff no acepta cotizaciones');

  const admin = createAdminClient();
  const { data: quote } = await admin
    .from('quotes')
    .select('id, status, visible_to_client')
    .eq('id', quoteId)
    .eq('project_id', access.project.id)
    .maybeSingle();
  if (!quote || quote.visible_to_client === false || quote.status !== 'sent') {
    throw new Error('Cotización no disponible');
  }

  const { error } = await admin
    .from('quotes')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: access.user.id,
    })
    .eq('id', quoteId)
    .eq('project_id', access.project.id)
    .eq('status', 'sent');
  if (error) throw await throwDb(error);

  await admin.from('projects').update({ status: 'active' }).eq('id', access.project.id);
  revalidatePath(`/p/${slug}`);
}

export async function clientRejectQuote(quoteId: string, slug: string) {
  const access = await requirePortalAccess(slug);
  if (access.isStaffPreview) throw new Error('La vista previa staff no rechaza cotizaciones');

  const admin = createAdminClient();
  const { error } = await admin
    .from('quotes')
    .update({ status: 'rejected' })
    .eq('id', quoteId)
    .eq('project_id', access.project.id)
    .eq('status', 'sent');
  if (error) throw await throwDb(error);
  revalidatePath(`/p/${slug}`);
}

/**
 * Publica (o registra) la versión legal vigente en bitácora y notifica
 * a miembros de proyectos visibles cuya aceptación esté desactualizada.
 */
export async function publishLegalVersionAndNotify(formData: FormData) {
  const { user } = await assertCapabilityWrite('legal_publish');
  const admin = createAdminClient();
  const versionCode = String(formData.get('versionCode') || LEGAL_DOCS_VERSION).trim();
  const changelog = String(formData.get('changelog') || '').trim();
  const sendEmails = formData.get('sendEmails') === 'on';

  const { error: versionError } = await admin.from('legal_document_versions').upsert(
    {
      kind: 'bundle',
      version_code: versionCode,
      changelog: changelog || `Bundle legal ${versionCode}`,
      published_at: new Date().toISOString(),
      published_by: user.id,
    },
    { onConflict: 'kind,version_code' }
  );
  if (versionError) throw await throwDb(versionError);

  if (!sendEmails) {
    revalidatePath('/settings');
    return { notified: 0, versionCode };
  }

  const { data: members } = await admin.from('project_members').select(
    'user_id, project_id, terms_version, privacy_version, nda_version, projects(id, name, slug, client_visible)'
  );

  let notified = 0;
  for (const member of members ?? []) {
    const projectRaw = member.projects as unknown as
      | { id: string; name: string; slug: string; client_visible: boolean }
      | { id: string; name: string; slug: string; client_visible: boolean }[]
      | null;
    const project = Array.isArray(projectRaw) ? projectRaw[0] : projectRaw;
    if (!project?.client_visible) continue;

    const outdated =
      member.terms_version !== versionCode ||
      member.privacy_version !== versionCode ||
      member.nda_version !== versionCode;
    if (!outdated) continue;

    const { data: already } = await admin
      .from('legal_reacceptance_notifications')
      .select('id')
      .eq('project_id', member.project_id)
      .eq('user_id', member.user_id)
      .eq('version_code', versionCode)
      .maybeSingle();
    if (already) continue;

    const { data: authUser } = await admin.auth.admin.getUserById(member.user_id);
    const email = authUser.user?.email;
    if (!email) continue;

    await sendClientEmail({
      to: email,
      subject: `Actualización legal - ${project.name}`,
      html: templateLegalReacceptance(
        project.name,
        projectPortalUrl(project.slug, '/aceptar'),
        versionCode
      ),
    });

    await admin.from('legal_reacceptance_notifications').insert({
      project_id: member.project_id,
      user_id: member.user_id,
      version_code: versionCode,
      channel: 'email',
    });
    notified += 1;
  }

  await logActivity({
    entityType: 'legal',
    entityId: versionCode,
    action: 'reacceptance_notified',
    actorId: user.id,
    metadata: { notified, versionCode },
  });

  revalidatePath('/settings');
  return { notified, versionCode };
}
