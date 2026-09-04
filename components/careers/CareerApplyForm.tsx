'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input, { Select, Textarea } from '@/components/ui/Input';
import { marketingBaseUrl } from '@/lib/ops/host';
import { readAttemptToken } from '@/components/careers/hunt-context';
import HuntReportForm from '@/components/careers/HuntReportForm';
import {
  CAREER_DISCIPLINES,
  CAREER_DISCIPLINE_CATALOG,
  CAREER_DISCIPLINE_LABELS,
  huntFindingHintKey,
  type CareerDiscipline,
} from '@/lib/ops/career-disciplines';

const MAX_CV_BYTES = 10 * 1024 * 1024;

const DISCIPLINE_I18N: Record<CareerDiscipline, string> = {
  frontend: 'career.discipline_frontend',
  backend: 'career.discipline_backend',
  fullstack: 'career.discipline_fullstack',
  'ux-ui': 'career.discipline_ux_ui',
  qa: 'career.discipline_qa',
  security: 'career.discipline_security',
  other: 'career.discipline_other',
};

type Props = {
  jobPostingId: string;
  asksDiscipline?: boolean;
  assessmentRequired?: boolean;
  assessmentHref?: string;
  initialDiscipline?: CareerDiscipline;
};

export default function CareerApplyForm({
  jobPostingId,
  asksDiscipline = false,
  assessmentRequired = false,
  assessmentHref,
  initialDiscipline,
}: Props) {
  const { t } = useTranslation();
  const legalBase = marketingBaseUrl();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [discipline, setDiscipline] = useState<CareerDiscipline | ''>(initialDiscipline || '');
  const [coverLetter, setCoverLetter] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [consentData, setConsentData] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [assessmentToken, setAssessmentToken] = useState('');
  const [assessmentReady, setAssessmentReady] = useState(!assessmentRequired);
  const [checkingAssessment, setCheckingAssessment] = useState(assessmentRequired);
  const [huntPending, setHuntPending] = useState(false);

  const needsAssessment = assessmentRequired || (asksDiscipline && Boolean(discipline));
  const pruebaHref =
    assessmentHref && discipline
      ? `${assessmentHref.split('?')[0]}?discipline=${encodeURIComponent(discipline)}`
      : assessmentHref;

  useEffect(() => {
    if (!needsAssessment) {
      setCheckingAssessment(false);
      return;
    }
    const token = readAttemptToken(jobPostingId, discipline || undefined);
    if (!token) {
      setCheckingAssessment(false);
      setAssessmentReady(false);
      setAssessmentToken('');
      setHuntPending(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/careers/assessments/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;
        const passed = Boolean(data?.session?.passed && data.session.status === 'completed');
        const catalogOk =
          !asksDiscipline ||
          !discipline ||
          data?.session?.catalog_key === CAREER_DISCIPLINE_CATALOG[discipline];
        if (passed && catalogOk) {
          setAssessmentToken(token);
          if (data.session.hunt_required && !data.session.hunt_ready) {
            setHuntPending(true);
            setAssessmentReady(false);
            if (data.session.full_name) setFullName(data.session.full_name);
            if (data.session.email) setEmail(data.session.email);
          } else {
            setHuntPending(false);
            setAssessmentReady(true);
            if (data.session.full_name) setFullName(data.session.full_name);
            if (data.session.email) setEmail(data.session.email);
          }
        } else {
          setHuntPending(false);
          setAssessmentReady(false);
        }
      } catch {
        if (!cancelled) setAssessmentReady(false);
      } finally {
        if (!cancelled) setCheckingAssessment(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asksDiscipline, discipline, jobPostingId, needsAssessment]);

  const canSubmit = useMemo(() => {
    return (
      (!needsAssessment || assessmentReady) &&
      fullName.trim() &&
      email.includes('@') &&
      (!asksDiscipline || Boolean(discipline)) &&
      file &&
      file.type === 'application/pdf' &&
      file.size > 0 &&
      file.size <= MAX_CV_BYTES &&
      consentData &&
      consentTerms
    );
  }, [
    needsAssessment,
    assessmentReady,
    asksDiscipline,
    discipline,
    fullName,
    email,
    file,
    consentData,
    consentTerms,
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !file) return;
    setSubmitting(true);
    setError('');
    try {
      const signRes = await fetch('/api/careers/sign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_posting_id: jobPostingId,
          mime_type: 'application/pdf',
          byte_size: file.size,
          original_filename: file.name,
        }),
      });
      const sign = await signRes.json();
      if (!signRes.ok || !sign?.signed_upload_url || !sign?.path) {
        throw new Error(sign?.error || 'sign_failed');
      }

      const put = await fetch(sign.signed_upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf' },
      });
      if (!put.ok) throw new Error('upload_failed');

      const applyRes = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_posting_id: jobPostingId,
          cv_storage_path: sign.path,
          original_filename: file.name,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          discipline: asksDiscipline ? discipline || undefined : undefined,
          cover_letter: coverLetter.trim() || undefined,
          consent_data: true,
          consent_terms: true,
          assessment_token: assessmentToken || undefined,
        }),
      });
      const apply = await applyRes.json();
      if (!applyRes.ok) throw new Error(apply?.error || 'apply_failed');
      setDone(true);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'duplicate_application') setError(t('career.error_duplicate'));
      else if (code === 'rate_limited' || code === 'rate_limited_email') setError(t('career.error_rate'));
      else if (code === 'assessment_required' || code === 'assessment_not_passed') {
        setError(t('career.assessment_required_error'));
        setAssessmentReady(false);
      } else if (code === 'hunt_required') {
        setError(t('career.hunt_required_error'));
        setHuntPending(true);
        setAssessmentReady(false);
      } else setError(t('career.apply_error'));
    } finally {
      setSubmitting(false);
    }
  }

  function DisciplineField() {
    if (!asksDiscipline) return null;
    return (
      <div>
        <label htmlFor="career-discipline" className="mb-1 block text-sm font-medium text-zinc-800">
          {t('career.field_discipline')}
        </label>
        <Select
          id="career-discipline"
          className=""
          required
          value={discipline}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setDiscipline(e.target.value as CareerDiscipline | '')
          }
        >
          <option value="">{t('career.discipline_placeholder')}</option>
          {CAREER_DISCIPLINES.map((key) => (
            <option key={key} value={key}>
              {t(DISCIPLINE_I18N[key], { defaultValue: CAREER_DISCIPLINE_LABELS[key] })}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-codiva-primary/20 bg-codiva-primary/5 px-5 py-6 text-zinc-900 shadow-sm">
        <p className="font-semibold">{t('career.apply_success')}</p>
      </div>
    );
  }

  if (asksDiscipline && !discipline) {
    return (
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t('career.apply_title')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t('career.discipline_gate')}</p>
        </div>
        <DisciplineField />
      </div>
    );
  }

  if (needsAssessment && huntPending && !assessmentReady) {
    const coverAllHunt = !asksDiscipline;
    const craftHintKey = huntFindingHintKey(discipline, coverAllHunt);
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-zinc-900">{t('career.apply_title')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {coverAllHunt ? t('career.hunt_gate_all') : t('career.hunt_gate')}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">{t(craftHintKey)}</p>
          <DisciplineField />
        </div>
        <HuntReportForm
          defaultName={fullName}
          defaultEmail={email}
          assessmentToken={assessmentToken}
          discipline={asksDiscipline ? discipline || undefined : undefined}
          lockIdentity={Boolean(fullName && email)}
          onReported={(ready) => {
            if (ready) {
              setHuntPending(false);
              setAssessmentReady(true);
            }
          }}
        />
      </div>
    );
  }

  if (needsAssessment && (checkingAssessment || !assessmentReady)) {
    return (
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{t('career.apply_title')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {checkingAssessment ? t('career.assessment_checking') : t('career.assessment_gate')}
          </p>
        </div>
        <DisciplineField />
        {!checkingAssessment && pruebaHref ? (
          <Button as="a" href={pruebaHref} className="w-full">
            {t('career.assessment_start_cta')}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
      onSubmit={onSubmit}
    >
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t('career.apply_title')}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t('career.apply_intro')}</p>
      </div>

      <DisciplineField />

      <div>
        <label htmlFor="career-name" className="mb-1 block text-sm font-medium text-zinc-800">
          {t('career.field_name')}
        </label>
        <Input
          id="career-name"
          className=""
          value={fullName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
          required
          maxLength={200}
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="career-email" className="mb-1 block text-sm font-medium text-zinc-800">
          {t('career.field_email')}
        </label>
        <Input
          id="career-email"
          className=""
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          required
          maxLength={320}
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="career-phone" className="mb-1 block text-sm font-medium text-zinc-800">
          {t('career.field_phone')}
        </label>
        <Input
          id="career-phone"
          className=""
          value={phone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          maxLength={40}
          autoComplete="tel"
        />
      </div>

      <div>
        <label htmlFor="career-letter" className="mb-1 block text-sm font-medium text-zinc-800">
          {t('career.field_letter')}
        </label>
        <Textarea
          id="career-letter"
          className=""
          rows={4}
          value={coverLetter}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCoverLetter(e.target.value)}
          maxLength={8000}
        />
      </div>

      <div>
        <label htmlFor="career-cv" className="mb-1 block text-sm font-medium text-zinc-800">
          {t('career.field_cv')}
        </label>
        <input
          id="career-cv"
          type="file"
          accept="application/pdf,.pdf"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full min-w-0 max-w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-codiva-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-codiva-primary-dark"
        />
        <p className="mt-1 text-xs text-zinc-500">{t('career.cv_hint')}</p>
      </div>

      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={consentData}
          onChange={(e) => setConsentData(e.target.checked)}
          required
        />
        <span>{t('career.consent_data')}</span>
      </label>

      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={consentTerms}
          onChange={(e) => setConsentTerms(e.target.checked)}
          required
        />
        <span>
          {t('career.consent_terms_prefix')}{' '}
          <a href={`${legalBase}/legal/terminos`} className="font-medium text-codiva-primary hover:underline">
            {t('footer.terms')}
          </a>{' '}
          {t('career.consent_terms_and')}{' '}
          <a href={`${legalBase}/legal/aviso-privacidad`} className="font-medium text-codiva-primary hover:underline">
            {t('footer.privacy')}
          </a>
          .
        </span>
      </label>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={!canSubmit || submitting} className="w-full">
        {submitting ? t('career.submitting') : t('career.submit')}
      </Button>
    </form>
  );
}
