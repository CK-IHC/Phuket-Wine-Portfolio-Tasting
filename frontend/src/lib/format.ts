import type { Lang } from '../i18n/translations';

const MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseTimestamp(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatSubmitted(raw: string | undefined, lang: Lang): string {
  const d = parseTimestamp(raw);
  if (!d) return raw || '-';
  const months = lang === 'th' ? MONTH_TH : MONTH_EN;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateOnly(raw: string | undefined, lang: Lang): string {
  const d = parseTimestamp(raw);
  if (!d) return raw || '-';
  const months = lang === 'th' ? MONTH_TH : MONTH_EN;
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** Formats a date-only "YYYY-MM-DD" string (e.g. from <input type="date">)
 * without going through Date parsing, which shifts by a day near UTC
 * midnight in negative-offset timezones. */
export function formatDateStringOnly(dateStr: string | undefined, lang: Lang): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-').map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return dateStr;
  const months = lang === 'th' ? MONTH_TH : MONTH_EN;
  return `${d} ${months[m - 1]} ${y}`;
}

export function dataAsOfLabel(lang: Lang): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const label = lang === 'th' ? 'ข้อมูล ณ วันที่' : 'Data as of';
  return `${label}: ${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
}
