'use client';

import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/Input';
import { activeMentionQuery, buildMentionToken, filterMentionableStaff } from '@/lib/ops/work-board';

export type MentionStaff = { id: string; full_name: string; email?: string | null };

export default function OpsMentionComposer({
  value,
  onChange,
  staff,
  excludeUserId,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (next: string) => void;
  staff: MentionStaff[];
  excludeUserId?: string;
  placeholder?: string;
  rows?: number;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const query = useMemo(() => activeMentionQuery(value, caret), [value, caret]);
  const matches = useMemo(
    () => (query ? filterMentionableStaff(staff, query.query, excludeUserId).slice(0, 8) : []),
    [query, staff, excludeUserId]
  );

  function insert(user: MentionStaff) {
    if (!query) return;
    const token = buildMentionToken(user);
    if (!token) return;
    const next = `${value.slice(0, query.start)}${token} ${value.slice(caret)}`;
    const pos = query.start + token.length + 1;
    onChange(next);
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
      setCaret(pos);
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!query || !matches.length) return;
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      insert(matches[0]);
    }
    if (event.key === 'Escape') {
      setCaret(query.start);
    }
  }

  return (
    <div className="relative">
      <Textarea
        ref={areaRef}
        rows={rows}
        size="sm"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setCaret(event.target.selectionStart ?? event.target.value.length);
        }}
        onKeyUp={(event) => setCaret(event.currentTarget.selectionStart ?? 0)}
        onClick={(event) => setCaret(event.currentTarget.selectionStart ?? 0)}
        onKeyDown={onKeyDown}
      />
      {query && matches.length ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
          {matches.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                className="flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-zinc-50"
                onMouseDown={(event) => {
                  event.preventDefault();
                  insert(user);
                }}
              >
                @{user.full_name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
