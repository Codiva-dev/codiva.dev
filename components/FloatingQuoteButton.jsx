'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';

const QuoteModal = dynamic(() => import('./QuoteModal'), { ssr: false });

export default function FloatingQuoteButton() {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [overFooter, setOverFooter] = useState(false);
  const { t } = useTranslation();

  const close = useCallback(() => {
    setOpen(false);
    setShowForm(false);
  }, []);

  useEffect(() => {
    const footer = document.querySelector('[data-site-footer]');
    if (!footer) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setOverFooter(Boolean(entry?.isIntersecting)),
      { threshold: 0, rootMargin: '0px 0px 120px 0px' }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        className={`fixed bottom-6 right-6 z-50 transition duration-200 ${
          overFooter ? 'pointer-events-none translate-y-3 opacity-0' : ''
        }`}
        aria-hidden={overFooter}
      >
        <button
          type="button"
          tabIndex={overFooter ? -1 : undefined}
          onClick={() => setOpen(true)}
          className="rounded-full bg-codiva-primary px-5 py-3 text-sm font-medium text-white shadow-lg transition hover:scale-105 hover:bg-codiva-primary-dark active:scale-95"
        >
          {t('quote.button')}
        </button>
      </div>

      {open ? (
        <QuoteModal
          key="quote-modal"
          showForm={showForm}
          onShowForm={() => setShowForm(true)}
          onClose={close}
        />
      ) : null}
    </>
  );
}
