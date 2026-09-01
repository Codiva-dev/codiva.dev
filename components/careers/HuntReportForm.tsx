'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/ui/Button';
import Input, { Textarea } from '@/components/ui/Input';
import HuntCraftTracker, { type HuntCraftPublic } from '@/components/careers/HuntCraftTracker';
import { announceHuntProgress, readHuntContext, type HuntContext } from '@/components/careers/hunt-context';

type Props = {
  defaultUrl?: string;
  defaultName?: string;
  defaultEmail?: string;
  assessmentToken?: string;
  discipline?: string;
  lockIdentity?: boolean;
  onReported?: (huntReady: boolean | null) => void;
};

type Shot = { id: string; file: File; preview: string };

const MAX_SHOTS = 4;

export default function HuntReportForm({
  defaultUrl = '',
  defaultName = '',
  defaultEmail = '',
  assessmentToken,
  discipline,
  lockIdentity = false,
  onReported,
}: Props) {
  const { t } = useTranslation();
  const [ctx, setCtx] = useState<HuntContext | null>(null);
  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [pageUrl, setPageUrl] = useState(defaultUrl);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expected, setExpected] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [keepGoing, setKeepGoing] = useState(false);
  const [keepGoingKind, setKeepGoingKind] = useState<'unmatched' | 'duplicate' | 'remaining'>('remaining');
  const [error, setError] = useState('');
  const [coverAll, setCoverAll] = useState(false);
  const [crafts, setCrafts] = useState<HuntCraftPublic[]>([]);
  const [matched, setMatched] = useState(0);
  const [needed, setNeeded] = useState(0);

  useEffect(() => {
    if (assessmentToken) return;
    setCtx(readHuntContext());
  }, [assessmentToken]);

  useEffect(() => {
    const token = assessmentToken || ctx?.token;
    if (!token || defaultName) return;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/careers/assessments/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (cancelled || !res.ok || !data?.session) return;
      if (data.session.full_name) setFullName(data.session.full_name);
      if (data.session.email) setEmail(data.session.email);
      if (data.session.hunt_cover_all) {
        setCoverAll(true);
        setCrafts(Array.isArray(data.session.hunt_crafts) ? data.session.hunt_crafts : []);
        setMatched(Number(data.session.hunt_matched) || 0);
        setNeeded(Number(data.session.hunt_needed) || 0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assessmentToken, ctx?.token, defaultName]);

  useEffect(() => {
    if (defaultName) setFullName(defaultName);
    if (defaultEmail) setEmail(defaultEmail);
  }, [defaultEmail, defaultName]);

  useEffect(() => {
    return () => {
      shots.forEach((shot) => URL.revokeObjectURL(shot.preview));
    };
  }, [shots]);

  const token = assessmentToken || ctx?.token || '';
  const craft = discipline || ctx?.discipline || '';
  const identityLocked = Boolean(lockIdentity && fullName.trim() && email.includes('@'));

  const canSubmit = useMemo(
    () =>
      fullName.trim() &&
      email.includes('@') &&
      pageUrl.trim() &&
      title.trim().length >= 4 &&
      description.trim().length >= 20,
    [fullName, email, pageUrl, title, description]
  );

  function addImageFiles(files: File[]) {
    setShots((prev) => {
      const next = [...prev];
      for (const file of files) {
        if (next.length >= MAX_SHOTS) break;
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 3 * 1024 * 1024) continue;
        next.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${next.length}`,
          file,
          preview: URL.createObjectURL(file),
        });
      }
      return next;
    });
  }

  function onPaste(e: React.ClipboardEvent) {
    const files = [...e.clipboardData.items]
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (!files.length) return;
    e.preventDefault();
    if (!token) return;
    addImageFiles(files);
  }

  function removeShot(id: string) {
    setShots((prev) => {
      const shot = prev.find((row) => row.id === id);
      if (shot) URL.revokeObjectURL(shot.preview);
      return prev.filter((row) => row.id !== id);
    });
  }

  async function uploadShots(): Promise<string[]> {
    if (!token || !shots.length) return [];
    const paths: string[] = [];
    for (const shot of shots) {
      const body = new FormData();
      body.append('token', token);
      body.append('file', shot.file, shot.file.name || 'paste.png');
      const res = await fetch('/api/careers/hunt-evidence', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.path === 'string') paths.push(data.path);
    }
    return paths;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const evidencePaths = await uploadShots();
      const res = await fetch('/api/careers/hunt-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          page_url: pageUrl.trim(),
          title: title.trim(),
          description: description.trim(),
          expected: expected.trim() || undefined,
          discipline: craft && craft !== 'other' ? craft : undefined,
          assessment_token: token || undefined,
          evidence_paths: evidencePaths,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'report_failed');
      const ready = typeof data.hunt_ready === 'boolean' ? data.hunt_ready : null;
      if (data.hunt_cover_all) {
        setCoverAll(true);
        setCrafts(Array.isArray(data.hunt_crafts) ? data.hunt_crafts : []);
        setMatched(Number(data.hunt_matched) || 0);
        setNeeded(Number(data.hunt_needed) || 0);
      }
      announceHuntProgress();
      onReported?.(ready);
      if (ready === false) {
        setTitle('');
        setDescription('');
        setExpected('');
        setShots((prev) => {
          prev.forEach((shot) => URL.revokeObjectURL(shot.preview));
          return [];
        });
        setError('');
        setKeepGoing(true);
        if (!data.counts_for_craft && !data.matched_craft) setKeepGoingKind('unmatched');
        else if (data.hunt_cover_all && data.matched_craft) setKeepGoingKind('duplicate');
        else setKeepGoingKind('remaining');
        return;
      }
      setDone(true);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'rate_limited' || code === 'rate_limited_email') setError(t('career.hunt_error_rate'));
      else if (code === 'duplicate_report') setError(t('career.hunt_error_duplicate'));
      else if (code === 'assessment_not_passed') setError(t('career.assessment_required_error'));
      else setError(t('career.hunt_error'));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        {coverAll && crafts.length ? (
          <HuntCraftTracker crafts={crafts} matched={matched} needed={needed} />
        ) : null}
        <div className="rounded-2xl border border-codiva-primary/20 bg-codiva-primary/5 px-5 py-6 text-zinc-900 shadow-sm">
          <p className="font-semibold">{t('career.hunt_success')}</p>
          <p className="mt-2 text-sm text-zinc-600">
            {coverAll ? t('career.hunt_success_body_all') : t('career.hunt_success_body')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {coverAll && crafts.length ? (
        <HuntCraftTracker crafts={crafts} matched={matched} needed={needed} />
      ) : null}
    <form
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
      onSubmit={onSubmit}
      onPaste={onPaste}
    >
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{t('career.hunt_form_title')}</h2>
        <p className="mt-1 text-sm text-zinc-500">{t('career.hunt_form_intro')}</p>
        {keepGoing ? (
          <p className="mt-2 text-sm text-codiva-primary">
            {coverAll
              ? keepGoingKind === 'unmatched'
                ? t('career.hunt_keep_going_unmatched')
                : t('career.hunt_keep_going_all', { count: Math.max(0, needed - matched) })
              : t('career.hunt_keep_going')}
          </p>
        ) : null}
      </div>
      {!identityLocked ? (
        <>
          <div>
            <label htmlFor="hunt-name" className="mb-1 block text-sm font-medium text-zinc-800">
              {t('career.field_name')}
            </label>
            <Input
              id="hunt-name"
              value={fullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
              required
              maxLength={200}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="hunt-email" className="mb-1 block text-sm font-medium text-zinc-800">
              {t('career.field_email')}
            </label>
            <Input
              id="hunt-email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              maxLength={320}
              autoComplete="email"
            />
          </div>
        </>
      ) : null}
      <div>
        <label htmlFor="hunt-url" className="mb-1 block text-sm font-medium text-zinc-800">
          {t('career.hunt_field_url')}
        </label>
        <Input
          id="hunt-url"
          value={pageUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPageUrl(e.target.value)}
          required
          maxLength={500}
        />
      </div>
      <div>
        <label htmlFor="hunt-title" className="mb-1 block text-sm font-medium text-zinc-800">
          {t('career.hunt_field_title')}
        </label>
        <Input
          id="hunt-title"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>
      <div>
        <label htmlFor="hunt-desc" className="mb-1 block text-sm font-medium text-zinc-800">
          {t('career.hunt_field_description')}
        </label>
        <Textarea
          id="hunt-desc"
          rows={5}
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          required
          maxLength={8000}
        />
        <p className="mt-1 text-xs text-zinc-500">{t('career.hunt_field_description_hint')}</p>
      </div>
      {shots.length ? (
        <ul className="flex flex-wrap gap-2">
          {shots.map((shot) => (
            <li key={shot.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shot.preview}
                alt=""
                width={80}
                height={80}
                className="h-20 w-20 rounded-lg border border-zinc-200 object-cover"
              />
              <button
                type="button"
                onClick={() => removeShot(shot.id)}
                className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 text-xs text-zinc-600 shadow"
                aria-label={t('career.hunt_shot_remove')}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div>
        <label htmlFor="hunt-expected" className="mb-1 block text-sm font-medium text-zinc-800">
          {t('career.hunt_field_expected')}
        </label>
        <Textarea
          id="hunt-expected"
          rows={3}
          value={expected}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExpected(e.target.value)}
          maxLength={4000}
        />
      </div>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={!canSubmit || submitting} className="w-full">
        {submitting ? t('career.hunt_submitting') : t('career.hunt_submit')}
      </Button>
    </form>
    </div>
  );
}
