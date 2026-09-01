'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HUNT_PROGRESS_EVENT, HUNT_SESSION_EVENT } from '@/lib/careers/hunt/cookie';
import {
  readHuntContext,
  readHuntCookie,
  writeHuntCookie,
} from '@/components/careers/hunt-context';
import HuntCraftTracker, { type HuntCraftPublic } from '@/components/careers/HuntCraftTracker';

function huntToken(): string {
  const fromCookie = readHuntCookie();
  if (fromCookie.length >= 16) return fromCookie;
  return readHuntContext()?.token || '';
}

function ping(pathname: string) {
  const token = huntToken();
  if (token.length < 16) return;
  writeHuntCookie(token);
  const body = JSON.stringify({
    token,
    path: pathname || '/',
    host: window.location.hostname,
    referrer: document.referrer || '',
  });
  void fetch('/api/careers/hunt-beacon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
    body,
  }).catch(() => {});
}

function isHuntFormPath(path: string) {
  return /\/prueba\/?$/.test(path) || /\/hallazgos\/?$/.test(path);
}

function reportHref() {
  if (typeof window === 'undefined') return '/empleos/hallazgos';
  return window.location.hostname.startsWith('career.') ? '/hallazgos' : '/empleos/hallazgos';
}

type HuntDockState = {
  crafts: HuntCraftPublic[];
  matched: number;
  needed: number;
};

export default function HuntBeacon() {
  const pathname = usePathname();
  const [dock, setDock] = useState<HuntDockState | null>(null);

  const refreshDock = useCallback(async () => {
    const token = huntToken();
    if (token.length < 16) {
      setDock(null);
      return;
    }
    try {
      const res = await fetch('/api/careers/assessments/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      const session = data?.session;
      if (
        !res.ok ||
        !session?.passed ||
        session.status !== 'completed' ||
        !session.hunt_required ||
        !session.hunt_cover_all ||
        session.hunt_ready
      ) {
        setDock(null);
        return;
      }
      setDock({
        crafts: Array.isArray(session.hunt_crafts) ? session.hunt_crafts : [],
        matched: Number(session.hunt_matched) || 0,
        needed: Number(session.hunt_needed) || 0,
      });
    } catch {
      setDock(null);
    }
  }, []);

  useEffect(() => {
    ping(pathname || '/');
    const onSession = () => ping(pathname || '/');
    window.addEventListener(HUNT_SESSION_EVENT, onSession);
    return () => window.removeEventListener(HUNT_SESSION_EVENT, onSession);
  }, [pathname]);

  useEffect(() => {
    void refreshDock();
    const onChange = () => {
      void refreshDock();
    };
    window.addEventListener(HUNT_SESSION_EVENT, onChange);
    window.addEventListener(HUNT_PROGRESS_EVENT, onChange);
    return () => {
      window.removeEventListener(HUNT_SESSION_EVENT, onChange);
      window.removeEventListener(HUNT_PROGRESS_EVENT, onChange);
    };
  }, [refreshDock]);

  const hideDock = isHuntFormPath(pathname || '');

  return hideDock || !dock ? null : (
    <div className="fixed bottom-24 right-4 z-40 sm:bottom-6">
      <HuntCraftTracker
        crafts={dock.crafts}
        matched={dock.matched}
        needed={dock.needed}
        variant="dock"
        reportHref={reportHref()}
      />
    </div>
  );
}
