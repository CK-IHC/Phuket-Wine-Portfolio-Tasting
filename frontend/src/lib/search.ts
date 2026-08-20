/** Case-insensitive substring match across a handful of fields — tolerant
 * of any field being missing or not actually a string (unexpected backend
 * data shape, a row from an older schema, etc.) so one bad row can never
 * throw mid-filter and take down the whole page. */
export function matchesQuery(query: string, ...values: unknown[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some((v) => String(v ?? '').toLowerCase().includes(q));
}
