import { describe, expect, it } from 'vitest';
import {
  defaultSprintId,
  filterSprintsByStatus,
  parseSprintStatusFilter,
  projectSprintsSearch,
  querySuffix,
  resolveSelectedSprintId,
  searchSprintItems,
  sprintCoversDate,
  sortSprintsBySchedule,
  type SprintItemRow,
  type SprintRow,
} from './project-sprints';

function sprint(partial: Partial<SprintRow> & Pick<SprintRow, 'id' | 'name'>): SprintRow {
  return {
    goal: '',
    starts_on: null,
    ends_on: null,
    status: 'planned',
    ...partial,
  };
}

function item(partial: Partial<SprintItemRow> & Pick<SprintItemRow, 'id' | 'sprint_id' | 'title'>): SprintItemRow {
  return {
    details: '',
    status: 'todo',
    assignee_id: null,
    ...partial,
  };
}

const nirc: SprintRow[] = [
  sprint({
    id: 'a0',
    name: 'A0 · Kickoff humano',
    status: 'completed',
    starts_on: '2026-08-13',
    ends_on: '2026-08-17',
  }),
  sprint({
    id: 'b5',
    name: 'B5 · UAT / go-live',
    status: 'planned',
    starts_on: '2026-12-08',
    ends_on: '2026-12-21',
  }),
  sprint({
    id: 'b1',
    name: 'B1 · Fundaciones',
    status: 'active',
    starts_on: '2026-08-25',
    ends_on: '2026-09-21',
  }),
  sprint({
    id: 'b2',
    name: 'B2 · Pool + FCFS',
    status: 'active',
    starts_on: '2026-09-22',
    ends_on: '2026-10-19',
  }),
];

describe('sortSprintsBySchedule', () => {
  it('orders by start date, then name, with undated last', () => {
    const rows = sortSprintsBySchedule([
      sprint({ id: 'later', name: 'Zeta', starts_on: '2026-09-01' }),
      sprint({ id: 'none', name: 'Sin fecha' }),
      sprint({ id: 'alpha', name: 'Alpha', starts_on: '2026-09-01' }),
      sprint({ id: 'early', name: 'Early', starts_on: '2026-08-01' }),
    ]);
    expect(rows.map((row) => row.id)).toEqual(['early', 'alpha', 'later', 'none']);
  });
});

describe('sprintCoversDate', () => {
  it('includes the start and end days', () => {
    const row = sprint({ id: 'b1', name: 'B1', starts_on: '2026-08-25', ends_on: '2026-09-21' });
    expect(sprintCoversDate(row, '2026-08-25')).toBe(true);
    expect(sprintCoversDate(row, '2026-09-16')).toBe(true);
    expect(sprintCoversDate(row, '2026-09-21')).toBe(true);
    expect(sprintCoversDate(row, '2026-09-22')).toBe(false);
  });
});

describe('defaultSprintId', () => {
  it('picks the sprint whose window covers today', () => {
    expect(defaultSprintId(nirc, '2026-09-16')).toBe('b1');
  });

  it('falls back to the latest active already started', () => {
    expect(defaultSprintId(nirc, '2026-09-23')).toBe('b2');
  });
});

describe('resolveSelectedSprintId', () => {
  it('keeps a requested sprint that is still visible', () => {
    expect(resolveSelectedSprintId(nirc, 'b5', 'all', '2026-09-16')).toBe('b5');
  });

  it('falls back when the status chip hides the requested sprint', () => {
    expect(resolveSelectedSprintId(nirc, 'b1', 'completed', '2026-09-16')).toBe('a0');
  });
});

describe('parseSprintStatusFilter', () => {
  it('accepts known statuses and defaults to all', () => {
    expect(parseSprintStatusFilter('active')).toBe('active');
    expect(parseSprintStatusFilter('nope')).toBe('all');
    expect(filterSprintsByStatus(nirc, 'planned').map((row) => row.id)).toEqual(['b5']);
  });
});

describe('searchSprintItems', () => {
  const items = [
    item({ id: 'i1', sprint_id: 'b1', title: 'Migrar auth', details: 'Supabase RLS', assignee_id: 'jean' }),
    item({ id: 'i2', sprint_id: 'b2', title: 'Pool FCFS', details: 'Kiosk', assignee_id: 'rafa' }),
  ];
  const nameOf = (id: string | null) => (id === 'jean' ? 'Jean Claude' : 'Rafael');

  it('matches title, details, sprint name and assignee without accents', () => {
    expect(searchSprintItems(nirc, items, 'fundaciones', nameOf).map((hit) => hit.item.id)).toEqual(['i1']);
    expect(searchSprintItems(nirc, items, 'rls', nameOf).map((hit) => hit.item.id)).toEqual(['i1']);
    expect(searchSprintItems(nirc, items, 'claude', nameOf).map((hit) => hit.item.id)).toEqual(['i1']);
  });

  it('returns nothing for a blank query', () => {
    expect(searchSprintItems(nirc, items, '  ', nameOf)).toEqual([]);
  });
});

describe('projectSprintsSearch', () => {
  it('always keeps tab=sprints and omits empty filters', () => {
    expect(projectSprintsSearch({ sprint: 'b1', sprintStatus: 'active', q: ' auth ' })).toBe(
      '?tab=sprints&sprintStatus=active&sprint=b1&q=auth'
    );
    expect(projectSprintsSearch({ sprintStatus: 'all' })).toBe('?tab=sprints');
  });
});

describe('querySuffix', () => {
  it('builds a query string from defined params', () => {
    expect(querySuffix({ tab: 'sprints', sprint: 'b1', empty: '' })).toBe('?tab=sprints&sprint=b1');
    expect(querySuffix({})).toBe('');
  });
});
