'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CaseStudyLogo } from './CaseStudyLogo';
import useMarqueeCopies from '../hooks/useMarqueeCopies';
import useMarqueePause from '../hooks/useMarqueePause';

const MARQUEE_GAP = 'gap-5';
const LOGO_H = '3.5rem';
const PIN_MS = 2800;
const SYNC_MS = 120;

function MarqueeLogo({ item }) {
  return (
    <span
      className="flex h-14 flex-shrink-0 items-center justify-center"
      style={{ height: LOGO_H }}
    >
      <CaseStudyLogo
        item={item}
        alt=""
        className="h-full w-auto max-h-full object-contain"
      />
    </span>
  );
}

function nameClosestToCenter(container) {
  const root = container.getBoundingClientRect();
  const mid = root.left + root.width / 2;
  let bestName = null;
  let bestDist = Infinity;
  container.querySelectorAll('[data-case-name]').forEach((el) => {
    const box = el.getBoundingClientRect();
    if (box.right < root.left || box.left > root.right) return;
    const dist = Math.abs(box.left + box.width / 2 - mid);
    if (dist < bestDist) {
      bestDist = dist;
      bestName = el.getAttribute('data-case-name');
    }
  });
  return bestName;
}

export default function CaseStudiesMobile({ logos }) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const containerRef = useRef(null);
  const pinnedUntilRef = useRef(0);
  const logosMarquee = useMarqueePause();
  const logosCopies = useMarqueeCopies(logos, MARQUEE_GAP);
  const inView = useInView(containerRef, { amount: 0.2 });

  const project = logos[index];
  const indexByName = useMemo(() => {
    const map = new Map();
    logos.forEach((item, i) => map.set(item.name, i));
    return map;
  }, [logos]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !inView || indexByName.size === 0) return undefined;

    const sync = () => {
      if (Date.now() < pinnedUntilRef.current) return;
      const name = nameClosestToCenter(container);
      const next = name ? indexByName.get(name) : undefined;
      if (next == null) return;
      setIndex((current) => (current === next ? current : next));
    };

    sync();
    const id = window.setInterval(sync, SYNC_MS);
    return () => window.clearInterval(id);
  }, [inView, indexByName, logosCopies.copyCount]);

  const selectByName = (name) => {
    const next = indexByName.get(name);
    if (next == null) return;
    setIndex(next);
    pinnedUntilRef.current = Date.now() + PIN_MS;
  };

  if (!project) return null;

  return (
    <div className="flex min-w-0 flex-col items-center">
      <div
        ref={(node) => {
          containerRef.current = node;
          logosCopies.containerRef.current = node;
        }}
        className="relative w-full min-w-0 overflow-x-auto overscroll-x-contain px-1 touch-pan-x scrollbar-hidden"
        {...logosMarquee.containerProps}
      >
        <div
          ref={logosCopies.measureRef}
          className={`pointer-events-none absolute left-0 top-0 flex w-max ${MARQUEE_GAP} opacity-0`}
          aria-hidden
        >
          {logos.map((item) => (
            <MarqueeLogo key={`meas-${item.name}`} item={item} />
          ))}
        </div>
        <div
          style={{ ...logosCopies.marqueeStyle, animationDuration: '45s' }}
          className={logosMarquee.innerClassName(
            `flex ${MARQUEE_GAP} min-w-max whitespace-nowrap will-change-transform animate-scroll-right animate-medium py-2`
          )}
        >
          {logosCopies.flatWithKeys.map(({ item, key, copyIdx }) => {
            const selected = item.name === project.name;
            const interactive = copyIdx === 0;
            return (
              <button
                key={key}
                type="button"
                data-case-name={item.name}
                tabIndex={interactive ? 0 : -1}
                aria-hidden={!interactive}
                aria-label={interactive ? item.name : undefined}
                aria-pressed={interactive ? selected : undefined}
                onClick={() => selectByName(item.name)}
                className={`flex-shrink-0 rounded-lg transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-codiva-primary ${
                  selected ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <MarqueeLogo item={item} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={project.name}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col items-center"
          >
            <ul
              className="flex min-h-[4.5rem] w-full flex-wrap justify-center gap-2"
              aria-label={t('cases.technologiesOf', { name: project.name })}
            >
              {project.tech.map((tech) => (
                <li
                  key={tech}
                  className="rounded-full border border-codiva-primary/20 bg-codiva-primary/5 px-3 py-1 text-sm text-codiva-primary"
                >
                  {tech}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
