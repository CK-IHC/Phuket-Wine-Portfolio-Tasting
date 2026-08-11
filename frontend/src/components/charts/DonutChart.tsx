import { useLanguage } from '../../i18n/LanguageContext';

export function DonutChart({ approved, pending, rejected, total }: { approved: number; pending: number; rejected: number; total: number }) {
  const { t } = useLanguage();
  const pApproved = total ? (approved / total) * 100 : 0;
  const pPending = total ? (pending / total) * 100 : 0;
  const gradient = `conic-gradient(var(--color-accent-600) 0% ${pApproved}%, var(--color-accent-2-300) ${pApproved}% ${pApproved + pPending}%, var(--color-neutral-600) ${pApproved + pPending}% 100%)`;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <div style={{ width: 150, height: 150, borderRadius: '50%', background: total ? gradient : 'var(--color-neutral-200)' }} />
      <div style={{ display: 'flex', gap: 14, fontSize: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span><span style={{ display: 'inline-block', width: 9, height: 9, background: 'var(--color-accent-600)', marginRight: 5 }} />{t('statApproved')} {approved} ({pct(approved)}%)</span>
        <span><span style={{ display: 'inline-block', width: 9, height: 9, background: 'var(--color-accent-2-300)', marginRight: 5 }} />{t('statPending')} {pending} ({pct(pending)}%)</span>
        <span><span style={{ display: 'inline-block', width: 9, height: 9, background: 'var(--color-neutral-600)', marginRight: 5 }} />{t('statRejected')} {rejected} ({pct(rejected)}%)</span>
      </div>
    </div>
  );
}
