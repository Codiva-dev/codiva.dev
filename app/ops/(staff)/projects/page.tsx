import OpsPageHeader from '@/components/ops/OpsPageHeader';
import ToastForm from '@/components/ops/ToastForm';
import Button from '@/components/ui/Button';
import Card, { SectionTitle } from '@/components/ui/Card';
import Input, { Textarea } from '@/components/ui/Input';
import OpsProjectsTable from '@/components/ops/search/OpsProjectsTable';
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

      <OpsProjectsTable
        projects={(projects ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          status: p.status,
          progress_percent: p.progress_percent,
          client_visible: p.client_visible,
          deliveryLabel: formatDate(p.target_delivery_date),
          organizationName: (p.organizations as { name?: string })?.name || '',
          previewHref: staffPortalPreviewPath(p.slug),
        }))}
        emptyLabel={EMPTY_LABEL}
        statusLabels={PROJECT_STATUS_LABELS}
        emptyMessage={can(staff, 'projects_all') ? t('ops.projectsPage.empty') : t('ops.projectsPage.emptyAssigned')}
      />
    </div>
  );
}
