'use client';

import { useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import {
  activeMentionQuery,
  buildMentionToken,
  filterMentionableStaff,
  mentionDisplayName,
  mentionLabelFor,
  mentionSerializedIndex,
  mentionShortName,
  splitMentionTokens,
} from '@/lib/ops/work-board';

export type MentionStaff = { id: string; full_name: string; email?: string | null };

const CHIP_CLASS = 'rounded bg-codiva-primary/10 px-1 font-medium text-codiva-primary';

function createMentionChip(id: string, label: string, title?: string) {
  const chip = document.createElement('span');
  chip.contentEditable = 'false';
  chip.dataset.mentionId = id;
  chip.dataset.mentionLabel = label;
  chip.className = `${CHIP_CLASS} whitespace-nowrap`;
  chip.textContent = `@${label}`;
  if (title) chip.title = title;
  return chip;
}

function serializeEditor(root: HTMLElement) {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/\u00a0/g, ' ');
    if (!(node instanceof HTMLElement)) return '';
    if (node.dataset.mentionId) {
      return buildMentionToken({
        id: node.dataset.mentionId,
        full_name: node.dataset.mentionLabel,
      });
    }
    if (node.tagName === 'BR') return '\n';
    let out = '';
    const children = Array.from(node.childNodes);
    children.forEach((child, index) => {
      const isBlock = child instanceof HTMLElement && (child.tagName === 'DIV' || child.tagName === 'P');
      if (index > 0 && isBlock && !out.endsWith('\n')) out += '\n';
      out += walk(child);
    });
    return out;
  };

  const children = Array.from(root.childNodes);
  if (!children.length) return '';
  if (children.length === 1 && children[0] instanceof HTMLElement && children[0].tagName === 'BR') {
    return '';
  }

  let out = '';
  children.forEach((child, index) => {
    const isBlock = child instanceof HTMLElement && (child.tagName === 'DIV' || child.tagName === 'P');
    if (index > 0 && isBlock && !out.endsWith('\n')) out += '\n';
    out += walk(child);
  });
  return out;
}

function renderValue(root: HTMLElement, value: string, staff: MentionStaff[]) {
  if (!value) {
    root.replaceChildren();
    return;
  }
  const frag = document.createDocumentFragment();
  for (const part of splitMentionTokens(value)) {
    if (part.type === 'text') {
      const lines = part.text.split('\n');
      lines.forEach((line, index) => {
        if (index > 0) frag.appendChild(document.createElement('br'));
        if (line) frag.appendChild(document.createTextNode(line));
      });
      continue;
    }
    const user = staff.find((row) => row.id.toLowerCase() === part.userId);
    const label = mentionLabelFor(part, staff);
    const title = user ? mentionDisplayName(user) : part.label;
    frag.appendChild(createMentionChip(part.userId, label, title !== label ? title : undefined));
  }
  root.replaceChildren(frag);
}

function visualTextBeforeCaret(root: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return '';
  const range = sel.getRangeAt(0);
  if (!root.contains(range.endContainer)) return '';
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.endContainer, range.endOffset);
  return pre.toString().replace(/\u00a0/g, ' ');
}

function setEditorCaret(root: HTMLElement, visualOffset: number) {
  const sel = window.getSelection();
  if (!sel) return;
  let remaining = Math.max(0, visualOffset);

  const place = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const walk = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length;
      if (remaining <= len) {
        place(node, remaining);
        return true;
      }
      remaining -= len;
      return false;
    }
    if (!(node instanceof HTMLElement)) return false;
    if (node.dataset.mentionId) {
      const len = (node.textContent || '').length;
      if (remaining <= len) {
        const range = document.createRange();
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
      remaining -= len;
      return false;
    }
    if (node.tagName === 'BR') {
      if (remaining <= 0) {
        const range = document.createRange();
        range.setStartBefore(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
      remaining -= 1;
      return false;
    }
    for (const child of Array.from(node.childNodes)) {
      if (walk(child)) return true;
    }
    return false;
  };

  if (!walk(root)) {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

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
  const editorRef = useRef<HTMLDivElement>(null);
  const staffRef = useRef(staff);
  const pendingCaretRef = useRef<number | null>(null);
  const [caretText, setCaretText] = useState('');
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  staffRef.current = staff;

  const query = useMemo(() => {
    const found = activeMentionQuery(caretText, caretText.length);
    if (!found || found.start === dismissedAt) return null;
    return found;
  }, [caretText, dismissedAt]);
  const matches = useMemo(
    () => (query ? filterMentionableStaff(staff, query.query, excludeUserId).slice(0, 8) : []),
    [query, staff, excludeUserId]
  );

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (serializeEditor(el) !== value) renderValue(el, value, staffRef.current);
    if (pendingCaretRef.current != null) {
      setEditorCaret(el, pendingCaretRef.current);
      pendingCaretRef.current = null;
      setCaretText(visualTextBeforeCaret(el));
    }
  }, [value]);

  function syncCaret() {
    const el = editorRef.current;
    if (!el) return;
    setCaretText(visualTextBeforeCaret(el));
  }

  function insert(user: MentionStaff) {
    if (!query) return;
    const token = buildMentionToken(user, staff);
    if (!token) return;
    const start = mentionSerializedIndex(value, query.start, staff);
    const end = mentionSerializedIndex(value, caretText.length, staff);
    const label = mentionShortName(user, staff);
    const next = `${value.slice(0, start)}${token} ${value.slice(end)}`;
    pendingCaretRef.current = query.start + `@${label}`.length + 1;
    onChange(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing) return;

    if (
      event.key === 'Enter' &&
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      if (!value.trim()) return;
      event.currentTarget.closest('form')?.requestSubmit();
      return;
    }

    if (query && matches.length && (event.key === 'Enter' || event.key === 'Tab')) {
      event.preventDefault();
      insert(matches[0]);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      document.execCommand('insertText', false, '\n');
      return;
    }

    if (event.key === 'Escape' && query) {
      event.preventDefault();
      setDismissedAt(query.start);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain').replace(/\r\n/g, '\n');
    if (!text) return;
    document.execCommand('insertText', false, text);
  }

  return (
    <div className="relative">
      {!value.trim() && placeholder ? (
        <span className="pointer-events-none absolute left-3 top-2 z-10 text-sm text-zinc-400">{placeholder}</span>
      ) : null}
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        aria-placeholder={placeholder}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'w-full rounded-lg border border-zinc-300 bg-white text-zinc-900 outline-none transition',
          'px-3 py-2 text-sm whitespace-pre-wrap break-words',
          'focus:border-codiva-primary focus:ring-2 focus:ring-codiva-primary/20'
        )}
        style={{ minHeight: `${rows * 1.5 + 1}rem` }}
        onInput={() => {
          const el = editorRef.current;
          if (!el) return;
          onChange(serializeEditor(el));
          syncCaret();
        }}
        onFocus={syncCaret}
        onKeyUp={syncCaret}
        onClick={syncCaret}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
      {query && matches.length ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
          {matches.map((user) => {
            const shortName = mentionShortName(user, staff);
            const fullName = mentionDisplayName(user);
            return (
              <li key={user.id}>
                <button
                  type="button"
                  className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm hover:bg-zinc-50"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insert(user);
                  }}
                >
                  <span className="font-medium text-codiva-primary">@{shortName}</span>
                  {fullName !== shortName ? (
                    <span className="truncate text-xs text-zinc-500">{fullName}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
