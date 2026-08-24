/**
 * Contact is a tall card under a fixed nav: centering leaves the form below the fold.
 */
export function scrollAlignForSection(id) {
  return id === 'contact' ? 'start' : 'center';
}

export function scrollToSection(id, { behavior = 'smooth', align } = {}) {
  const el = document.getElementById(id);
  if (!el) return false;
  const mode = align || scrollAlignForSection(id);
  if (mode === 'start') {
    el.scrollIntoView({ behavior, block: 'start' });
    return true;
  }
  const rect = el.getBoundingClientRect();
  const top = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
  window.scrollTo({
    top: Math.max(0, top),
    behavior,
  });
  return true;
}

/** Scrolls so the section is vertically centered in the viewport. */
export function scrollToSectionCenter(id, behavior = 'smooth') {
  return scrollToSection(id, { behavior, align: 'center' });
}
