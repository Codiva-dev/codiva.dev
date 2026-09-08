'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { asHttpHref, usageUrlLabel } from '@/lib/ops/host';

type Props = {
  href: string;
  label?: string;
  className?: string;
};

export default function CopyableUrl({ href, label, className = '' }: Props) {
  const { t } = useTranslation();
  const absolute = asHttpHref(href);
  const text = label || usageUrlLabel(absolute);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  if (!absolute) return null;

  return (
    <div
      className={`inline-flex min-w-0 max-w-full items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 py-1 pl-2.5 pr-1 ${className}`}
    >
      <a
        href={absolute}
        target="_blank"
        rel="noreferrer"
        title={absolute}
        className="min-w-0 truncate font-mono text-xs tracking-tight text-zinc-700 hover:text-codiva-primary"
      >
        {text}
      </a>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 hover:bg-white hover:text-zinc-800"
        title={copied ? t('ops.secret.copied') : `${t('ops.secret.copy')} ${absolute}`}
        aria-label={copied ? t('ops.secret.copied') : `${t('ops.secret.copy')} ${absolute}`}
      >
        {copied ? t('ops.secret.copied') : t('ops.secret.copy')}
      </button>
    </div>
  );
}
