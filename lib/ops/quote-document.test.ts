import { describe, expect, it } from 'vitest';
import { renderQuoteDocumentHtml, type QuoteDocumentData } from './index';

const sample: QuoteDocumentData = {
  serviceType: 'Web',
  clientLabel: 'Forever Redwood',
  projectName: 'Forever Redwood',
  clientName: 'Miguel Alonso',
  issuedAt: '2026-09-10',
  serviceDescription: 'Replicación',
  projectState: 'Por iniciar',
  scope: 'Alcance',
  currency: 'MXN',
  totalAmount: 201600,
  lineItems: [
    {
      title: 'Configurador',
      detail: 'Precios en vivo',
      hours: 120,
      rate: 450,
      rateLabel: 'MXN/hora',
      total: 54000,
    },
  ],
};

describe('quote document', () => {
  it('hides hours and hourly rate on the client document', () => {
    const html = renderQuoteDocumentHtml(sample, 'es');
    expect(html).toContain('Configurador');
    expect(html).toMatch(/54[,.]?000/);
    expect(html).not.toContain('MXN/hora');
    expect(html).not.toContain('120 h');
    expect(html).not.toMatch(/>Horas</);
    expect(html).not.toMatch(/>Tarifa</);
  });

  it('keeps hours and rate when staff requests the internal breakdown', () => {
    const html = renderQuoteDocumentHtml(sample, 'es', { showHourlyBreakdown: true });
    expect(html).toContain('120 h');
    expect(html).toContain('MXN/hora');
    expect(html).toMatch(/>Horas</);
    expect(html).toMatch(/>Tarifa</);
  });
});
