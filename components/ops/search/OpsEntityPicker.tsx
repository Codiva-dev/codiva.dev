'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { textMatches } from '@/lib/ops/search-text';
import OpsHighlight from './OpsHighlight';

export type OpsEntityOption = {
  id: string;
  label: string;
  hint?: string;
};

export default function OpsEntityPicker({
  name,
  options,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  name: string;
  options: OpsEntityOption[];
  value: string;
  onChange?: (id: string) => void;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((row) => row.id === value) || null;
  const [query, setQuery] = useState(selected?.label || '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const hits = useMemo(
    () => options.filter((row) => textMatches(`${row.label} ${row.hint || ''}`, query)).slice(0, 12),
    [options, query]
  );

  useEffect(() => {
    setQuery(selected?.label || '');
  }, [selected?.label]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  function choose(id: string) {
    const next = options.find((row) => row.id === id);
    onChange?.(id);
    setQuery(next?.label || '');
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-codiva-primary focus:ring-2 focus:ring-codiva-primary/20 disabled:cursor-not-allowed disabled:bg-zinc-50"
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          setOpen(true);
          setActiveIndex(0);
          if (selected && next !== selected.label) onChange?.('');
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
            return;
          }
          if (event.key === 'ArrowDown' && hits.length) {
            event.preventDefault();
            setActiveIndex((index) => Math.min(hits.length - 1, index + 1));
            return;
          }
          if (event.key === 'ArrowUp' && hits.length) {
            event.preventDefault();
            setActiveIndex((index) => Math.max(0, index - 1));
            return;
          }
          if (event.key === 'Enter' && open && hits[activeIndex]) {
            event.preventDefault();
            choose(hits[activeIndex].id);
          }
        }}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1"
        >
          {hits.length ? (
            hits.map((row, index) => (
              <li key={row.id} role="option" aria-selected={row.id === value}>
                <button
                  type="button"
                  className={`w-full px-3 py-2.5 text-left text-sm ${
                    index === activeIndex ? 'bg-codiva-primary/10 text-zinc-900' : 'text-zinc-800 hover:bg-zinc-50'
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(row.id)}
                >
                  <span className="block font-medium">
                    <OpsHighlight text={row.label} query={query} />
                  </span>
                  {row.hint ? <span className="mt-0.5 block text-xs text-zinc-500">{row.hint}</span> : null}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2.5 text-sm text-zinc-500">{t('ops.buscador.noMatch', { nounOne: placeholder })}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
