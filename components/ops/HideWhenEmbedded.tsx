'use client';

import { useEffect, useState, type ReactNode } from 'react';

/** Hides Ops chrome when the page is shown inside the preview modal iframe. */
export default function HideWhenEmbedded({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    setEmbedded(window.self !== window.top);
  }, []);

  if (embedded) return fallback;
  return children;
}
