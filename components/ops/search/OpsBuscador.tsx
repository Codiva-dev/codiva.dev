'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, ListFilter, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { rankedFilterSuggestions } from '@/lib/ops/search-text';
import OpsHighlight from './OpsHighlight';

export type OpsBuscadorFilterKind = 'single' | 'multi';

export type OpsBuscadorOption = {
  value: string;
  label: string;
  count?: number;
};

export type OpsBuscadorGroup = {
  id: string;
  label: string;
  kind?: OpsBuscadorFilterKind;
  options: OpsBuscadorOption[];
};

export type OpsBuscadorHit = {
  id: string;
  title: string;
  subtitle?: string;
};

export type OpsBuscadorValues = Record<string, string | string[]>;

type Chip = {
  groupId: string;
  value: string;
  kind: OpsBuscadorFilterKind;
  label: string;
};

type SuggestItem =
  | { type: 'filter'; groupId: string; groupLabel: string; value: string; label: string; count: number }
  | { type: 'hit'; id: string; title: string; subtitle?: string }
  | { type: 'text'; query: string; count: number };

function asList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value == null || value === '') return [];
  return [String(value)];
}

function hasValue(value: string | string[] | undefined): boolean {
  return asList(value).length > 0;
}

function selectedChips(groups: OpsBuscadorGroup[], values: OpsBuscadorValues): Chip[] {
  const chips: Chip[] = [];
  for (const group of groups) {
    const kind = group.kind || 'single';
    for (const value of asList(values[group.id])) {
      const option = group.options.find((row) => row.value === value);
      chips.push({
        groupId: group.id,
        value,
        kind,
        label: `${group.label}: ${option?.label || value}`,
      });
    }
  }
  return chips;
}

function nextFilterValue(
  kind: OpsBuscadorFilterKind,
  current: string | string[] | undefined,
  next: string
): string | string[] {
  if (kind === 'multi') {
    const list = asList(current);
    return list.includes(next) ? list.filter((value) => value !== next) : [...list, next];
  }
  return String(current || '') === String(next) ? '' : next;
}

function formatCount(value: number) {
  return Number(value || 0).toLocaleString();
}

function SuggestButton({
  active,
  onHover,
  onSelect,
  children,
}: {
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
        active ? 'bg-codiva-primary/10 text-zinc-900' : 'text-zinc-800 hover:bg-zinc-50'
      }`}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      {children}
    </button>
  );
}

export default function OpsBuscador({
  query = '',
  onQueryChange,
  placeholder,
  searchAriaLabel,
  groups = [],
  values = {},
  onChange,
  onClearAll,
  catalogCount = 0,
  matchedCount = 0,
  noun,
  nounOne,
  actions,
  extra,
  tools,
  toolsBadge,
  hits = [],
  onHitSelect,
  empty,
}: {
  query?: string;
  onQueryChange?: (value: string) => void;
  placeholder: string;
  searchAriaLabel?: string;
  groups?: OpsBuscadorGroup[];
  values?: OpsBuscadorValues;
  onChange?: (groupId: string, value: string | string[]) => void;
  onClearAll?: () => void;
  catalogCount?: number;
  matchedCount?: number;
  noun: string;
  nounOne: string;
  actions?: ReactNode;
  extra?: ReactNode;
  tools?: ReactNode;
  toolsBadge?: ReactNode;
  hits?: OpsBuscadorHit[];
  onHitSelect?: (id: string) => void;
  empty?: ReactNode;
}) {
  const { t } = useTranslation();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<'suggest' | 'filters'>('suggest');
  const [activeIndex, setActiveIndex] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const compact = (collapsed || stuck) && !pinnedOpen;
  const chips = useMemo(() => selectedChips(groups, values), [groups, values]);
  const hasFilters = groups.length > 0;
  const hasTools = tools != null;
  const constrained = Boolean(query.trim()) || chips.length > 0;
  const filterSuggests = useMemo(() => rankedFilterSuggestions(query, groups), [query, groups]);
  const suggestions = useMemo<SuggestItem[]>(() => {
    const items: SuggestItem[] = filterSuggests.map((row) => ({ type: 'filter', ...row }));
    for (const hit of hits.slice(0, 8)) {
      items.push({ type: 'hit', id: hit.id, title: hit.title, subtitle: hit.subtitle });
    }
    const trimmed = query.trim();
    if (trimmed) items.push({ type: 'text', query: trimmed, count: matchedCount });
    return items;
  }, [filterSuggests, hits, query, matchedCount]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextStuck = Boolean(entry) && !entry.isIntersecting;
        setStuck(nextStuck);
        if (!nextStuck) setPinnedOpen(false);
      },
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open, panel]);

  function setFilter(group: OpsBuscadorGroup, value: string) {
    onChange?.(group.id, nextFilterValue(group.kind || 'single', values[group.id], value));
  }

  function expandIfCompact() {
    if (!compact) return;
    if (collapsed) setCollapsed(false);
    if (stuck) setPinnedOpen(true);
  }

  function toggleCompact() {
    if (compact) {
      expandIfCompact();
      return;
    }
    setPinnedOpen(false);
    if (!collapsed) setCollapsed(true);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (open) {
        setOpen(false);
        return;
      }
      if (query) onQueryChange?.('');
      else if (chips.length) onClearAll?.();
      return;
    }
    if (event.key === 'ArrowDown' && open && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(suggestions.length - 1, index + 1));
      return;
    }
    if (event.key === 'ArrowUp' && open && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (open && panel === 'suggest' && suggestions[activeIndex]) {
      choose(suggestions[activeIndex]);
      return;
    }
    setOpen(false);
  }

  function choose(item: SuggestItem) {
    if (item.type === 'text') {
      setOpen(false);
      return;
    }
    if (item.type === 'hit') {
      onHitSelect?.(item.id);
      setOpen(false);
      return;
    }
    const group = groups.find((row) => row.id === item.groupId);
    if (!group) return;
    setFilter(group, item.value);
    onQueryChange?.('');
    setOpen(false);
  }

  const showing = constrained
    ? t('ops.buscador.showingFiltered', { shown: formatCount(matchedCount), total: formatCount(catalogCount), noun })
    : t('ops.buscador.showingRest', { count: formatCount(catalogCount || matchedCount), noun });
  const listOpen = open && !compact;
  const showSuggest = listOpen && panel === 'suggest' && Boolean(query.trim());
  const showFilters = listOpen && panel === 'filters' && hasFilters;

  return (
    <div ref={rootRef}>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      <div className={`rounded-xl border border-zinc-200 bg-white p-3 ${compact ? 'sticky top-0 z-20 space-y-0' : 'space-y-3'}`}>
        <div className={compact ? 'flex min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center' : 'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'}>
          <div className={compact ? 'flex min-w-0 items-center gap-1.5 lg:contents' : 'contents'}>
            <div className={compact ? 'relative flex min-w-0 flex-1 items-center gap-1.5' : 'relative flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center'}>
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
                <input
                  ref={inputRef}
                  type="search"
                  role="combobox"
                  aria-expanded={listOpen}
                  aria-controls={listboxId}
                  aria-autocomplete="list"
                  value={query}
                  placeholder={placeholder}
                  aria-label={searchAriaLabel || placeholder}
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-codiva-primary focus:ring-2 focus:ring-codiva-primary/20"
                  onChange={(event) => {
                    onQueryChange?.(event.target.value);
                    setPanel('suggest');
                    setOpen(true);
                  }}
                  onFocus={() => {
                    if (query.trim()) {
                      setPanel('suggest');
                      setOpen(true);
                    }
                  }}
                  onKeyDown={onKeyDown}
                />
              </div>
              {hasFilters ? (
                <button
                  type="button"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  aria-expanded={showFilters}
                  onClick={() => {
                    setToolsOpen(false);
                    setPanel('filters');
                    setOpen((current) => (panel !== 'filters' ? true : !current));
                    expandIfCompact();
                  }}
                >
                  {compact ? <ListFilter className="h-4 w-4 lg:hidden" aria-hidden /> : null}
                  <span className={compact ? 'sr-only lg:not-sr-only' : undefined}>{t('ops.buscador.filtersButton')}</span>
                  {chips.length ? <span className="ml-1 tabular-nums text-xs text-zinc-500">({chips.length})</span> : null}
                  <ChevronDown className={`ml-1 h-4 w-4 ${compact ? 'max-lg:hidden' : ''}`} aria-hidden />
                </button>
              ) : null}
              {hasTools ? (
                <button
                  type="button"
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                  aria-expanded={toolsOpen}
                  onClick={() => {
                    const next = !toolsOpen;
                    if (next) setOpen(false);
                    setToolsOpen(next);
                  }}
                >
                  <span>{t('ops.buscador.toolsButton')}</span>
                  {toolsBadge}
                  <ChevronDown className={`ml-1 h-4 w-4 ${toolsOpen ? 'rotate-180' : ''}`} aria-hidden />
                </button>
              ) : null}
              {compact ? <p className="hidden min-w-0 truncate text-xs text-zinc-500 lg:block">{showing}</p> : null}
              {listOpen ? (
                <div
                  id={listboxId}
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[min(24rem,70vh)] overflow-auto rounded-xl border border-zinc-200 bg-white p-3"
                >
                  {showSuggest ? (
                    <ul className="space-y-1">
                      {suggestions.map((item, index) => {
                        const active = index === activeIndex;
                        if (item.type === 'text') {
                          return (
                            <li key="text">
                              <SuggestButton active={active} onHover={() => setActiveIndex(index)} onSelect={() => choose(item)}>
                                <span>{t('ops.buscador.searchText', { query: item.query })}</span>
                                <span className="tabular-nums text-xs text-zinc-500">{formatCount(item.count)}</span>
                              </SuggestButton>
                            </li>
                          );
                        }
                        if (item.type === 'hit') {
                          return (
                            <li key={`hit:${item.id}`}>
                              <SuggestButton active={active} onHover={() => setActiveIndex(index)} onSelect={() => choose(item)}>
                                <span className="min-w-0">
                                  <span className="block truncate font-medium">
                                    <OpsHighlight text={item.title} query={query} />
                                  </span>
                                  {item.subtitle ? (
                                    <span className="mt-0.5 block truncate text-xs text-zinc-500">{item.subtitle}</span>
                                  ) : null}
                                </span>
                              </SuggestButton>
                            </li>
                          );
                        }
                        return (
                          <li key={`${item.groupId}:${item.value}`}>
                            <SuggestButton active={active} onHover={() => setActiveIndex(index)} onSelect={() => choose(item)}>
                              <span>
                                <span className="font-medium">
                                  {item.groupLabel}: {item.label}
                                </span>
                                <span className="ml-2 text-xs text-zinc-500">{t('ops.buscador.applyFilter')}</span>
                              </span>
                              <span className="tabular-nums text-xs text-zinc-500">{formatCount(item.count)}</span>
                            </SuggestButton>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  {showFilters ? (
                    <div className="space-y-4">
                      {groups.map((group) => (
                        <fieldset key={group.id} className="min-w-0">
                          <legend className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            {group.label}
                          </legend>
                          <ul className="mt-2 space-y-1">
                            {group.options.map((option) => {
                              const selected =
                                group.kind === 'multi'
                                  ? asList(values[group.id]).includes(option.value)
                                  : String(values[group.id] || '') === option.value;
                              return (
                                <li key={option.value}>
                                  <button
                                    type="button"
                                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm ${
                                      selected ? 'bg-codiva-primary/10 font-medium text-zinc-900' : 'text-zinc-800 hover:bg-zinc-50'
                                    }`}
                                    onClick={() => setFilter(group, option.value)}
                                  >
                                    <span>{option.label}</span>
                                    <span className="tabular-nums text-xs text-zinc-500">{formatCount(option.count || 0)}</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </fieldset>
                      ))}
                      <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-3">
                        <button type="button" className="text-sm font-medium text-codiva-primary" onClick={() => onClearAll?.()}>
                          {t('ops.buscador.clearAll')}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                          onClick={() => setOpen(false)}
                        >
                          {t('ops.buscador.apply')}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {actions ? <div className={compact ? 'max-lg:w-full' : 'flex flex-wrap items-center gap-2'}>{actions}</div> : null}
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-800 lg:h-9 lg:w-9"
              aria-expanded={!compact}
              aria-label={compact ? t('ops.buscador.expandAria') : t('ops.buscador.collapseAria')}
              onClick={toggleCompact}
            >
              {compact ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronUp className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>

        {!compact && chips.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <button
                key={`${chip.groupId}:${chip.value}`}
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-800"
                aria-label={t('ops.buscador.chipRemoveAria', { label: chip.label })}
                onClick={() => {
                  const group = groups.find((row) => row.id === chip.groupId);
                  if (group) setFilter(group, chip.value);
                }}
              >
                {chip.label}
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ))}
            <button type="button" className="text-xs font-semibold text-codiva-primary" onClick={() => onClearAll?.()}>
              {t('ops.buscador.clearAll')}
            </button>
          </div>
        ) : null}

        {compact ? null : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600">
            <p>
              {showing}
              {extra}
            </p>
          </div>
        )}

        {hasTools && toolsOpen ? <div className="border-t border-zinc-200 pt-3">{tools}</div> : null}
        {empty && catalogCount > 0 && matchedCount === 0 ? empty : null}
      </div>
    </div>
  );
}

export function hasBuscadorValue(value: string | string[] | undefined) {
  return hasValue(value);
}
