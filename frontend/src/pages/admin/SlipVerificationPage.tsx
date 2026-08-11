import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import type { Registration } from '../../lib/types';
import { formatSubmitted } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Lightbox } from '../../components/ui/Lightbox';

export function SlipVerificationPage() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [slipReg, setSlipReg] = useState<Registration | null>(null);

  useEffect(() => {
    api.getRegistrations().then((data) => { setRegs(data); setLoading(false); });
  }, []);

  const pending = regs.filter((r) => r.status === 'pending');

  const approve = async (r: Registration) => {
    await api.approveRegistration(r.refNo);
    setRegs((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'approved' } : x)));
    toast(t('toastApproved'));
  };

  const confirmReject = async (r: Registration) => {
    const reason = reasons[r.id] || '';
    await api.rejectRegistration(r.refNo, reason);
    setRegs((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'rejected', rejectReason: reason } : x)));
    setRejectingId(null);
    toast(t('toastRejected'));
  };

  if (loading) return <p className="text-muted">{t('loading')}</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{t('verifyTitle')}</h2>
      {pending.length === 0 && <p className="text-muted">{t('noPending')}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 14 }}>
        {pending.map((r) => (
          <div key={r.id} className="card" style={{ gap: 10 }}>
            <div
              style={{ width: '100%', aspectRatio: '4/3', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
              onClick={() => setSlipReg(r)}
            >
              {r.slipUrl ? (
                <img src={r.slipUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span className="text-muted" style={{ fontSize: 12, fontFamily: 'monospace' }}>SLIP IMAGE</span>
              )}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16 }}>{r.refNo} — {r.name}</div>
              <div className="text-muted" style={{ fontSize: 12 }}>{r.phone} · {t('submittedLabel')} {formatSubmitted(r.submittedAt, lang)}</div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{r.wines.join(', ') || '-'}</div>
            </div>
            {rejectingId === r.id ? (
              <>
                <textarea
                  className="input"
                  placeholder={t('rejectReasonPlaceholder')}
                  value={reasons[r.id] || ''}
                  onChange={(e) => setReasons((prev) => ({ ...prev, [r.id]: e.target.value }))}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" style={{ flex: 1 }} onClick={() => setRejectingId(null)}>{t('cancelBtn')}</Button>
                  <Button variant="primary" style={{ flex: 1 }} onClick={() => confirmReject(r)}>{t('confirmRejectBtn')}</Button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" style={{ flex: 1 }} onClick={() => setRejectingId(r.id)}>{t('rejectBtn')}</Button>
                <Button variant="primary" style={{ flex: 1 }} onClick={() => approve(r)}>{t('approveBtn')}</Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {slipReg && (
        <Lightbox src={slipReg.slipUrl || undefined} fallbackLabel={`SLIP IMAGE — ${slipReg.refNo}`} onClose={() => setSlipReg(null)} />
      )}
    </div>
  );
}
