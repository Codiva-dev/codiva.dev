'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import HuntReportForm from '@/components/careers/HuntReportForm';
import { readAttemptToken, writeAttemptToken, announceHuntSession } from '@/components/careers/hunt-context';
import type { PublicAssessmentQuestion } from '@/lib/careers/assessments/types';

export { readAttemptToken, writeAttemptToken } from '@/components/careers/hunt-context';

type Session = {
  token: string;
  job_posting_id?: string;
  catalog_key?: string;
  status: string;
  full_name: string;
  email: string;
  remaining_ms: number;
  time_limit_sec: number;
  passed: boolean | null;
  score_pct: number | null;
  title: string;
  questions: PublicAssessmentQuestion[];
  answers: Record<string, string[]>;
  hunt_required?: boolean;
  hunt_ready?: boolean;
  hunt_cover_all?: boolean;
  hunt_matched?: number;
  hunt_needed?: number;
  hunt_crafts?: { craft: string; found: boolean }[];
};

type Props = {
  jobPostingId: string;
  jobSlug: string;
  jobTitle: string;
  applyHref: string;
  listHref: string;
  discipline?: string;
  huntRequired?: boolean;
};

function formatMmSs(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CareerAssessment({
  jobPostingId,
  jobTitle,
  applyHref,
  listHref,
  discipline,
  huntRequired: huntRequiredProp = false,
}: Props) {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [remainingMs, setRemainingMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ passed: boolean; score_pct: number | null } | null>(null);
  const [huntReady, setHuntReady] = useState(true);
  const [huntRequired, setHuntRequired] = useState(false);
  const endsAtRef = useRef<number>(0);
  const submittingRef = useRef(false);

  const question = session?.questions[index];
  const total = session?.questions.length ?? 0;
  const answeredCount = useMemo(
    () => Object.values(answers).filter((v) => v.length > 0).length,
    [answers]
  );

  const persist = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!session?.token) return;
      await fetch('/api/careers/assessments/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.token, ...payload }),
      });
    },
    [session?.token]
  );

  const submit = useCallback(
    async (fromTimer = false) => {
      if (!session?.token || submittingRef.current) return;
      submittingRef.current = true;
      setLoading(true);
      try {
        const res = await fetch('/api/careers/assessments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.token, answers }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'submit_failed');
        setResult({ passed: Boolean(data.passed), score_pct: data.score_pct ?? null });
        setSession((prev) => (prev ? { ...prev, status: 'completed', passed: Boolean(data.passed) } : prev));
        if (data.passed) {
          const required = huntRequiredProp || Boolean(session?.hunt_required);
          setHuntRequired(required);
          setHuntReady(!required);
          announceHuntSession();
        }
        if (fromTimer && !data.passed) setError(t('career.assessment_timed_out'));
      } catch {
        setError(t('career.assessment_error'));
      } finally {
        setLoading(false);
        submittingRef.current = false;
      }
    },
    [answers, huntRequiredProp, session?.hunt_required, session?.token, t]
  );

  useEffect(() => {
    const token = readAttemptToken(jobPostingId, discipline);
    if (!token) return;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/careers/assessments/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (cancelled || !res.ok || !data?.session) return;
      const s = data.session as Session;
      if (s.job_posting_id && s.job_posting_id !== jobPostingId) return;
      setSession(s);
      setAnswers(s.answers || {});
      setFullName(s.full_name);
      setEmail(s.email);
      if (s.status === 'completed') {
        setResult({ passed: Boolean(s.passed), score_pct: s.score_pct });
        setHuntRequired(Boolean(s.hunt_required));
        setHuntReady(s.hunt_required ? Boolean(s.hunt_ready) : true);
        if (s.passed) announceHuntSession();
      } else if (s.status === 'started') {
        endsAtRef.current = Date.now() + (s.remaining_ms || 0);
        setRemainingMs(s.remaining_ms || 0);
        const firstUnanswered = s.questions.findIndex((q) => !s.answers?.[q.id]?.length);
        setIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobPostingId, discipline]);

  useEffect(() => {
    if (!session || session.status !== 'started' || result) return;
    const tick = () => {
      const left = Math.max(0, endsAtRef.current - Date.now());
      setRemainingMs(left);
      if (left <= 0) void submit(true);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [result, session, submit]);

  useEffect(() => {
    if (!session || session.status !== 'started') return;
    const onBlur = () => {
      void persist({ event_type: 'window_blur', question_id: question?.id });
    };
    const onFocus = () => {
      void persist({ event_type: 'window_focus', question_id: question?.id });
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [persist, question?.id, session]);

  useEffect(() => {
    if (!question || question.type !== 'rank') return;
    if ((answers[question.id] ?? []).length) return;
    const keys = question.options.map((o) => o.key);
    setAnswers((prev) => ({ ...prev, [question.id]: keys }));
    void persist({
      event_type: 'answered',
      question_id: question.id,
      answer: keys,
      payload: { type: 'rank', initialized: true },
    });
  }, [answers, persist, question]);

  useEffect(() => {
    if (!question || !session || session.status !== 'started') return;
    void persist({ event_type: 'question_viewed', question_id: question.id });
  }, [persist, question, session]);

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/careers/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_posting_id: jobPostingId,
          discipline: discipline || undefined,
          full_name: fullName.trim(),
          email: email.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === 'retry_cooldown') throw new Error('retry_cooldown');
        if (data?.error === 'max_attempts') throw new Error('max_attempts');
        throw new Error(data?.error || 'start_failed');
      }
      const s = data.session as Session;
      writeAttemptToken(jobPostingId, s.token, discipline);
      if (data.already_passed) {
        setSession(s);
        setResult({ passed: true, score_pct: s.score_pct });
        setHuntRequired(Boolean(s.hunt_required));
        setHuntReady(s.hunt_required ? Boolean(s.hunt_ready) : true);
        announceHuntSession();
        return;
      }
      setSession(s);
      setAnswers(s.answers || {});
      endsAtRef.current = Date.now() + (s.remaining_ms || s.time_limit_sec * 1000);
      setRemainingMs(s.remaining_ms || s.time_limit_sec * 1000);
      setIndex(0);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'retry_cooldown') setError(t('career.assessment_cooldown'));
      else if (code === 'max_attempts') setError(t('career.assessment_max_attempts'));
      else setError(t('career.assessment_error'));
    } finally {
      setLoading(false);
    }
  }

  function setAnswer(questionId: string, next: string[], type: PublicAssessmentQuestion['type']) {
    setAnswers((prev) => ({ ...prev, [questionId]: next }));
    void persist({
      event_type: 'answered',
      question_id: questionId,
      answer: next,
      payload: { type },
    });
  }

  function toggleMulti(questionId: string, key: string) {
    const current = answers[questionId] ?? [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setAnswer(questionId, next, 'multi');
  }

  function moveRank(questionId: string, keys: string[], from: number, to: number) {
    if (to < 0 || to >= keys.length) return;
    const next = [...keys];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    setAnswer(questionId, next, 'rank');
  }

  if (result) {
    const showHunt = result.passed && huntRequired && !huntReady;
    const coverAll = Boolean(session?.hunt_cover_all);
    const craftHintKey = discipline
      ? `career.hunt_craft_hint_${discipline.replaceAll('-', '_')}`
      : coverAll
        ? 'career.hunt_craft_hint_all'
        : 'career.hunt_craft_hint_other';
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-codiva-primary/15 bg-white px-5 py-8 shadow-sm sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-codiva-primary">
            {t('career.assessment_eyebrow')}
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold text-zinc-900">
            {result.passed
              ? showHunt
                ? t('career.assessment_pass_hunt_title')
                : t('career.assessment_pass_title')
              : t('career.assessment_fail_title')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {result.passed
              ? showHunt
                ? t('career.assessment_pass_hunt_body')
                : t('career.assessment_pass_body')
              : t('career.assessment_fail_body')}
          </p>
          {showHunt ? (
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t(craftHintKey)}</p>
          ) : null}
          {result.passed && !showHunt ? (
            <Button as="a" href={applyHref} className="mt-6">
              {t('career.assessment_go_apply')}
            </Button>
          ) : null}
          {!result.passed ? (
            <p className="mt-4 text-xs text-zinc-500">{t('career.assessment_fail_hint')}</p>
          ) : null}
        </div>
        {showHunt && session ? (
          <>
            <p className="text-sm text-zinc-600">
              <Link href={listHref} className="font-medium text-codiva-primary hover:underline">
                {t('career.hunt_browse')}
              </Link>
            </p>
            <HuntReportForm
              defaultUrl={typeof window !== 'undefined' ? window.location.origin : ''}
              defaultName={session.full_name}
              defaultEmail={session.email}
              assessmentToken={session.token}
              discipline={discipline || undefined}
              lockIdentity
              onReported={(ready) => {
                if (ready) setHuntReady(true);
              }}
            />
          </>
        ) : null}
      </div>
    );
  }

  if (!session || session.status !== 'started') {
    return (
      <form
        onSubmit={onStart}
        className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-codiva-primary">
            {t('career.assessment_eyebrow')}
          </p>
          <h2 className="mt-2 font-display text-xl font-bold text-zinc-900">
            {t('career.assessment_start_title')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {t(huntRequiredProp ? 'career.assessment_start_intro_tester' : 'career.assessment_start_intro', {
              role: jobTitle,
            })}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600">
            <li>{t('career.assessment_rule_time')}</li>
            <li>{t('career.assessment_rule_pass')}</li>
            {huntRequiredProp ? <li>{t('career.assessment_rule_hunt')}</li> : null}
            <li>{t('career.assessment_rule_required')}</li>
          </ul>
        </div>
        <div>
          <label htmlFor="assess-name" className="mb-1 block text-sm font-medium text-zinc-800">
            {t('career.field_name')}
          </label>
          <Input
            id="assess-name"
            className=""
            value={fullName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
            required
            maxLength={200}
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="assess-email" className="mb-1 block text-sm font-medium text-zinc-800">
            {t('career.field_email')}
          </label>
          <Input
            id="assess-email"
            className=""
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            maxLength={320}
            autoComplete="email"
          />
        </div>
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={loading || !fullName.trim() || !email.includes('@')} className="w-full">
          {loading ? t('career.assessment_starting') : t('career.assessment_start')}
        </Button>
      </form>
    );
  }

  if (!question) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        {t('career.assessment_error')}
      </div>
    );
  }

  const rankKeys = answers[question.id]?.length
    ? answers[question.id]
    : question.options.map((o) => o.key);
  const optionByKey = new Map(question.options.map((o) => [o.key, o]));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-codiva-primary">
            {question.competency}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {t('career.assessment_progress', { current: index + 1, total })}
          </p>
        </div>
        <p
          className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
            remainingMs < 60_000 ? 'bg-red-50 text-red-700' : 'bg-codiva-primary/10 text-codiva-primary'
          }`}
        >
          {formatMmSs(remainingMs)}
        </p>
      </div>

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-codiva-primary transition-all"
          style={{ width: `${Math.round(((index + 1) / Math.max(total, 1)) * 100)}%` }}
        />
      </div>

      {question.context ? (
        <p className="mb-3 whitespace-pre-wrap rounded-xl bg-codiva-primary/5 px-4 py-3 text-sm leading-relaxed text-zinc-700">
          {question.context}
        </p>
      ) : null}
      <h2 className="font-display text-lg font-semibold text-zinc-900">{question.prompt}</h2>
      {question.type === 'multi' ? (
        <p className="mt-1 text-xs text-zinc-500">{t('career.assessment_multi_hint')}</p>
      ) : null}
      {question.type === 'rank' ? (
        <p className="mt-1 text-xs text-zinc-500">{t('career.assessment_rank_hint')}</p>
      ) : null}

      <div className="mt-4 space-y-2">
        {question.type === 'rank'
          ? rankKeys.map((key, i) => {
              const opt = optionByKey.get(key);
              if (!opt) return null;
              return (
                <div
                  key={key}
                  className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <span className="mt-0.5 w-6 shrink-0 text-sm font-semibold text-codiva-primary">{i + 1}</span>
                  <p className="min-w-0 flex-1 text-sm text-zinc-800">{opt.label}</p>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      className="rounded-md px-2 py-0.5 text-xs text-zinc-600 hover:bg-white"
                      onClick={() => moveRank(question.id, rankKeys, i, i - 1)}
                      aria-label={t('career.assessment_move_up')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded-md px-2 py-0.5 text-xs text-zinc-600 hover:bg-white"
                      onClick={() => moveRank(question.id, rankKeys, i, i + 1)}
                      aria-label={t('career.assessment_move_down')}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })
          : question.options.map((opt) => {
              const selected = (answers[question.id] ?? []).includes(opt.key);
              return (
                <label
                  key={opt.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                    selected
                      ? 'border-codiva-primary bg-codiva-primary/5'
                      : 'border-zinc-200 hover:border-codiva-primary/40'
                  }`}
                >
                  <input
                    type={question.type === 'multi' ? 'checkbox' : 'radio'}
                    className="mt-0.5"
                    name={question.id}
                    checked={selected}
                    onChange={() => {
                      if (question.type === 'multi') toggleMulti(question.id, opt.key);
                      else setAnswer(question.id, [opt.key], 'single');
                    }}
                  />
                  <span className="whitespace-pre-wrap text-zinc-800">{opt.label}</span>
                </label>
              );
            })}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="text-sm font-medium text-zinc-600 hover:text-codiva-primary disabled:opacity-40"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          {t('career.assessment_back')}
        </button>
        <p className="text-xs text-zinc-500">
          {t('career.assessment_answered', { count: answeredCount, total })}
        </p>
        {index < total - 1 ? (
          <Button type="button" size="sm" className="" onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}>
            {t('career.assessment_next')}
          </Button>
        ) : (
          <Button type="button" size="sm" className="" disabled={loading} onClick={() => void submit(false)}>
            {loading ? t('career.assessment_submitting') : t('career.assessment_submit')}
          </Button>
        )}
      </div>
    </div>
  );
}
