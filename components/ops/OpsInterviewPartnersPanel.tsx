import ToastForm from '@/components/ops/ToastForm';
import {
  assignInterviewScope,
  deleteInterviewPartnerMember,
  inviteInterviewPartner,
  removeInterviewAssignment,
  setInterviewPartnerMemberActive,
  startInterviewPartnerViewAs,
} from '@/lib/ops/interview-actions';
import type { Translator } from '@/i18n/locale';

export type InterviewPartnerOrgRow = { id: string; name: string; active: boolean };
export type InterviewPartnerMemberRow = {
  id: string;
  partner_id: string;
  user_id: string;
  full_name: string;
  role: string;
  active: boolean;
  email?: string;
};
export type InterviewAssignmentRow = {
  id: string;
  member_id: string;
  round_id: string | null;
  application_id: string | null;
  job_posting_id: string | null;
};
export type InterviewJobOption = { id: string; title: string };
export type InterviewApplicationOption = { id: string; full_name: string };

export default function OpsInterviewPartnersPanel({
  partners,
  members,
  assignments,
  jobs,
  applications,
  t,
}: {
  partners: InterviewPartnerOrgRow[];
  members: InterviewPartnerMemberRow[];
  assignments: InterviewAssignmentRow[];
  jobs: InterviewJobOption[];
  applications: InterviewApplicationOption[];
  t: Translator;
}) {
  const membersByPartner = new Map<string, InterviewPartnerMemberRow[]>();
  for (const member of members) {
    const list = membersByPartner.get(member.partner_id) ?? [];
    list.push(member);
    membersByPartner.set(member.partner_id, list);
  }
  const assignmentsByMember = new Map<string, InterviewAssignmentRow[]>();
  for (const row of assignments) {
    const list = assignmentsByMember.get(row.member_id) ?? [];
    list.push(row);
    assignmentsByMember.set(row.member_id, list);
  }
  const jobLabel = new Map(jobs.map((row) => [row.id, row.title]));
  const appLabel = new Map(applications.map((row) => [row.id, row.full_name]));

  return (
    <div className="max-w-3xl space-y-8">
      <ToastForm
        success={t('ops.team.inviteInterviewerSent')}
        action={inviteInterviewPartner}
        className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <h2 className="font-semibold">{t('ops.team.interviewersTitle')}</h2>
        <p className="text-sm text-zinc-500">{t('ops.team.interviewersHint')}</p>
        <label className="block text-sm font-medium">
          {t('ops.team.inviteEmail')}
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="block text-sm font-medium">
          {t('ops.team.fullName')}
          <input
            name="fullName"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="block text-sm font-medium">
          {t('ops.team.partnerOrgExisting')}
          <select name="partnerId" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="">{t('ops.team.partnerOrgNew')}</option>
            {partners.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          {t('ops.team.partnerOrg')}
          <input
            name="partnerName"
            placeholder={t('ops.team.partnerOrgNew')}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="block text-sm font-medium">
          {t('ops.team.permissionsTitle')}
          <select name="role" defaultValue="interviewer" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="interviewer">{t('ops.team.roleInterviewer')}</option>
            <option value="coordinator">{t('ops.team.roleCoordinator')}</option>
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-codiva-primary px-3 py-2 text-sm text-white">
          {t('ops.team.inviteInterviewer')}
        </button>
      </ToastForm>

      {partners.length === 0 ? (
        <p className="text-sm text-zinc-500">{t('ops.team.interviewersEmpty')}</p>
      ) : (
        partners.map((partner) => (
          <section key={partner.id} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="font-semibold">{partner.name}</h3>
            <ul className="space-y-4">
              {(membersByPartner.get(partner.id) ?? []).map((member) => (
                <li key={member.id} className="rounded-lg border border-zinc-100 p-3">
                  <p className="text-sm font-medium">
                    {member.full_name}
                    {member.email ? ` · ${member.email}` : ''}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {member.role === 'coordinator'
                      ? t('ops.team.roleCoordinator')
                      : t('ops.team.roleInterviewer')}
                    {' · '}
                    {member.active ? t('ops.team.active') : t('ops.team.inactive')}
                  </p>
                  {member.active ? (
                    <ToastForm action={startInterviewPartnerViewAs} className="mt-2">
                      <input type="hidden" name="member_id" value={member.id} />
                      <button type="submit" className="text-sm font-medium text-codiva-primary hover:underline">
                        {t('ops.team.viewAsInterviewer')}
                      </button>
                    </ToastForm>
                  ) : null}
                  <ToastForm
                    success={member.active ? t('ops.team.memberRevoked') : t('ops.team.memberActivated')}
                    action={async (fd) => {
                      'use server';
                      await setInterviewPartnerMemberActive(member.id, fd);
                    }}
                    className="mt-2"
                  >
                    <input type="hidden" name="active" value={member.active ? '0' : '1'} />
                    <button type="submit" className="text-sm text-codiva-primary hover:underline">
                      {member.active ? t('ops.team.revoke') : t('ops.team.activate')}
                    </button>
                  </ToastForm>
                  <ToastForm
                    success={t('ops.team.interviewerDeleted')}
                    confirmMessage={t('ops.team.deleteInterviewerConfirm')}
                    confirmLabel={t('ops.team.deleteInterviewer')}
                    action={async () => {
                      'use server';
                      await deleteInterviewPartnerMember(member.id);
                    }}
                    className="mt-2"
                  >
                    <button type="submit" className="text-sm text-red-700 hover:underline">
                      {t('ops.team.deleteInterviewer')}
                    </button>
                  </ToastForm>
                  {member.active ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-amber-800">{t('ops.team.assignJobWarning')}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                      <ToastForm
                        success={t('ops.team.assignmentSaved')}
                        action={assignInterviewScope}
                        className="space-y-2"
                      >
                        <input type="hidden" name="member_id" value={member.id} />
                        <select name="job_posting_id" className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
                          <option value="">{t('ops.team.assignJob')}</option>
                          {jobs.map((job) => (
                            <option key={job.id} value={job.id}>
                              {job.title}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="text-sm text-codiva-primary hover:underline">
                          {t('ops.team.assignJob')}
                        </button>
                      </ToastForm>
                      <ToastForm
                        success={t('ops.team.assignmentSaved')}
                        action={assignInterviewScope}
                        className="space-y-2"
                      >
                        <input type="hidden" name="member_id" value={member.id} />
                        <select name="application_id" className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
                          <option value="">{t('ops.team.assignCandidate')}</option>
                          {applications.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.full_name}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="text-sm text-codiva-primary hover:underline">
                          {t('ops.team.assignCandidate')}
                        </button>
                      </ToastForm>
                      </div>
                    </div>
                  ) : null}
                  {(assignmentsByMember.get(member.id) ?? []).length ? (
                    <ul className="mt-3 space-y-1 text-xs text-zinc-600">
                      {(assignmentsByMember.get(member.id) ?? []).map((row) => (
                        <li key={row.id} className="flex items-center justify-between gap-2">
                          <span>
                            {row.job_posting_id
                              ? t('ops.team.assignJobScope', {
                                  job: jobLabel.get(row.job_posting_id) || row.job_posting_id,
                                })
                              : row.application_id
                                ? t('ops.team.assignCandidateScope', {
                                    name: appLabel.get(row.application_id) || row.application_id,
                                  })
                                : t('ops.careers.interviewsTitle')}
                          </span>
                          <ToastForm
                            success={t('ops.team.assignmentRemoved')}
                            action={async () => {
                              'use server';
                              await removeInterviewAssignment(row.id);
                            }}
                          >
                            <button type="submit" className="text-zinc-400 hover:text-zinc-700">
                              {t('ops.team.projectsRemove')}
                            </button>
                          </ToastForm>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
