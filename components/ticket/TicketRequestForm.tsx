'use client';

import { useId, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCircle2, MailCheck, MessageSquare, Paperclip, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Heading from '@/components/Heading';
import Input, { Textarea } from '@/components/ui/Input';
import { TICKET_MAX_BYTES, TICKET_MAX_FILES } from '@/lib/ops/ticket-constants';
import { formatBytes } from '@/lib/format-bytes';

type TicketFormValues = {
  name: string;
  email: string;
  company: string;
  issueTitle: string;
  issueDescription: string;
  priority: 'Alta' | 'Media' | 'Baja';
  incidentTime: string;
};

type FieldErrors = Partial<Record<keyof TicketFormValues, string>>;

type Props = {
  variant?: 'public' | 'portal';
  projectId?: string;
  projectName?: string;
  defaultName?: string;
  defaultEmail?: string;
  lockedIdentity?: boolean;
};

const PRIORITY_TONE: Record<
  TicketFormValues['priority'],
  { idle: string; active: string }
> = {
  Alta: {
    idle: 'border-zinc-200 bg-white text-zinc-700 hover:border-red-200 hover:bg-red-50/40',
    active: 'border-red-300 bg-red-50 text-red-800 ring-1 ring-red-200',
  },
  Media: {
    idle: 'border-zinc-200 bg-white text-zinc-700 hover:border-amber-200 hover:bg-amber-50/50',
    active: 'border-amber-300 bg-amber-50 text-amber-900 ring-1 ring-amber-200',
  },
  Baja: {
    idle: 'border-zinc-200 bg-white text-zinc-700 hover:border-codiva-primary/30 hover:bg-codiva-primary/5',
    active: 'border-codiva-primary/40 bg-codiva-primary/5 text-codiva-primary ring-1 ring-codiva-primary/20',
  },
};

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export default function TicketRequestForm({
  variant = 'public',
  projectId,
  projectName,
  defaultName = '',
  defaultEmail = '',
  lockedIdentity = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const fileInputId = useId();
  const isPortal = variant === 'portal';

  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [fileError, setFileError] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof TicketFormValues, boolean>>>({});
  const [values, setValues] = useState<TicketFormValues>({
    name: defaultName,
    email: defaultEmail,
    company: '',
    issueTitle: '',
    issueDescription: '',
    priority: 'Media',
    incidentTime: '',
  });

  const errors = useMemo(() => {
    const next: FieldErrors = {};
    const required = t('common.validation.required');
    if (!values.name.trim()) next.name = required;
    if (!values.email.trim()) next.email = required;
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = t('common.validation.invalidEmail');
    if (!isPortal && !values.company.trim()) next.company = required;
    if (!values.issueTitle.trim()) next.issueTitle = required;
    if (!values.issueDescription.trim()) next.issueDescription = required;
    else if (values.issueDescription.trim().length < 10) next.issueDescription = t('common.validation.tooShort');
    return next;
  }, [values, isPortal, t]);

  function setField<K extends keyof TicketFormValues>(name: K, value: TicketFormValues[K]) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function addFiles(picked: File[]) {
    setFileError('');
    const merged = [...files];
    const seen = new Set(merged.map(fileKey));
    for (const f of picked) {
      if (f.size > TICKET_MAX_BYTES) {
        setFileError(t('ticket.hints.fileTooLarge', { name: f.name }));
        continue;
      }
      const key = fileKey(f);
      if (seen.has(key)) continue;
      if (merged.length >= TICKET_MAX_FILES) {
        setFileError(t('ticket.hints.maxFiles', { count: TICKET_MAX_FILES }));
        break;
      }
      seen.add(key);
      merged.push(f);
    }
    setFiles(merged);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      company: true,
      issueTitle: true,
      issueDescription: true,
      priority: true,
    });
    if (Object.keys(errors).length) return;

    setServerError('');
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(values).forEach(([k, v]) => fd.append(k, v));
      fd.append('locale', i18n.language?.startsWith('en') ? 'en' : 'es');
      if (projectId) fd.append('projectId', projectId);
      files.forEach((f) => fd.append('attachments', f));

      const res = await fetch('/api/ticket', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setSubmitted(true);
        setFiles([]);
        setFileError('');
        setValues((prev) => ({
          ...prev,
          company: isPortal ? prev.company : '',
          issueTitle: '',
          issueDescription: '',
          priority: 'Media',
          incidentTime: '',
          name: lockedIdentity ? prev.name : '',
          email: lockedIdentity ? prev.email : '',
        }));
        if (isPortal) router.refresh();
      } else if (res.status === 429) {
        setServerError(t('ticket.status.rateLimited'));
      } else {
        setServerError(data?.error || t('status.error'));
      }
    } catch {
      setServerError(t('status.error'));
    } finally {
      setSubmitting(false);
    }
  }

  const nextSteps = [
    { icon: MailCheck, text: t('ticket.next.ack') },
    { icon: Bell, text: t('ticket.next.queue') },
    { icon: MessageSquare, text: t('ticket.next.follow') },
  ];

  const formBody = (
    <form onSubmit={onSubmit} className="space-y-7" noValidate>
      {isPortal && projectName && (
        <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          {t('portal.ticketsPage.linkedProject', { name: projectName })}
        </p>
      )}

      {submitted && isPortal && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t('ticket.status.submittedMsg')}
        </p>
      )}

      <fieldset disabled={submitting} className="space-y-7">
        <section className="space-y-4">
          <SectionLabel>{t('ticket.sections.contact')}</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TicketField
              label={t('common.fields.name')}
              name="name"
              autoComplete="name"
              value={values.name}
              error={touched.name ? errors.name : undefined}
              readOnly={lockedIdentity}
              onBlur={() => setTouched((p) => ({ ...p, name: true }))}
              onChange={(v) => setField('name', v)}
            />
            <TicketField
              label={t('common.fields.email')}
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              error={touched.email ? errors.email : undefined}
              readOnly={lockedIdentity}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              onChange={(v) => setField('email', v)}
            />
            {!isPortal && (
              <TicketField
                label={t('fields.company')}
                name="company"
                autoComplete="organization"
                value={values.company}
                error={touched.company ? errors.company : undefined}
                className="sm:col-span-2"
                onBlur={() => setTouched((p) => ({ ...p, company: true }))}
                onChange={(v) => setField('company', v)}
              />
            )}
          </div>
        </section>

        <section className="space-y-4">
          <SectionLabel>{t('ticket.sections.incident')}</SectionLabel>
          <TicketField
            label={t('ticket.fields.issueTitle')}
            name="issueTitle"
            value={values.issueTitle}
            error={touched.issueTitle ? errors.issueTitle : undefined}
            onBlur={() => setTouched((p) => ({ ...p, issueTitle: true }))}
            onChange={(v) => setField('issueTitle', v)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p id="priority-label" className="mb-1.5 block text-sm font-medium text-zinc-800">
                {t('ticket.fields.priority')}
              </p>
              <div
                role="radiogroup"
                aria-labelledby="priority-label"
                className="grid grid-cols-3 gap-2"
              >
                {(['Alta', 'Media', 'Baja'] as const).map((level) => {
                  const selected = values.priority === level;
                  const label =
                    level === 'Alta'
                      ? t('ticket.priority.high')
                      : level === 'Media'
                        ? t('ticket.priority.medium')
                        : t('ticket.priority.low');
                  return (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setField('priority', level)}
                      className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
                        selected ? PRIORITY_TONE[level].active : PRIORITY_TONE[level].idle
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <TicketField
              label={t('ticket.fields.incidentTime')}
              optional={t('ticket.fields.incidentTimeOptional')}
              name="incidentTime"
              type="time"
              value={values.incidentTime}
              onChange={(v) => setField('incidentTime', v)}
            />
          </div>

          <div>
            <Field
              label={t('ticket.fields.issueDescription')}
              htmlFor="issueDescription"
              error={touched.issueDescription ? errors.issueDescription : undefined}
            >
              <Textarea
                id="issueDescription"
                name="issueDescription"
                rows={6}
                placeholder={t('ticket.hints.textarea')}
                value={values.issueDescription}
                onBlur={() => setTouched((p) => ({ ...p, issueDescription: true }))}
                onChange={(e) => setField('issueDescription', e.target.value)}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>{t('ticket.sections.evidence')}</SectionLabel>
          <input
            id={fileInputId}
            type="file"
            multiple
            className="sr-only"
            disabled={submitting}
            accept="image/*,.pdf,.txt,.doc,.docx,.xls,.xlsx"
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              e.target.value = '';
            }}
          />
          <label
            htmlFor={fileInputId}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(Array.from(e.dataTransfer.files || []));
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition ${
              dragging
                ? 'border-codiva-primary bg-codiva-primary/5'
                : 'border-zinc-300 bg-zinc-50/70 hover:border-codiva-primary/50 hover:bg-white'
            }`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-codiva-primary shadow-sm">
              <Paperclip className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <p className="text-sm font-medium text-zinc-900">
              <span className="text-codiva-primary">{t('ticket.dropzone.select')}</span>
              <span className="text-zinc-500"> {t('ticket.dropzone.or')}</span>
            </p>
            <p className="text-xs text-zinc-500">{t('ticket.hints.attachments')}</p>
          </label>

          {files.length > 0 && (
            <ul className="space-y-2">
              {files.map((f, idx) => (
                <li
                  key={`${fileKey(f)}-${idx}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-zinc-400">{formatBytes(f.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
                    aria-label={`${t('ticket.buttons.remove')} ${f.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {files.length > 1 && (
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-xs text-zinc-500 hover:text-zinc-800 hover:underline"
            >
              {t('ticket.buttons.removeAll')}
            </button>
          )}
          {fileError && <p className="text-xs text-red-600">{fileError}</p>}
        </section>
      </fieldset>

      <div className="space-y-3">
        <Button type="submit" className="w-full" disabled={submitting} aria-busy={submitting}>
          {submitting ? t('ticket.buttons.submitting') : t('ticket.buttons.submit')}
        </Button>
        {serverError && <p className="text-center text-sm text-red-600">{serverError}</p>}
      </div>
    </form>
  );

  const successBody = (
    <div className="flex flex-col items-center py-4 text-center sm:py-8">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-codiva-primary/10 text-codiva-primary">
        <CheckCircle2 className="h-7 w-7" strokeWidth={1.8} />
      </span>
      <h2 className="font-display text-2xl font-bold tracking-tight text-zinc-900">
        {t('ticket.status.submittedTitle')}
      </h2>
      <p className="mt-2 max-w-sm text-zinc-600">{t('ticket.status.submittedMsg')}</p>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{t('ticket.status.submittedHint')}</p>
      <Button type="button" onClick={() => setSubmitted(false)} className="mt-8 w-full max-w-xs">
        {t('ticket.buttons.new')}
      </Button>
    </div>
  );

  if (isPortal) {
    return <div>{formBody}</div>;
  }

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-codiva-background px-4 pb-16 pt-[max(6rem,env(safe-area-inset-top,0px)+4.5rem)] md:px-8 md:pb-24">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-codiva-primary/[0.08] blur-3xl" />
        <div className="absolute bottom-0 right-[-4rem] h-64 w-64 rounded-full bg-codiva-accent-light/15 blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:gap-16">
        <header className="lg:sticky lg:top-28 lg:pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-codiva-primary">
            {t('ticket.eyebrow')}
          </p>
          <Heading as="h1" size="text-3xl md:text-5xl" className="mt-3 text-zinc-900">
            {t('ticket.title')}
          </Heading>
          <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-600 md:text-lg">
            {t('ticket.subtitle')}
          </p>

          <div className="mt-8 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              {t('ticket.next.title')}
            </p>
            <ul className="space-y-3">
              {nextSteps.map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-3 text-sm text-zinc-600">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-codiva-primary shadow-sm ring-1 ring-zinc-200/80">
                    <Icon className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <span className="pt-1.5 leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </header>

        <div className="rounded-2xl border border-codiva-primary/10 bg-white p-5 shadow-xl shadow-zinc-900/[0.04] sm:p-8">
          {submitted ? successBody : formBody}
        </div>
      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-codiva-primary">{children}</h2>
  );
}

function TicketField({
  label,
  optional,
  name,
  value,
  error,
  type = 'text',
  autoComplete,
  readOnly,
  className = '',
  onChange,
  onBlur,
}: {
  label: string;
  optional?: string;
  name: string;
  value: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  readOnly?: boolean;
  className?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <Field
      htmlFor={name}
      className={className}
      error={error}
      label={
        <>
          {label}
          {optional ? <span className="ml-1.5 font-normal text-zinc-400">({optional})</span> : null}
        </>
      }
    >
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        readOnly={readOnly}
        className={readOnly ? 'bg-zinc-50' : ''}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
