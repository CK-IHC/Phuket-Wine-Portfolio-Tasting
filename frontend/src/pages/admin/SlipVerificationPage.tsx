import { Fragment, useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { usePrint } from '../../context/PrintContext';
import { api } from '../../lib/api';
import type { EventRound, Registration, RegistrationStatus } from '../../lib/types';
import { formatSubmitted } from '../../lib/format';
import { exportRowsToExcel } from '../../lib/exportExcel';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { StatusTag } from '../../components/ui/StatusTag';
import { Lightbox } from '../../components/ui/Lightbox';
import { ResilientImage } from '../../components/ResilientImage';

export function SlipVerificationPage() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const { printNow } = usePrint();
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus>('pending');
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

  const byStatus = regs.filter((r) => r.status === statusFilter);
  const q = search.trim().toLowerCase();
  const filtered = byStatus.filter((r) =>
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

  const runPrint = () => {
    printNow({
      title: t('verifyTitle'),
      subtitle: t(statusFilter === 'pending' ? 'statPending' : statusFilter === 'approved' ? 'statApproved' : 'statRejected'),
      columns: [
        { key: 'refNo', label: t('colRef') },
        { key: 'name', label: t('colName') },
        { key: 'phone', label: t('colPhone') },
        { key: 'round', label: t('colRound') },
        { key: 'amount', label: t('amountTransferredLabel') },
        { key: 'status', label: t('colStatus') },
        { key: 'uploadDate', label: t('colUploadDate') },
      ],
      rows: filtered.map((r) => ({
        refNo: r.refNo, name: r.name, phone: r.phone, round: r.roundName || '-',
        amount: r.amount ? `฿${r.amount.toLocaleString()}` : '',
        status: t(r.status === 'approved' ? 'statApproved' : r.status === 'rejected' ? 'statRejected' : 'statPending'),
        uploadDate: formatSubmitted(r.submittedAt, lang),
      })),
    });
  };

  const exportExcel = () => {
    exportRowsToExcel(
      filtered.map((r) => ({
        refNo: r.refNo, name: r.name, phone: r.phone, round: r.roundName || '',
        amount: r.amount || '', status: r.status, uploadDate: formatSubmitted(r.submittedAt, lang),
        slipLink: r.slipUrl || '',
      })),
      [
        { key: 'refNo', label: t('colRef') }, { key: 'name', label: t('colName') },
        { key: 'phone', label: t('colPhone') }, { key: 'round', label: t('colRound') },
        { key: 'amount', label: t('amountTransferredLabel') }, { key: 'status', label: t('colStatus') },
        { key: 'uploadDate', label: t('colUploadDate') },
        // Kept last on purpose, per request — every other column is scannable
        // at a glance, the raw link is the one field you'd only need occasionally.
        { key: 'slipLink', label: t('colSlipLink') },
      ],
      'pending-slips.xlsx'
    );
    toast(t('toastExport'));
  };

  if (loading) return <p className="text-muted">{t('loading')}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{t('verifyTitle')}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={runPrint}>{t('reportBtn')}</Button>
          <Button variant="secondary" onClick={exportExcel}>{t('exportBtn')}</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <SegmentedControl
          options={[
            { key: 'pending' as RegistrationStatus, label: t('statPending') },
            { key: 'rejected' as RegistrationStatus, label: t('statRejected') },
            { key: 'approved' as RegistrationStatus, label: t('statApproved') },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
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

      {byStatus.length === 0 && <p className="text-muted">{t('noRecords')}</p>}
      {byStatus.length > 0 && filtered.length === 0 && <p className="text-muted">{t('noSearchResults')}</p>}
      {filtered.length > 0 && (
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
              {filtered.map((r) => (
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
                      {statusFilter === 'pending' ? (
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
                      ) : (
                        r.amount ? `฿${r.amount.toLocaleString()}` : '—'
                      )}
                    </td>
                    <td><StatusTag status={r.status} /></td>
                    <td>{formatSubmitted(r.submittedAt, lang)}</td>
                    <td>
                      {statusFilter === 'pending' && (
                        rejectingId === r.id ? (
                          <Button variant="secondary" onClick={() => setRejectingId(null)}>{t('cancelBtn')}</Button>
                        ) : (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button variant="secondary" onClick={() => setRejectingId(r.id)}>{t('rejectBtn')}</Button>
                            <Button variant="primary" onClick={() => approve(r)}>{t('approveBtn')}</Button>
                          </div>
                        )
                      )}
                      {statusFilter === 'rejected' && r.rejectReason && (
                        <span className="text-muted" style={{ fontSize: 12 }}>{r.rejectReason}</span>
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
