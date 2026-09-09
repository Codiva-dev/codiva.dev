import type { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { visibleApplicationIds } from '@/lib/ops/interview-partner';

export async function getActiveStaffForApi(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, full_name, role, capabilities')
    .eq('id', userId)
    .eq('active', true)
    .maybeSingle();
  return staff;
}

export async function partnerCanReadApplication(opts: {
  memberId: string;
  application: { id: string; job_posting_id: string };
}): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: assignments }, { data: rounds }] = await Promise.all([
    admin
      .from('ops_interview_assignments')
      .select('round_id, application_id, job_posting_id')
      .eq('member_id', opts.memberId),
    admin.from('ops_job_interview_rounds').select('id, application_id').eq('application_id', opts.application.id),
  ]);
  const allowed = visibleApplicationIds(assignments ?? [], [opts.application], rounds ?? []);
  return allowed.includes(opts.application.id);
}

export async function partnerCanReadJobPosting(opts: {
  memberId: string;
  jobPostingId: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { data: assignments } = await admin
    .from('ops_interview_assignments')
    .select('job_posting_id')
    .eq('member_id', opts.memberId)
    .eq('job_posting_id', opts.jobPostingId)
    .limit(1);
  return Boolean(assignments?.length);
}
