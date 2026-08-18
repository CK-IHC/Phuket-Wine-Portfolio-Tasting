import { Fragment, useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import type { EventRound, Registration } from '../../lib/types';
import { formatSubmitted } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Lightbox } from '../../components/ui/Lightbox';
import { ResilientImage } from '../../components/ResilientImage';

export function SlipVerificationPage() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [slipReg, setSlipReg] = useState<Registration | null>(null);
  const [search, setSearch] = useState('');
  const [rounds, setRounds] = useState<EventRound[]>([]);
  const [roundFilter, setRoundFilter] = useState('all');

  useEffect(() => {
    api.getRegistrations()
      .then((data) => {
        setRegs(data);
        // Amount starts blank on purpose — the admin confirms it fresh by
        // eye against the slip image rather than trusting a pre-filled value.
        setLoading(false);
      })
      .catch(() => setLoading(false));
    api.getRounds().then(setRounds).catch(() => {});
  }, []);

  const allPending = regs.filter((r) => r.status === 'pending');
  const q = search.trim().toLowerCase();
  const pending = allPending.filter((r) =>
    (roundFilter === 'all' || r.roundId === roundFilter) &&
    (!q || r.name.toLowerCase().includes(q) || r.phone.includes(q) || r.refNo.toLowerCase().includes(q))
  );

  const saveAmount = async (r: Registration) => {
    const amount = Number(amounts[r.id]) || 0;
    if (amount === r.amount) return;
    await api.editRegistration(r.refNo, { amount });
    setRegs((prev) => prev.map((x) => (x.id === r.id ? { ...x, amount } : x)));
  };

  const approve = async (r: Registration) => {
    const amount = Number(amounts[r.id]) || 0;
    await api.editRegistration(r.refNo, { amount });
    await api.approveRegistration(r.refNo);
    setRegs((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'approved', amount } : x)));
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
      {allPending.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <input
            className="input"
            style={{ maxWidth: 260 }}
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {rounds.length > 0 && (
            <select className="input" style={{ width: 'auto' }} value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)}>
              <option value="all">{t('filterAllRounds')}</option>
              {rounds.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
        </div>
      )}
      {allPending.length === 0 && <p className="text-muted">{t('noPending')}</p>}
      {allPending.length > 0 && pending.length === 0 && <p className="text-muted">{t('noSearchResults')}</p>}
      {pending.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t('colSlip')}</th>
                <th>{t('colRef')}</th>
                <th>{t('colName')}</th>
                <th>{t('colPhone')}</th>
                <th>{t('colRound')}</th>
                <th>{t('amountTransferredLabel')}</th>
                <th>{t('colStatus')}</th>
                <th>{t('colUploadDate')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td>
                      <div
                        style={{ width: 56, height: 56, background: 'var(--color-surface)', border: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                        onClick={() => setSlipReg(r)}
                      >
                        {r.slipUrl ? (
                          <ResilientImage src={r.slipUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span className="text-muted" style={{ fontSize: 9, fontFamily: 'monospace' }}>SLIP</span>
                        )}
                      </div>
                    </td>
                    <td>{r.refNo}</td>
                    <td>{r.name}</td>
                    <td>{r.phone}</td>
                    <td>{r.roundName || '—'}</td>
                    <td>
                      <input
                        className="input"
                        style={{ width: 130 }}
                        type="number"
                        min={0}
                        placeholder={t('amountTransferredPlaceholder')}
                        value={amounts[r.id] ?? ''}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        onBlur={() => saveAmount(r)}
                      />
                    </td>
                    <td><span className="tag tag-status-pending">{t('statPending')}</span></td>
                    <td>{formatSubmitted(r.submittedAt, lang)}</td>
                    <td>
                      {rejectingId === r.id ? (
                        <Button variant="secondary" onClick={() => setRejectingId(null)}>{t('cancelBtn')}</Button>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button variant="secondary" onClick={() => setRejectingId(r.id)}>{t('rejectBtn')}</Button>
                          <Button variant="primary" onClick={() => approve(r)}>{t('approveBtn')}</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {rejectingId === r.id && (
                    <tr>
                      <td colSpan={9} style={{ background: 'var(--color-surface)' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 0' }}>
                          <textarea
                            className="input"
                            style={{ flex: 1, minHeight: 40 }}
                            placeholder={t('rejectReasonPlaceholder')}
                            value={reasons[r.id] || ''}
                            onChange={(e) => setReasons((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          />
                          <Button variant="primary" onClick={() => confirmReject(r)}>{t('confirmRejectBtn')}</Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {slipReg && (
        <Lightbox src={slipReg.slipUrl || undefined} fallbackLabel={`SLIP IMAGE — ${slipReg.refNo}`} onClose={() => setSlipReg(null)} />
      )}
    </div>
  );
}
