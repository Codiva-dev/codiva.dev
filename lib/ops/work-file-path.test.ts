import { describe, expect, it } from 'vitest';
import { isWorkAssignmentFilePath, workAssignmentFileFolder } from './work-file-path';

const ID = '7184c174-fa49-4e06-afa8-2406f5915014';

describe('work assignment file paths', () => {
  it('accepts a single object under the assignment folder', () => {
    expect(workAssignmentFileFolder(ID)).toBe(`assignments/${ID}`);
    expect(isWorkAssignmentFilePath(ID, `assignments/${ID}/1789-marca-blanca.pdf`)).toBe(true);
  });

  it('rejects traversal, other assignments, and nested keys', () => {
    expect(isWorkAssignmentFilePath(ID, `assignments/${ID}/../secret.pdf`)).toBe(false);
    expect(isWorkAssignmentFilePath(ID, `assignments/${ID}/nested/file.pdf`)).toBe(false);
    expect(isWorkAssignmentFilePath(ID, 'assignments/other/file.pdf')).toBe(false);
    expect(isWorkAssignmentFilePath('not-a-uuid', `assignments/not-a-uuid/file.pdf`)).toBe(false);
  });
});
