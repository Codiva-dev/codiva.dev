import { describe, expect, it } from 'vitest';
import { opsStorageFileName } from './storage';

describe('opsStorageFileName', () => {
  it('strips accents that Storage rejects as InvalidKey', () => {
    expect(opsStorageFileName('Buscador-07---Viáticos.pdf', 1789580015845)).toBe(
      '1789580015845-buscador-07-viaticos.pdf'
    );
    expect(opsStorageFileName('Buscador-10---Auditoría.pdf', 1)).toBe(
      '1-buscador-10-auditoria.pdf'
    );
    expect(opsStorageFileName('Buscador-14---Reseñas.pdf', 2)).toBe(
      '2-buscador-14-resenas.pdf'
    );
  });

  it('keeps a readable ascii stem and extension', () => {
    expect(opsStorageFileName('Informe final.docx', 9)).toBe('9-informe-final.docx');
  });

  it('ignores path fragments and empty names', () => {
    expect(opsStorageFileName('C:\\\\Users\\\\x\\\\Viáticos.PDF', 3)).toBe('3-viaticos.pdf');
    expect(opsStorageFileName('   ', 4)).toBe('4-file');
    expect(opsStorageFileName('文档', 5)).toBe('5-file');
  });
});
