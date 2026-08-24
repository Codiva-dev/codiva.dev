/** Local calendar date as YYYY-MM-DD (avoids UTC off-by-one on date inputs). */
export function localIsoDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isIsoDateOnOrAfterToday(value: string, today = localIsoDate()): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today;
}
