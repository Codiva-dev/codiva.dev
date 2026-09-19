export const WORK_ASSIGNMENT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const WORK_FILE_SIGNED_UPLOAD_EXPIRES_SEC = 60 * 5;

export function workAssignmentFileFolder(assignmentId: string) {
  return `assignments/${assignmentId}`;
}

export function isWorkAssignmentFilePath(assignmentId: string, path: string) {
  if (!WORK_ASSIGNMENT_ID_RE.test(assignmentId)) return false;
  const expected = `${workAssignmentFileFolder(assignmentId)}/`;
  if (!path.startsWith(expected)) return false;
  if (path.includes('..') || path.includes('\\') || path.includes('\0')) return false;
  const rest = path.slice(expected.length);
  return rest.length > 0 && !rest.includes('/');
}
