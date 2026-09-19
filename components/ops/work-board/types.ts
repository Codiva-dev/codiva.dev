import { type WorkProcessKind } from '@/lib/ops/work-board';

export type ProcessOption = {
  id: string;
  kind: Exclude<WorkProcessKind, 'none'>;
  label: string;
};

export function dueInputValue(iso: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10);
}
