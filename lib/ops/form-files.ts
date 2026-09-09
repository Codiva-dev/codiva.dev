export const OPS_FORM_MAX_FILES = 20;

export function isFormFile(value: FormDataEntryValue): value is File {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as File;
  if (!(Number(file.size) > 0)) return false;
  if (typeof File !== 'undefined' && value instanceof File) return true;
  return typeof file.name === 'string' && typeof file.arrayBuffer === 'function';
}

export function formFiles(formData: FormData, name = 'file'): File[] {
  return formData.getAll(name).filter(isFormFile);
}

export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim();
  return base || name;
}

export function titlesForUploads(sharedTitle: string, files: File[]): string[] {
  const shared = sharedTitle.trim();
  if (files.length === 0) return shared ? [shared] : [];
  if (files.length === 1) return [shared || titleFromFileName(files[0].name)];
  return files.map((file) => {
    const fromFile = titleFromFileName(file.name);
    return shared ? `${shared} - ${fromFile}` : fromFile;
  });
}
