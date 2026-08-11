import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { usePrint } from '../../context/PrintContext';
import { api } from '../../lib/api';
import type { Registration, RegistrationStatus } from '../../lib/types';
import { formatSubmitted } from '../../lib/format';
import { exportRowsToExcel } from '../../lib/exportExcel';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { StatusTag } from '../../components/ui/StatusTag';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { Lightbox } from '../../components/ui/Lightbox';
import { EditRegistrationDialog } from '../../components/EditRegistrationDialog';

type StatusFilter = 'all' | RegistrationStatus;

export function RegistrationListPage() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const { printNow } = usePrint();

  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailReg, setDetailReg] = useState<Registration | null>(null);
  const [slipReg, setSlipReg] = useState<Registration | null>(null);
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportFrom, setReportFrom] = useState('2026-08-01');
  const [reportTo, setReportTo] = useState('2026-08-31');

  const load = () => api.getRegistrations().then((data) => { setRegs(data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return regs.filter((r) =>
      (statusFilter === 'all' || r.status === statusFilter) &&
      (!q || r.name.toLowerCase().includes(q) || r.phone.includes(q) || r.refNo.toLowerCase().includes(q))
    );
  }, [regs, search, statusFilter]);

  const filteredIds = filtered.map((r) => r.id);
  const isAllFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllFilteredSelected) filteredIds.forEach((id) => next.delete(id));
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

  const total = regs.length;
  const approvedCount = regs.filter((r) => r.status === 'approved').length;
  const pendingCount = regs.filter((r) => r.status === 'pending').length;
  const rejectedCount = regs.filter((r) => r.status === 'rejected').length;
  const revenue = regs.filter((r) => r.status === 'approved').reduce((a, r) => a + r.amount, 0);

  const printSource = () => {
    if (selectedIds.size) return regs.filter((r) => selectedIds.has(r.id));
    if (statusFilter !== 'all') return regs.filter((r) => r.status === statusFilter);
    return regs;
  };

  const runPrint = () => {
    const rows = printSource();
    printNow({
      title: t('listTitle'),
      subtitle: `${reportFrom} – ${reportTo}`,
      columns: [
        { key: 'refNo', label: t('colRef') },
        { key: 'name', label: t('colName') },
        { key: 'phone', label: t('colPhone') },
        { key: 'area', label: t('colArea') },
        { key: 'wines', label: t('colWines') },
        { key: 'amount', label: t('colAmount') },
        { key: 'status', label: t('colStatus') },
      ],
      rows: rows.map((r) => ({
        refNo: r.refNo, name: r.name, phone: r.phone, area: r.area,
        wines: r.wines.join(', ') || '-', amount: `฿${r.amount.toLocaleString()}`,
        status: t(r.status === 'approved' ? 'statApproved' : r.status === 'rejected' ? 'statRejected' : 'statPending'),
      })),
    });
  };

  const exportExcel = () => {
    const rows = selectedIds.size ? regs.filter((r) => selectedIds.has(r.id)) : filtered;
    exportRowsToExcel(
      rows.map((r) => ({
        refNo: r.refNo, name: r.name, phone: r.phone, email: r.email, area: r.area,
        arrival: r.arrival, source: r.source, wines: r.wines.join(', '), prices: r.prices.join(', '),
        amount: r.amount, status: r.status,
      })),
      [
        { key: 'refNo', label: t('colRef') }, { key: 'name', label: t('colName') },
        { key: 'phone', label: t('colPhone') }, { key: 'email', label: t('colEmail') },
        { key: 'area', label: t('colArea') }, { key: 'arrival', label: t('colArrival') },
        { key: 'source', label: t('colSource') }, { key: 'wines', label: t('colWines') },
        { key: 'prices', label: t('colPrices') }, { key: 'amount', label: t('colAmount') },
        { key: 'status', label: t('colStatus') },
      ],
      'registrations.xlsx'
    );
    toast(t('toastExport'));
  };

  const saveEdit = async (patch: Registration) => {
    await api.editRegistration(patch.refNo, patch);
    setRegs((prev) => prev.map((r) => (r.refNo === patch.refNo ? patch : r)));
    setEditingReg(null);
    toast(t('toastSaved'));
  };

  const deleteReg = async (r: Registration) => {
    await api.deleteRegistration(r.refNo);
    setRegs((prev) => prev.filter((x) => x.refNo !== r.refNo));
    toast(t('toastDeleted'));
  };

  if (loading) return <p className="text-muted">{t('loading')}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>{t('listTitle')}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedIds.size > 0 && <Button variant="primary" onClick={runPrint}>{t('printSelectedBtn')}</Button>}
          <Button variant="secondary" onClick={() => setReportOpen(true)}>{t('reportBtn')}</Button>
          <Button variant="secondary" onClick={exportExcel}>{t('exportBtn')}</Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input className="input" style={{ maxWidth: 260 }} type="text" placeholder={t('searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
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
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={isAllFilteredSelected} onChange={toggleSelectAllFiltered} /></th>
              <th>{t('colRef')}</th><th>{t('colName')}</th><th>{t('colPhone')}</th>
              <th>{t('colStatus')}</th><th>{t('colSlip')}</th><th /><th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                <td>{r.refNo}</td>
                <td>{r.name}</td>
                <td>{r.phone}</td>
                <td><StatusTag status={r.status} /></td>
                <td><button className="btn btn-ghost" onClick={() => setSlipReg(r)}>{t('viewSlipBtn')}</button></td>
                <td><button className="btn btn-ghost" onClick={() => setDetailReg(r)}>{t('viewDetailBtn')}</button></td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost" onClick={() => setEditingReg(r)}>{t('editRowBtn')}</button>
                  <button className="btn btn-ghost" onClick={() => deleteReg(r)}>{t('deleteBtn')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailReg && (
        <Dialog title={`${detailReg.refNo} — ${detailReg.name}`} onClose={() => setDetailReg(null)} maxWidth={520} actions={<Button variant="secondary" onClick={() => setDetailReg(null)}>{t('closeBtn')}</Button>}>
          <div>{t('detailPhone')} {detailReg.phone}</div>
          <div>{t('detailEmail')} {detailReg.email}</div>
          <div>{t('detailArea')} {detailReg.area}</div>
          <div>{t('detailArrival')} {detailReg.arrival}</div>
          <div>{t('detailSource')} {detailReg.source}</div>
          <div>{t('detailWines')} {detailReg.wines.join(', ') || '-'}</div>
          <div>{t('detailPrices')} {detailReg.prices.join(', ') || '-'}</div>
          <div>{t('detailAmount')} ฿{detailReg.amount.toLocaleString()}</div>
          <div>{t('detailStatus')} <StatusTag status={detailReg.status} /></div>
          <div className="text-muted" style={{ fontSize: 12 }}>{formatSubmitted(detailReg.submittedAt, lang)}</div>
        </Dialog>
      )}

      {slipReg && (
        <Lightbox src={slipReg.slipUrl || undefined} fallbackLabel={`SLIP IMAGE — ${slipReg.refNo}`} onClose={() => setSlipReg(null)} />
      )}

      {editingReg && (
        <EditRegistrationDialog registration={editingReg} onClose={() => setEditingReg(null)} onSave={saveEdit} />
      )}

      {reportOpen && (
        <Dialog
          title={t('reportTitle')}
          onClose={() => setReportOpen(false)}
          actions={<>
            <Button variant="secondary" onClick={runPrint}>{t('printBtn')}</Button>
            <Button variant="secondary" onClick={() => setReportOpen(false)}>{t('closeBtn')}</Button>
          </>}
        >
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label={t('reportFrom')}><input className="input" type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} /></Field>
            <Field label={t('reportTo')}><input className="input" type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} /></Field>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
            <div>{t('totalCountLine')}: {total} {t('itemsWord')}</div>
            <div>{t('statApproved')}: {approvedCount} · {t('statPending')}: {pendingCount} · {t('statRejected')}: {rejectedCount}</div>
            <div>{t('revenueLine')}: ฿{revenue.toLocaleString()}</div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
