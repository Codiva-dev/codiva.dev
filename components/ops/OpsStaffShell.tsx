'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, PanelLeft, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OpsSidebar from '@/components/ops/OpsSidebar';
import { writeOpsSidebarOpenCookie } from '@/lib/ops/sidebar-pref';
import type { PermissionSubject } from '@/lib/ops/permissions';

const TOGGLE_BTN_CLASS =
  'pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50';

export default function OpsStaffShell({
  staffName,
  staffPermissions,
  pendingCount = 0,
  initialSidebarOpen,
  children,
}: {
  staffName: string;
  staffPermissions?: PermissionSubject;
  pendingCount?: number;
  initialSidebarOpen: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const [desktopOpen, setDesktopOpen] = useState(initialSidebarOpen);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileOpenBtnRef = useRef<HTMLButtonElement>(null);

  const toggleDesktop = useCallback(() => {
    setDesktopOpen((prev) => {
      const next = !prev;
      writeOpsSidebarOpenCookie(next);
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setMobileOpen(false);
      mobileOpenBtnRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="flex h-dvh overflow-hidden">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-[2px] lg:hidden"
          aria-label={t('ops.layout.closeNavigation')}
          onClick={closeMobile}
        />
      ) : null}

      <div
        id="ops-sidebar-panel"
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-labelledby={mobileOpen ? 'ops-mobile-nav-title' : undefined}
        aria-hidden={!mobileOpen && !desktopOpen ? true : undefined}
        className={[
          'flex shrink-0 flex-col border-zinc-200 bg-white',
          'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-[60] max-lg:max-h-dvh max-lg:w-[min(16rem,90vw)]',
          'max-lg:shadow-[8px_0_32px_rgba(15,23,42,0.12)] max-lg:transition-transform max-lg:duration-300',
          mobileOpen
            ? 'max-lg:pointer-events-auto max-lg:translate-x-0'
            : 'max-lg:pointer-events-none max-lg:-translate-x-full',
          'lg:h-full lg:border-r lg:transition-[width,opacity] lg:duration-300 lg:ease-out',
          desktopOpen
            ? 'lg:w-64 lg:opacity-100'
            : 'lg:pointer-events-none lg:w-0 lg:overflow-hidden lg:border-r-0 lg:opacity-0',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 lg:hidden">
          <span id="ops-mobile-nav-title" className="text-base font-semibold text-zinc-900">
            {t('ops.layout.mobileNavigationTitle')}
          </span>
          <button
            type="button"
            className={TOGGLE_BTN_CLASS}
            onClick={closeMobile}
            aria-label={t('ops.layout.closeNavigation')}
          >
            <X className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <OpsSidebar
          staffName={staffName}
          staffPermissions={staffPermissions}
          pendingCount={pendingCount}
          onHide={toggleDesktop}
          onNavigate={closeMobile}
        />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2">
          <button
            ref={mobileOpenBtnRef}
            type="button"
            className={`${TOGGLE_BTN_CLASS} lg:hidden`}
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
            aria-controls="ops-sidebar-panel"
          >
            <span className="sr-only">{t('ops.layout.openNavigation')}</span>
            <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>

          {!desktopOpen ? (
            <button
              type="button"
              className={`${TOGGLE_BTN_CLASS} hidden lg:flex`}
              onClick={toggleDesktop}
              aria-expanded={desktopOpen}
              aria-controls="ops-sidebar-panel"
              aria-label={t('ops.layout.showSidebar')}
            >
              <PanelLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </div>

        <main
          className={[
            'min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8',
            'max-lg:pt-16',
            desktopOpen ? '' : 'lg:pl-16',
          ].join(' ')}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
