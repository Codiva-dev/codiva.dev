'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useRouter, usePathname } from 'next/navigation';
import { scrollToSection } from '../utils/scrollToSection';
import CodivaWordmarkMark from './CodivaWordmarkMark';
import { marketingBaseUrl } from '@/lib/ops/host';

const navItems = [
  { labelKey: 'nav.about', id: 'about' },
  { labelKey: 'nav.services', id: 'services' },
  { labelKey: 'nav.cases', id: 'casos' },
  { labelKey: 'nav.contact', id: 'contact' },
];

function focusableIn(root) {
  if (!root) return [];
  return [...root.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
    (node) => node.offsetParent !== null || node.getClientRects().length
  );
}

function MenuToggle({ open, onToggle, label, buttonRef }) {
  const bar =
    'absolute left-0 h-0.5 w-full rounded-full bg-slate-800 transition duration-200 ease-out';
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={open}
      aria-controls="mobile-menu"
      className="relative flex h-7 w-7 shrink-0 items-center justify-center p-0 leading-none"
    >
      <span className="relative block h-3.5 w-[18px]" aria-hidden="true">
        <span
          className={`${bar} ${open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'}`}
        />
        <span
          className={`${bar} top-1/2 -translate-y-1/2 ${open ? 'scale-0 opacity-0' : ''}`}
        />
        <span
          className={`${bar} ${open ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0'}`}
        />
      </span>
    </button>
  );
}

export default function Navbar({ variant = 'marketing' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { t } = useTranslation();
  const isSatellite = variant === 'career' || variant === 'ticket';
  const marketingUrl = marketingBaseUrl();
  const chromeRef = useRef(null);
  const toggleRef = useRef(null);
  const wasMenuOpen = useRef(false);

  /**
   * Navega a la sección correspondiente.
   * En la bolsa (career.*) las secciones viven en el sitio de marketing.
   */
  const scrollTo = (id) => {
    if (isSatellite) {
      window.location.href = `${marketingUrl}/#${id}`;
      setMenuOpen(false);
      return;
    }
    if (pathname !== '/') {
      router.push(`/#${id}`);
    } else {
      scrollToSection(id);
    }
    setMenuOpen(false);
  };

  const goBrandHome = () => {
    if (isSatellite) {
      window.location.href = marketingUrl;
      return;
    }
    scrollTo('hero');
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowNavbar(currentScrollY <= 80 || currentScrollY < lastScrollY);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', closeOnDesktop);
    return () => mq.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      if (wasMenuOpen.current) toggleRef.current?.focus();
      wasMenuOpen.current = false;
      return undefined;
    }
    wasMenuOpen.current = true;
    const y = window.scrollY;
    const body = document.body;
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = focusableIn(chromeRef.current);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!chromeRef.current?.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      body.style.overflow = prev.overflow;
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      window.scrollTo(0, y);
    };
  }, [menuOpen]);

  return (
    <div className="pointer-events-none fixed top-0 z-50 w-full px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] md:px-6">
      {menuOpen ? (
        <div
          onClick={() => setMenuOpen(false)}
          className="pointer-events-auto fixed inset-0 z-40 bg-zinc-900/45"
          aria-hidden="true"
        />
      ) : null}

      <div ref={chromeRef} className="relative z-50 mx-auto max-w-7xl">
        <nav
          className={`glass-panel pointer-events-auto flex h-14 items-center rounded-2xl px-5 font-inter transition-transform duration-300 ease-out md:px-8 ${
            showNavbar || menuOpen ? 'translate-y-0' : '-translate-y-24'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            {/* Hunt seed nav-logo-not-keyboard: clicable a ratón, no entra al tab order. */}
            <div
              onClick={goBrandHome}
              className="flex h-7 cursor-pointer items-center space-x-2 bg-transparent p-0"
            >
              <Image
                src="/logo.svg"
                alt="Codiva logo"
                width={28}
                height={28}
                className="block h-7 w-7"
              />
              <CodivaWordmarkMark
                size="md"
                variant="default"
                className="leading-none [&_span]:leading-none"
              />
            </div>

            <div className="hidden items-center justify-between gap-6 lg:flex">
              <div className="flex gap-12">
                {navItems.map(({ labelKey, id }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => scrollTo(id)}
                    className="relative font-medium text-codiva-secondary transition-colors after:absolute after:bottom-[-2px] after:left-0 after:h-[2px] after:w-0 after:bg-codiva-primary after:transition-all hover:text-zinc-900 hover:after:w-full"
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>

              <div className="pl-4">
                <LanguageSwitcher />
              </div>
            </div>

            <div className="flex h-7 items-center gap-3 lg:hidden">
              <LanguageSwitcher />
              <MenuToggle
                open={menuOpen}
                onToggle={() => setMenuOpen((open) => !open)}
                label={t('a11y.menu')}
                buttonRef={toggleRef}
              />
            </div>
          </div>
        </nav>

        {menuOpen ? (
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t('a11y.menu')}
            className="glass-panel-solid pointer-events-auto absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 h-fit rounded-2xl p-2 lg:hidden"
          >
            <div className="flex flex-col">
              {navItems.map(({ labelKey, id }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollTo(id)}
                  className="flex min-h-12 w-full items-center rounded-xl px-4 text-left text-base font-medium leading-none text-codiva-secondary transition hover:bg-zinc-100 hover:text-zinc-900"
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
