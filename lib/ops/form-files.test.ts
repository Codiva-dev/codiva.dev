import { describe, expect, it } from 'vitest';
import { formFiles, titleFromFileName, titlesForUploads } from './form-files';

function file(name: string, body = 'x') {
  return new File([body], name, { type: 'text/plain' });
}

describe('form-files', () => {
  it('reads multiple named files and skips empties', () => {
    const fd = new FormData();
    fd.append('file', file('a.pdf'));
    fd.append('file', file('b.pdf'));
    fd.append('file', new File([], ''));
    expect(formFiles(fd).map((row) => row.name)).toEqual(['a.pdf', 'b.pdf']);
  });

  it('uses the shared title for a single file', () => {
    expect(titlesForUploads('Manual', [file('x.pdf')])).toEqual(['Manual']);
    expect(titlesForUploads('', [file('logo-wordmark.pdf')])).toEqual(['logo-wordmark']);
  });

  it('names each file when several are uploaded', () => {
    expect(titlesForUploads('', [file('a.pdf'), file('b.pdf')])).toEqual(['a', 'b']);
    expect(titlesForUploads('Logo', [file('a.pdf'), file('b.pdf')])).toEqual([
      'Logo - a',
      'Logo - b',
    ]);
  });

  it('keeps a title-only deliverable', () => {
    expect(titlesForUploads('Sitio', [])).toEqual(['Sitio']);
    expect(titleFromFileName('look-and-feel.pdf')).toBe('look-and-feel');
  });
});
