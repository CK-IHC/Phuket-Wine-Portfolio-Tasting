import type { Registration } from './types';
import { parseTimestamp } from './format';
import type { Lang } from '../i18n/translations';

const MONTH_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function availableYears(regs: Registration[]): string[] {
  const years = new Set<string>();
  regs.forEach((r) => {
    const d = parseTimestamp(r.submittedAt);
    if (d) years.add(String(d.getFullYear()));
  });
  if (years.size === 0) years.add(String(new Date().getFullYear()));
  return Array.from(years).sort();
}

export function monthlyTrend(regs: Registration[], year: string, lang: Lang): { label: string; value: number }[] {
  const counts = Array(12).fill(0);
  regs.forEach((r) => {
    const d = parseTimestamp(r.submittedAt);
    if (d && String(d.getFullYear()) === year) counts[d.getMonth()] += 1;
  });
  const months = lang === 'th' ? MONTH_TH : MONTH_EN;
  return counts.map((value, i) => ({ label: months[i], value }));
}

export function dailyTrend(regs: Registration[], from: string, to: string): { label: string; value: number }[] {
  const fromD = new Date(from || from === '' ? from : Date.now());
  const toD = new Date(to);
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime()) || toD < fromD) return [];
  const days = Math.min(62, Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1);
  const buckets: { label: string; value: number; key: string }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(fromD);
    d.setDate(fromD.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, value: 0, key });
  }
  regs.forEach((r) => {
    const d = parseTimestamp(r.submittedAt);
    if (!d) return;
    const key = d.toISOString().slice(0, 10);
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.value += 1;
  });
  return buckets.map(({ label, value }) => ({ label, value }));
}

export function yearlyTrend(regs: Registration[]): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  regs.forEach((r) => {
    const d = parseTimestamp(r.submittedAt);
    if (!d) return;
    const y = String(d.getFullYear());
    counts.set(y, (counts.get(y) || 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value }));
}
