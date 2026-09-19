'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { groupSearchHits, type OpsSearchGroup, type OpsSearchHit } from '@/lib/ops/global-search';
import OpsHighlight from './OpsHighlight';

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export default function OpsCommandPalette() {
  const { t } = useTranslation();
  const router = useRouter();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<OpsSearchHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const groups = useMemo(() => groupSearchHits(hits), [hits]);
  const flat = useMemo(() => groups.flatMap((row) => row.hits), [groups]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetch(`/api/ops/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((body: { hits?: OpsSearchHit[] }) => {
          setHits(Array.isArray(body.hits) ? body.hits : []);
          setActiveIndex(0);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setHits([]);
        })
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query]);

  function go(hit: OpsSearchHit) {
    setOpen(false);
    router.push(hit.href);
  }

  const empty = !loading && !flat.length;

  return (
    <>
      <button
        type="button"
        className="pointer-events-auto flex h-10 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-600 shadow-sm transition hover:bg-zinc-50"
        onClick={() => setOpen(true)}
        aria-label={t('ops.commandPalette.shortcutAria')}
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{t('ops.commandPalette.title')}</span>
        <kbd className="hidden rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 lg:inline">
          Ctrl K
        </kbd>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('ops.commandPalette.title')}
        titleId={titleId}
        closeLabel={t('common.buttons.close')}
        size="md"
        layer="raised"
        header={
          <p id={titleId} className="sr-only">
            {t('ops.commandPalette.title')}
          </p>
        }
        className="flex max-h-[min(92dvh,640px)] flex-col overflow-hidden p-0"
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && flat.length) {
            event.preventDefault();
            setActiveIndex((index) => Math.min(flat.length - 1, index + 1));
          } else if (event.key === 'ArrowUp' && flat.length) {
            event.preventDefault();
            setActiveIndex((index) => Math.max(0, index - 1));
          } else if (event.key === 'Enter' && flat[activeIndex]) {
            event.preventDefault();
            go(flat[activeIndex]);
          }
        }}
      >
        <div className="border-b border-zinc-200 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('ops.commandPalette.placeholder')}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-codiva-primary focus:ring-2 focus:ring-codiva-primary/20"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {empty ? (
            <p className="px-3 py-8 text-center text-sm text-zinc-500">
              {query.trim() ? t('ops.commandPalette.empty') : t('ops.commandPalette.emptyHint')}
            </p>
          ) : (
            groups.map((row) => (
              <section key={row.group} className="mb-2">
                <h2 className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  {t(`ops.commandPalette.groups.${row.group as OpsSearchGroup}`)}
                </h2>
                <ul>
                  {row.hits.map((hit) => {
                    const index = flat.findIndex((item) => item.id === hit.id && item.group === hit.group);
                    const active = index === activeIndex;
                    return (
                      <li key={`${hit.group}:${hit.id}`}>
                        <button
                          type="button"
                          className={`flex w-full flex-col rounded-lg px-3 py-2 text-left ${
                            active ? 'bg-codiva-primary/10' : 'hover:bg-zinc-50'
                          }`}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => go(hit)}
                        >
                          <span className="text-sm font-medium text-zinc-900">
                            <OpsHighlight text={hit.title} query={query} />
                          </span>
                          {hit.subtitle ? <span className="text-xs text-zinc-500">{hit.subtitle}</span> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </Modal>
    </>
  );
}
