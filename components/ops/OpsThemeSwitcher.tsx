'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

const OPTIONS = [
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
  { id: 'system', icon: Monitor },
] as const;

export default function OpsThemeSwitcher() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const keepOpen = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const scheduleClose = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const current = OPTIONS.some((option) => option.id === theme) ? theme : 'system';
  const CurrentIcon = mounted
    ? (OPTIONS.find((option) => option.id === current)?.icon ?? Monitor)
    : Monitor;

  return (
    <div
      ref={rootRef}
      className="relative h-7 w-7"
      onMouseEnter={() => {
        if (isDesktop) keepOpen();
      }}
      onMouseLeave={() => {
        if (isDesktop) scheduleClose();
      }}
    >
      <button
        type="button"
        disabled={!mounted}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('a11y.theme.toggle')}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-full w-full items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-sm transition hover:ring-2 ring-codiva-primary disabled:opacity-70"
      >
        <CurrentIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <div className="absolute bottom-full right-0 z-20 pb-2">
          <div className="w-max min-w-[150px] overflow-hidden rounded-xl border border-zinc-200 bg-white px-1 py-1 shadow-lg">
            {OPTIONS.map(({ id, icon: Icon }, index) => {
              const selected = mounted && current === id;
              return (
                <div key={id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setTheme(id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm transition hover:bg-zinc-100',
                      selected
                        ? 'font-medium text-[color:var(--c-link)]'
                        : 'text-[color:var(--c-ink-3)]'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                    <span>{t(`ops.settings.theme.${id}`)}</span>
                  </button>
                  {index < OPTIONS.length - 1 ? (
                    <div className="mx-2 my-1 border-t border-zinc-200" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
