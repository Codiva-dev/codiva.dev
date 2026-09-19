'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import i18n from '@/i18n/i18n';
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, isLocale } from '@/i18n/config';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '/icons/flags/en.svg' },
  { code: 'es', label: 'Español', flag: '/icons/flags/es.svg' },
];

const MENU_MIN_WIDTH = 150;
const MENU_ESTIMATED_HEIGHT = 96;
const MENU_GAP = 8;
const MENU_PAD = 8;

function persistLocale(code) {
  document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};SameSite=Lax`;
}

function menuStyleFromTrigger(triggerEl) {
  const rect = triggerEl.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - MENU_PAD;
  const openUp = spaceBelow < MENU_ESTIMATED_HEIGHT;
  const left = Math.min(
    Math.max(MENU_PAD, rect.right - MENU_MIN_WIDTH),
    window.innerWidth - MENU_MIN_WIDTH - MENU_PAD
  );
  return openUp
    ? {
        position: 'fixed',
        left,
        bottom: window.innerHeight - rect.top + MENU_GAP,
        zIndex: 80,
      }
    : {
        position: 'fixed',
        left,
        top: rect.bottom + MENU_GAP,
        zIndex: 80,
      };
}

export default function LanguageSwitcher() {
  const { t, i18n: i18nHook } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const [mounted, setMounted] = useState(false);
  const currentLang = isLocale(i18nHook.resolvedLanguage)
    ? i18nHook.resolvedLanguage
    : isLocale(i18n.resolvedLanguage)
      ? i18n.resolvedLanguage
      : 'es';
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const timeoutRef = useRef(null);

  const updateMenuStyle = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuStyle(menuStyleFromTrigger(triggerRef.current));
  }, []);

  const keepOpen = () => {
    clearTimeout(timeoutRef.current);
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

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return undefined;
    }
    updateMenuStyle();
    window.addEventListener('resize', updateMenuStyle);
    window.addEventListener('scroll', updateMenuStyle, true);
    return () => {
      window.removeEventListener('resize', updateMenuStyle);
      window.removeEventListener('scroll', updateMenuStyle, true);
    };
  }, [open, updateMenuStyle]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointer(event) {
      const target = event.target;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const safeFlag =
    LANGUAGES.find((l) => l.code === currentLang)?.flag || LANGUAGES[0].flag;

  async function selectLanguage(code) {
    persistLocale(code);
    await i18n.changeLanguage(code);
    document.documentElement.lang = code;
    setOpen(false);
    router.refresh();
  }

  const openUp = Boolean(menuStyle && 'bottom' in menuStyle);

  return (
    <div
      ref={triggerRef}
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
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('a11y.changeLanguage')}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-zinc-300 bg-white p-0 shadow-sm transition hover:ring-2 ring-codiva-primary"
      >
        <Image
          src={safeFlag}
          alt={currentLang}
          width={24}
          height={24}
          className="h-full w-full rounded-full object-cover"
          priority
        />
      </button>

      {mounted
        ? createPortal(
            open && menuStyle ? (
                <div
                  ref={menuRef}
                  style={menuStyle}
                  onMouseEnter={() => {
                    if (isDesktop) keepOpen();
                  }}
                  onMouseLeave={() => {
                    if (isDesktop) scheduleClose();
                  }}
                  className={`ops-theme w-fit min-w-[150px] overflow-hidden rounded-xl border border-zinc-200 bg-white px-1 py-1 shadow-lg ${
                    openUp ? 'origin-bottom-right' : 'origin-top-right'
                  }`}
                >
                  {LANGUAGES.map((lang, index) => (
                    <div key={lang.code}>
                      <button
                        type="button"
                        onClick={() => selectLanguage(lang.code)}
                        className={`flex w-full items-center justify-center gap-3 rounded-md px-3 py-1.5 text-sm transition hover:bg-zinc-100 ${
                          currentLang === lang.code
                            ? 'font-medium text-[color:var(--c-link)]'
                            : 'text-[color:var(--c-ink-3)]'
                        }`}
                      >
                        <Image
                          src={lang.flag}
                          alt={lang.label}
                          width={20}
                          height={20}
                          className="rounded-sm object-contain"
                          style={{ aspectRatio: '3 / 2' }}
                        />
                        <span className="text-[0.875rem] leading-normal">
                          {lang.label}
                        </span>
                      </button>

                      {index < LANGUAGES.length - 1 && (
                        <div className="mx-2 my-1 border-t border-zinc-200" />
                      )}
                    </div>
                  ))}
                </div>
              ) : null,
            document.body
          )
        : null}
    </div>
  );
}
