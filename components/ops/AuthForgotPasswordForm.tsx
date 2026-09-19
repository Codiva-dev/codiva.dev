'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';
import AuthCard from '@/components/ui/AuthCard';
import Button from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';

export default function AuthForgotPasswordForm({
  title,
  subtitle,
  emailLabel,
  emailId,
  sendLabel,
  sendingLabel,
  backLabel,
  backHref,
  requestReset,
}: {
  title: string;
  subtitle: string;
  emailLabel: string;
  emailId: string;
  sendLabel: string;
  sendingLabel: string;
  backLabel: string;
  backHref: string;
  requestReset: (email: string) => Promise<{ ok: boolean; message: string }>;
}) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const toastId = toast.loading(sendingLabel);
    const result = await requestReset(email);
    setMessage({ type: result.ok ? 'ok' : 'err', text: result.message });
    if (result.ok) toast.success(result.message, { id: toastId });
    else toast.error(result.message, { id: toastId });
    setLoading(false);
  }

  return (
    <AuthCard
      title={title}
      subtitle={subtitle}
      message={message?.text ?? null}
      messageTone={message?.type === 'ok' ? 'success' : 'error'}
      footer={
        <Link href={backHref} className="text-codiva-primary hover:underline">
          {backLabel}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={emailLabel} htmlFor={emailId}>
          <Input
            id={emailId}
            type="email"
            required
            size="sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" size="sm" className="w-full" disabled={loading}>
          {loading ? sendingLabel : sendLabel}
        </Button>
      </form>
    </AuthCard>
  );
}
