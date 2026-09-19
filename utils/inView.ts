import { useEffect, useRef, useState } from 'react';

export function revealClass(inView: boolean, delayClass = ''): string {
  return ['reveal', inView ? 'is-in' : '', delayClass].filter(Boolean).join(' ');
}

export function useInView(threshold = 0.4) {
  const ref = useRef<Element | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}
