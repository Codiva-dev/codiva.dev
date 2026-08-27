export type PortalVisibility = {
  showQuote: boolean;
  showCosts: boolean;
  /** Nav / home card for Cotización: formal quote module or a commercial canvas. */
  showQuoteNav?: boolean;
};

/** Defaults: todo visible (proyectos legacy). */
export function getPortalVisibility(project: {
  portal_show_quote?: boolean | null;
  portal_show_costs?: boolean | null;
}): PortalVisibility {
  const showQuote = project.portal_show_quote !== false;
  return {
    showQuote,
    showCosts: project.portal_show_costs !== false,
    showQuoteNav: showQuote,
  };
}

/** Kinds de canvas que exponen precios / unit economics (viven en Cotización). */
export const COST_DELIVERABLE_KINDS = ['mvp'] as const;

export function isQuoteCanvasKind(kind: string): boolean {
  return (COST_DELIVERABLE_KINDS as readonly string[]).includes(kind);
}

export function filterProposalCanvases<T extends { kind: string }>(items: T[]): T[] {
  return items.filter((item) => !isQuoteCanvasKind(item.kind));
}

export function filterQuoteCanvases<T extends { kind: string }>(
  items: T[],
  visibility: PortalVisibility
): T[] {
  if (!visibility.showCosts) return [];
  return items.filter((item) => isQuoteCanvasKind(item.kind));
}

/** @deprecated Use filterProposalCanvases. Kept so older callers keep architecture-only. */
export function filterClientCanvases<T extends { kind: string }>(
  items: T[],
  _visibility?: PortalVisibility
): T[] {
  return filterProposalCanvases(items);
}

export function withQuoteNav(
  visibility: PortalVisibility,
  hasQuoteCanvas: boolean
): PortalVisibility {
  return {
    ...visibility,
    showQuoteNav: visibility.showQuote || (visibility.showCosts && hasQuoteCanvas),
  };
}
