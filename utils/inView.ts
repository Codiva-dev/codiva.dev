import { useEffect, useRef, useState } from 'react';

const IO_THRESHOLDS = [0, 0.08, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.85, 1];

export function revealClass(inView: boolean, delayClass = ''): string {
  return ['reveal', inView ? 'is-in' : '', delayClass].filter(Boolean).join(' ');
}

/**
 * Fraction of the element that must be visible.
 * Sections taller than the screen reveal once roughly 45% of the viewport
 * shows them; shorter sections keep the requested threshold.
 */
export function requiredIntersectionRatio(
  elementHeight: number,
  rootHeight: number,
  threshold: number,
): number {
  if (!(elementHeight > 0) || !(rootHeight > 0)) return 0;
  if (elementHeight <= rootHeight) return threshold;
  const viewportShare = (rootHeight / elementHeight) * 0.45;
  return Math.min(threshold, Math.max(0.08, viewportShare));
}

export function useInView(threshold = 0.4) {
  const ref = useRef<Element | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        const rootHeight = entry.rootBounds?.height ?? window.innerHeight;
        const needed = requiredIntersectionRatio(
          entry.boundingClientRect.height,
          rootHeight,
          threshold,
        );
        setInView(entry.intersectionRatio >= needed - 0.001);
      },
      { threshold: IO_THRESHOLDS },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}
