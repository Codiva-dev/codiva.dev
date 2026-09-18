'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

const OPTIONS = [
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
  { id: 'system', icon: Monitor },
] as const;

export default function OpsThemeSettings() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = OPTIONS.some((option) => option.id === theme) ? theme : 'system';

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {OPTIONS.map(({ id, icon: Icon }) => {
        const selected = mounted && current === id;
        return (
          <button
            key={id}
            type="button"
            disabled={!mounted}
            onClick={() => setTheme(id)}
            aria-pressed={selected}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition',
              selected
                ? 'border-codiva-primary bg-codiva-primary/10 text-codiva-primary'
                : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            {t(`ops.settings.theme.${id}`)}
          </button>
        );
      })}
    </div>
  );
}
