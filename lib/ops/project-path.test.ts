import { describe, expect, it } from 'vitest';
import { isUuid, opsProjectPath } from './project-path';

describe('opsProjectPath', () => {
  it('builds staff URLs with the project slug', () => {
    expect(opsProjectPath('nirc')).toBe('/projects/nirc');
    expect(opsProjectPath('nirc', '?tab=sprints')).toBe('/projects/nirc?tab=sprints');
    expect(opsProjectPath('nirc', '?tab=sprints&sprint=b1')).toBe('/projects/nirc?tab=sprints&sprint=b1');
    expect(opsProjectPath('nirc', '/arquitectura/abc')).toBe('/projects/nirc/arquitectura/abc');
  });

  it('recognizes UUID params so they can redirect to the slug', () => {
    expect(isUuid('b0000001-0001-4000-8000-00000000000b')).toBe(true);
    expect(isUuid('nirc')).toBe(false);
  });
});
