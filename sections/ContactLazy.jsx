'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { scrollToSection } from '../utils/scrollToSection';

const Contact = dynamic(() => import('./Contact'), { ssr: false });

function hashIsContact() {
  return window.location.hash.replace('#', '') === 'contact';
}

export default function ContactLazy() {
  const ref = useRef(null);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    if (hashIsContact()) setLoad(true);

    const onHash = () => {
      if (hashIsContact()) setLoad(true);
    };
    window.addEventListener('hashchange', onHash);

    const el = ref.current;
    if (!el) {
      return () => window.removeEventListener('hashchange', onHash);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);
          io.disconnect();
        }
      },
      { rootMargin: '280px' }
    );
    io.observe(el);
    return () => {
      window.removeEventListener('hashchange', onHash);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!load || !hashIsContact()) return undefined;
    const run = (behavior) => scrollToSection('contact', { behavior, align: 'start' });
    run('auto');
    const frame = requestAnimationFrame(() => run('smooth'));
    const timer = window.setTimeout(() => run('smooth'), 280);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [load]);

  return (
    <div ref={ref} id="contact" className="w-full scroll-mt-24 md:scroll-mt-28">
      {load ? (
        <Contact />
      ) : (
        <section
          className="section-spacing flex w-full justify-center bg-zinc-50 px-6 md:px-12"
          aria-hidden
        >
          <div className="min-h-[28rem] w-full max-w-2xl rounded-xl bg-white px-6 py-12 shadow-md md:px-12" />
        </section>
      )}
    </div>
  );
}
