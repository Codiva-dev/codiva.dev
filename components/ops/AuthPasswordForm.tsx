'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { User } from '@supabase/supabase-js';
import AuthCard from '@/components/ui/AuthCard';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { safeNextPath } from '@/lib/ops/safe-path';
import { authErrorMessage } from '@/lib/user-error';

type OpsSupabase = ReturnType<typeof createClient>;

export type AuthAuthorizeResult = { ok: true } | { ok: false; message: string };

export default function AuthPasswordForm({
  title,
  subtitle,
  emailLabel,
  passwordLabel,
  forgotLabel,
  forgotHref,
  submitLabel,
  submittingLabel,
  failedLabel,
  welcomeLabel,
  emailId,
  passwordId,
  urlMessage,
  defaultNext,
  authorize,
}: {
  title: string;
  subtitle: string;
  emailLabel: string;
  passwordLabel: string;
  forgotLabel: string;
  forgotHref: string;
  submitLabel: string;
  submittingLabel: string;
  failedLabel: string;
  welcomeLabel: string;
  emailId: string;
  passwordId: string;
  urlMessage?: string;
  defaultNext: string;
  authorize: (input: { supabase: OpsSupabase; user: User }) => Promise<AuthAuthorizeResult>;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const toastId = toast.loading(submittingLabel);
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authError) {
      const msg = authErrorMessage(authError.message, t);
      setMessage(msg);
      toast.error(msg, { id: toastId });
      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage(failedLabel);
      toast.error(failedLabel, { id: toastId });
      setLoading(false);
      return;
    }

    const result = await authorize({ supabase, user: data.user });
    if (!result.ok) {
      await supabase.auth.signOut();
      setMessage(result.message);
      toast.error(result.message, { id: toastId });
      setLoading(false);
      return;
    }

    toast.success(welcomeLabel, { id: toastId });
    router.push(safeNextPath(searchParams.get('next'), defaultNext));
    router.refresh();
  }

  return (
    <AuthCard title={title} subtitle={subtitle} message={message || urlMessage || null}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={emailLabel} htmlFor={emailId}>
          <Input
            id={emailId}
            type="email"
            required
            autoComplete="email"
            size="sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field
          label={passwordLabel}
          htmlFor={passwordId}
          extra={
            <Link href={forgotHref} className="text-xs text-codiva-primary hover:underline">
              {forgotLabel}
            </Link>
          }
        >
          <Input
            id={passwordId}
            type="password"
            required
            autoComplete="current-password"
            size="sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" size="sm" className="w-full" disabled={loading}>
          {loading ? submittingLabel : submitLabel}
        </Button>
      </form>
    </AuthCard>
  );
}
