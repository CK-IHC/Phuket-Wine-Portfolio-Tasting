import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { usePrint } from '../../context/PrintContext';
import { api } from '../../lib/api';
import type { FormField, Registration } from '../../lib/types';
import { formatSubmitted } from '../../lib/format';
import { exportRowsToExcel } from '../../lib/exportExcel';
import { Button } from '../../components/ui/Button';
import { StatusTag } from '../../components/ui/StatusTag';
import { EditRegistrationDialog } from '../../components/EditRegistrationDialog';

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
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingReg, setEditingReg] = useState<Registration | null>(null);

  useEffect(() => {
    Promise.all([api.getRegistrations(), api.getFormFields()])
      .then(([regData, fieldData]) => { setRegs(regData); setFields(fieldData); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // One column per question (skip the QR field — it isn't an answer).
  const questionFields = useMemo(() => fields.filter((f) => f.type !== 'qr'), [fields]);

  const isAllSelected = regs.length > 0 && regs.every((r) => selectedIds.has(r.id));
  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? new Set() : new Set(regs.map((r) => r.id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runPrint = () => {
    const rows = selectedIds.size ? regs.filter((r) => selectedIds.has(r.id)) : regs;
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
    const rows = selectedIds.size ? regs.filter((r) => selectedIds.has(r.id)) : regs;
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
            {regs.map((r) => (
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
      {editingReg && (
        <EditRegistrationDialog registration={editingReg} onClose={() => setEditingReg(null)} onSave={saveEdit} />
      )}
    </div>
  );
}
