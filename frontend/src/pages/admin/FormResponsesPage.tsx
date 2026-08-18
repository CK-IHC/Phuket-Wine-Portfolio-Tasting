import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { usePrint } from '../../context/PrintContext';
import { api } from '../../lib/api';
import type { EventRound, FormField, Registration, RegistrationStatus } from '../../lib/types';
import { formatSubmitted, parseTimestamp } from '../../lib/format';
import { exportRowsToExcel } from '../../lib/exportExcel';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { StatusTag } from '../../components/ui/StatusTag';
import { EditRegistrationDialog } from '../../components/EditRegistrationDialog';

type StatusFilter = 'all' | RegistrationStatus;

function answerText(r: Registration, field: FormField): string {
  const v = r.answers ? r.answers[field.id] : undefined;
  if (Array.isArray(v)) return v.join(', ') || '-';
  return v || '-';
}

export function FormResponsesPage() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const { printNow } = usePrint();

  const [regs, setRegs] = useState<Registration[]>([]);
  const [rounds, setRounds] = useState<EventRound[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [search, setSearch] = useState('');
  const [roundFilter, setRoundFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    Promise.all([api.getRegistrations(), api.getFormFields()])
      .then(([regData, fieldData]) => { setRegs(regData); setFields(fieldData); setLoading(false); })
      .catch(() => setLoading(false));
    api.getRounds().then(setRounds).catch(() => {});
  }, []);

  // One column per question (skip the QR field — it isn't an answer).
  const questionFields = useMemo(() => fields.filter((f) => f.type !== 'qr'), [fields]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromD = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toD = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    return regs.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (roundFilter !== 'all' && r.roundId !== roundFilter) return false;
      if (q && !(r.name.toLowerCase().includes(q) || r.phone.includes(q) || r.refNo.toLowerCase().includes(q))) return false;
      if (fromD || toD) {
        const d = parseTimestamp(r.submittedAt);
        if (!d) return false;
        if (fromD && d < fromD) return false;
        if (toD && d > toD) return false;
      }
      return true;
    });
  }, [regs, search, statusFilter, roundFilter, dateFrom, dateTo]);

  const filteredIds = filtered.map((r) => r.id);
  const isAllSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runPrint = () => {
    const rows = selectedIds.size ? regs.filter((r) => selectedIds.has(r.id)) : filtered;
    printNow({
      title: t('tabResponses'),
      columns: [
        { key: 'refNo', label: t('colRef') },
        { key: 'round', label: t('colRound') },
        ...questionFields.map((f) => ({ key: f.id, label: f.label })),
        { key: 'amount', label: t('colAmountTransferred') },
        { key: 'status', label: t('colStatus') },
      ],
      rows: rows.map((r) => ({
        refNo: r.refNo, round: r.roundName || '-',
        ...Object.fromEntries(questionFields.map((f) => [f.id, answerText(r, f)])),
        amount: `฿${r.amount.toLocaleString()}`,
        status: t(r.status === 'approved' ? 'statApproved' : r.status === 'rejected' ? 'statRejected' : 'statPending'),
      })),
    });
  };

  // Full dump matching every column on the backend's Registrations sheet.
  const exportExcel = () => {
    const rows = selectedIds.size ? regs.filter((r) => selectedIds.has(r.id)) : filtered;
    exportRowsToExcel(
      rows.map((r) => ({
        timestamp: formatSubmitted(r.submittedAt, lang), refNo: r.refNo, name: r.name, phone: r.phone,
        email: r.email, area: r.area, arrival: r.arrival, source: r.source,
        wines: r.wines.join(', '), prices: r.prices.join(', '), slipUrl: r.slipUrl,
        amount: r.amount, status: r.status, rejectReason: r.rejectReason || '',
        roundId: r.roundId, roundName: r.roundName,
      })),
      [
        { key: 'timestamp', label: 'Timestamp' }, { key: 'refNo', label: t('colRef') },
        { key: 'name', label: t('colName') }, { key: 'phone', label: t('colPhone') },
        { key: 'email', label: t('colEmail') }, { key: 'area', label: t('colArea') },
        { key: 'arrival', label: t('colArrival') }, { key: 'source', label: t('colSource') },
        { key: 'wines', label: t('colWines') }, { key: 'prices', label: t('colPrices') },
        { key: 'slipUrl', label: 'Slip URL' }, { key: 'amount', label: t('colAmountTransferred') },
        { key: 'status', label: t('colStatus') }, { key: 'rejectReason', label: 'Reject Reason' },
        { key: 'roundId', label: 'Round ID' }, { key: 'roundName', label: t('colRound') },
      ],
      'registrations-full.xlsx'
    );
    toast(t('toastExport'));
  };

  const saveEdit = async (patch: Registration) => {
    await api.editRegistration(patch.refNo, patch);
    setRegs((prev) => prev.map((r) => (r.refNo === patch.refNo ? patch : r)));
    setEditingReg(null);
    toast(t('toastSaved'));
  };

  const remove = async (r: Registration) => {
    await api.deleteRegistration(r.refNo);
    setRegs((prev) => prev.filter((x) => x.refNo !== r.refNo));
    toast(t('toastDeleted'));
  };

  if (loading) return <p className="text-muted">{t('loading')}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>{t('tabResponses')}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={runPrint}>{selectedIds.size ? t('printSelectedBtn') : t('reportBtn')}</Button>
          <Button variant="secondary" onClick={exportExcel}>{t('exportBtn')}</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <input
          className="input"
          style={{ maxWidth: 260 }}
          type="text"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SegmentedControl
          options={[
            { key: 'all' as StatusFilter, label: t('filterAll') },
            { key: 'pending' as StatusFilter, label: t('statPending') },
            { key: 'approved' as StatusFilter, label: t('statApproved') },
            { key: 'rejected' as StatusFilter, label: t('statRejected') },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        {rounds.length > 0 && (
          <select className="input" style={{ width: 'auto' }} value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)}>
            <option value="all">{t('filterAllRounds')}</option>
            {rounds.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input className="input" style={{ width: 'auto' }} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title={t('reportFrom')} />
          <span className="text-muted" style={{ fontSize: 12 }}>–</span>
          <input className="input" style={{ width: 'auto' }} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title={t('reportTo')} />
          {(dateFrom || dateTo) && (
            <button className="btn btn-ghost" onClick={() => { setDateFrom(''); setDateTo(''); }}>{t('clearFilterBtn')}</button>
          )}
        </div>
      </div>

      {regs.length > 0 && filtered.length === 0 && <p className="text-muted">{t('noSearchResults')}</p>}
      {filtered.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} /></th>
                <th>{t('colRef')}</th>
                <th>{t('colRound')}</th>
                {questionFields.map((f) => <th key={f.id}>{f.label}</th>)}
                <th>{t('colAmountTransferred')}</th><th>{t('colStatus')}</th><th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                  <td>{r.refNo}</td>
                  <td>{r.roundName || '-'}</td>
                  {questionFields.map((f) => <td key={f.id}>{answerText(r, f)}</td>)}
                  <td>฿{r.amount.toLocaleString()}</td>
                  <td><StatusTag status={r.status} /></td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost" onClick={() => setEditingReg(r)}>{t('editRowBtn')}</button>
                    <button className="btn btn-ghost" onClick={() => remove(r)}>{t('deleteBtn')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editingReg && (
        <EditRegistrationDialog registration={editingReg} onClose={() => setEditingReg(null)} onSave={saveEdit} />
      )}
    </div>
  );
}
