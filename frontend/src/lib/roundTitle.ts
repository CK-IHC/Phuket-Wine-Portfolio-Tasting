import type { EventRound } from './types';

/** Shown when no round has a title set yet (e.g. before the first round is
 * created), so the nav bar never renders blank. */
export const DEFAULT_EVENT_TITLE = 'Phuket Wine Portfolio Tasting';

/** The user and admin nav bars, and the QR/entry cards, all share one brand
 * title instead of a hardcoded string — each round can set its own via the
 * "Event Title" field, so the app can be reused across different-branded
 * events without touching code. With no single "current round" in scope
 * (e.g. the top nav bar), prefer whichever round is open for registration,
 * else the most recent one by date. */
export function primaryEventTitle(rounds: EventRound[] | null | undefined): string {
  const withTitle = (rounds || []).filter((r) => r.title && r.title.trim());
  if (!withTitle.length) return DEFAULT_EVENT_TITLE;
  const open = withTitle.find((r) => r.status === 'open');
  if (open) return open.title;
  return [...withTitle].sort((a, b) => b.date.localeCompare(a.date))[0].title;
}
