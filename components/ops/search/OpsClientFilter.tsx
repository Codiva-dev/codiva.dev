'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { textMatches } from '@/lib/ops/search-text';
import EmptyState from '@/components/ui/EmptyState';
import { useTranslation } from 'react-i18next';
import OpsBuscador from './OpsBuscador';

export default function OpsClientFilter<T>({
  items,
  haystack,
  placeholder,
  noun,
  nounOne,
  children,
}: {
  items: T[];
  haystack: (item: T) => string;
  placeholder: string;
  noun: string;
  nounOne: string;
  children: (visible: T[], query: string) => ReactNode;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const visible = useMemo(
    () => (query.trim() ? items.filter((item) => textMatches(haystack(item), query)) : items),
    [items, haystack, query]
  );

  return (
    <div className="space-y-4">
      <OpsBuscador
        query={query}
        onQueryChange={setQuery}
        placeholder={placeholder}
        catalogCount={items.length}
        matchedCount={visible.length}
        noun={noun}
        nounOne={nounOne}
        empty={
          query.trim() ? (
            <EmptyState>
              {t('ops.buscador.undoQueryHint', { noun })}{' '}
              <button type="button" className="font-medium text-codiva-primary" onClick={() => setQuery('')}>
                {t('ops.buscador.clearQuery')}
              </button>
            </EmptyState>
          ) : null
        }
      />
      {children(visible, query)}
    </div>
  );
}
