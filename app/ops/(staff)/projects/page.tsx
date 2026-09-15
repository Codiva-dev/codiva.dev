import Link from 'next/link';
import OpsPageHeader from '@/components/ops/OpsPageHeader';
import PreviewPopupLink from '@/components/ops/PreviewPopupLink';
import ToastForm from '@/components/ops/ToastForm';
import PortalClientUrl from '@/components/ops/PortalClientUrl';
import StatusBadge, { projectTone } from '@/components/ops/StatusBadge';
import Button from '@/components/ui/Button';
import Card, { SectionTitle } from '@/components/ui/Card';
import { DataTable, EmptyRow, THead, Td, Th, Tr } from '@/components/ui/DataTable';
import Input, { Textarea } from '@/components/ui/Input';
import { listVisibleProjectIds, requireStaff } from '@/lib/ops/auth';
import { createProject } from '@/lib/ops/actions';
import { can } from '@/lib/ops/permissions';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { staffPortalPreviewPath } from '@/lib/ops/host';
import { opsProjectPath } from '@/lib/ops/project-path';

export default async function ProjectsPage() {
  const access = await requireStaff();
  const { supabase, user, staff } = access;
  const canCreate = can(staff, 'projects_create');
  const visibleIds = await listVisibleProjectIds(supabase, user.id, staff);
  const t = await getT();
  const { PROJECT_STATUS_LABELS, formatDate, EMPTY_LABEL } = labelsFor(t.locale);

  let projectsQuery = supabase
    .from('projects')
    .select('id, name, slug, status, progress_percent, client_visible, target_delivery_date, organizations(name)')
    .order('updated_at', { ascending: false });

  if (visibleIds) {
    if (visibleIds.length === 0) {
      projectsQuery = projectsQuery.in('id', ['00000000-0000-0000-0000-000000000000']);
    } else {
      projectsQuery = projectsQuery.in('id', visibleIds);
    }
  }

  const { data: projects } = await projectsQuery;

  const createdMsg = t('ops.projectsPage.created');

  async function onCreate(formData: FormData) {
    'use server';
    const project = await createProject(formData);
    const { redirectWithToast } = await import('@/lib/ops/toast');
    redirectWithToast(opsProjectPath(project.slug), createdMsg);
  }

  return (
    <div>
      <OpsPageHeader
        title={t('ops.pages.projects')}
        description={
          can(staff, 'projects_all') ? t('ops.pages.projectsAll') : t('ops.pages.projectsAssigned')
        }
      />

      {canCreate && (
        <Card as="section" className="mb-8">
          <SectionTitle className="mb-4">{t('ops.projectsPage.newTitle')}</SectionTitle>
          <ToastForm success={t('ops.projectsPage.createdToast')} action={onCreate} className="grid gap-3 md:grid-cols-2">
            <Input name="name" required placeholder={t('ops.projectsPage.name')} size="sm" />
            <Input name="organizationName" placeholder={t('ops.projectsPage.clientCompany')} size="sm" />
            <Input name="contactEmail" type="email" placeholder={t('ops.projectsPage.contactEmail')} size="sm" />
            <Input name="targetDeliveryDate" type="date" size="sm" />
            <Textarea
              name="description"
              placeholder={t('ops.projectsPage.description')}
              rows={2}
              size="sm"
              className="md:col-span-2"
            />
            <Button type="submit" size="sm" className="w-fit">
              {t('ops.projectsPage.create')}
            </Button>
          </ToastForm>
        </Card>
      )}

      <DataTable>
        <THead>
          <tr>
            <Th>{t('ops.projectsPage.colProject')}</Th>
            <Th>{t('ops.projectsPage.colClient')}</Th>
            <Th>{t('ops.projectsPage.colStatus')}</Th>
            <Th>{t('ops.projectsPage.colPortal')}</Th>
            <Th>{t('ops.projectsPage.colDelivery')}</Th>
          </tr>
        </THead>
        <tbody>
          {(projects ?? []).map((p) => (
            <Tr key={p.id}>
              <Td>
                <Link href={opsProjectPath(p.slug)} className="font-medium hover:text-codiva-primary">
                  {p.name}
                </Link>
                <div className="text-xs text-zinc-500">
                  {t('ops.projectsPage.progressPct', { pct: p.progress_percent })}
                </div>
              </Td>
              <Td>{(p.organizations as { name?: string })?.name || EMPTY_LABEL}</Td>
              <Td>
                <StatusBadge label={PROJECT_STATUS_LABELS[p.status]} tone={projectTone(p.status)} />
              </Td>
              <Td>
                <div className="flex flex-col items-start gap-1.5">
                  <PreviewPopupLink href={staffPortalPreviewPath(p.slug)} className="text-codiva-primary hover:underline">
                    {t('ops.projectsPage.preview')}
                  </PreviewPopupLink>
                  <PortalClientUrl slug={p.slug} />
                  {!p.client_visible && (
                    <span className="text-[11px] text-amber-700">{t('ops.projectsPage.hidden')}</span>
                  )}
                </div>
              </Td>
              <Td className="text-zinc-500">{formatDate(p.target_delivery_date)}</Td>
            </Tr>
          ))}
          {!(projects ?? []).length && (
            <EmptyRow colSpan={5}>
              {can(staff, 'projects_all') ? t('ops.projectsPage.empty') : t('ops.projectsPage.emptyAssigned')}
            </EmptyRow>
          )}
        </tbody>
      </DataTable>
    </div>
  );
}
