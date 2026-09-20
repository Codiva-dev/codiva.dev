import { notifyStaffSafe } from '@/lib/ops/email';
import { templateStaffAlert } from '@/lib/ops/email-templates';
import { opsBaseUrl } from '@/lib/ops/host';
import { OPS_HOME_PATH } from '@/lib/ops/home';
import { opsProjectUrl } from '@/lib/ops/project-path';
import type { LicenseStatus } from '@/lib/ops/saas-license';

export function saasLicenseAlert(input: {
  status: Extract<LicenseStatus, 'grace' | 'locked'>;
  instanceKey: string;
  reason: string;
  projectName?: string | null;
  projectSlug?: string | null;
}): { subject: string; html: string } {
  const locked = input.status === 'locked';
  const subject = locked ? 'Licencia NIRC bloqueada' : 'Licencia NIRC en periodo de gracia';
  const lines = [
    `Instancia: ${input.instanceKey}`,
    input.projectName ? `Proyecto: ${input.projectName}` : '',
    input.reason,
    'Queda como pendiente en el panel de Ops hasta que la licencia vuelva a activa.',
  ].filter(Boolean);
  return {
    subject,
    html: templateStaffAlert(subject, lines, {
      ctaLabel: input.projectSlug ? 'Abrir licencia' : 'Abrir pendientes',
      ctaHref: input.projectSlug
        ? opsProjectUrl(input.projectSlug, '?tab=licencia')
        : `${opsBaseUrl()}${OPS_HOME_PATH}`,
    }),
  };
}

export function saasVendorAlert(input: {
  instanceKey: string;
  slot: string;
  expiresAt: string | null;
  projectName?: string | null;
  projectSlug?: string | null;
}): { subject: string; html: string } {
  const subject = `Vendor NIRC por vencer · ${input.slot}`;
  const lines = [
    `Instancia: ${input.instanceKey}`,
    input.projectName ? `Proyecto: ${input.projectName}` : '',
    `Slot: ${input.slot}`,
    `Vence: ${input.expiresAt || 'sin fecha'}`,
    'Renueva el JWT/PAT en Ops → proyecto → Licencia.',
  ].filter(Boolean);
  return {
    subject,
    html: templateStaffAlert(subject, lines, {
      ctaLabel: input.projectSlug ? 'Abrir licencia' : 'Abrir pendientes',
      ctaHref: input.projectSlug
        ? opsProjectUrl(input.projectSlug, '?tab=licencia')
        : `${opsBaseUrl()}${OPS_HOME_PATH}`,
    }),
  };
}

export async function notifySaasLicenseStatus(input: Parameters<typeof saasLicenseAlert>[0]) {
  const alert = saasLicenseAlert(input);
  await notifyStaffSafe({ subject: alert.subject, html: alert.html });
}

export async function notifySaasVendorDue(input: Parameters<typeof saasVendorAlert>[0]) {
  const alert = saasVendorAlert(input);
  await notifyStaffSafe({ subject: alert.subject, html: alert.html });
}

export async function loadProjectMailContext(
  supabase: { from: (table: string) => unknown },
  projectId: string
): Promise<{ projectName: string | null; projectSlug: string | null }> {
  const client = supabase as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: { name?: unknown; slug?: unknown } | null }>;
        };
      };
    };
  };
  const { data } = await client.from('projects').select('name, slug').eq('id', projectId).maybeSingle();
  return {
    projectName: typeof data?.name === 'string' ? data.name : null,
    projectSlug: typeof data?.slug === 'string' ? data.slug : null,
  };
}
