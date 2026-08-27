import { describe, expect, it } from 'vitest';
import {
  filterProposalCanvases,
  filterQuoteCanvases,
  getPortalVisibility,
  withQuoteNav,
} from './portal-visibility';

const canvases = [
  { kind: 'architecture' },
  { kind: 'mvp' },
  { kind: 'proposal' },
];

describe('portal canvas split', () => {
  it('keeps architecture on Propuesta and mvp on Cotización when costs are on', () => {
    const visibility = { showQuote: false, showCosts: true };
    expect(filterProposalCanvases(canvases).map((c) => c.kind)).toEqual([
      'architecture',
      'proposal',
    ]);
    expect(filterQuoteCanvases(canvases, visibility).map((c) => c.kind)).toEqual(['mvp']);
  });

  it('hides commercial canvases when costs are off', () => {
    const visibility = { showQuote: false, showCosts: false };
    expect(filterQuoteCanvases(canvases, visibility)).toEqual([]);
  });

  it('opens Cotización nav for an mvp canvas without turning on the quote module', () => {
    const visibility = getPortalVisibility({
      portal_show_quote: false,
      portal_show_costs: true,
    });
    expect(visibility.showQuote).toBe(false);
    expect(withQuoteNav(visibility, true).showQuoteNav).toBe(true);
    expect(withQuoteNav(visibility, false).showQuoteNav).toBe(false);
  });
});
