import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { usePrint } from '../../context/PrintContext';
import { api } from '../../lib/api';
import type { Registration } from '../../lib/types';
import { exportRowsToExcel } from '../../lib/exportExcel';
import { Button } from '../../components/ui/Button';
import { StatusTag } from '../../components/ui/StatusTag';
import { EditRegistrationDialog } from '../../components/EditRegistrationDialog';

export function FormResponsesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { printNow } = usePrint();

  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingReg, setEditingReg] = useState<Registration | null>(null);

  useEffect(() => {
    api.getRegistrations().then((data) => { setRegs(data); setLoading(false); });
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runPrint = () => {
    printNow({
      title: t('tabResponses'),
      columns: [
        { key: 'refNo', label: t('colRef') }, { key: 'email', label: t('colEmail') },
        { key: 'name', label: t('colName') }, { key: 'phone', label: t('colPhone') },
        { key: 'area', label: t('colArea') }, { key: 'arrival', label: t('colArrival') },
        { key: 'source', label: t('colSource') }, { key: 'wines', label: t('colWines') },
        { key: 'prices', label: t('colPrices') }, { key: 'status', label: t('colStatus') },
      ],
      rows: regs.map((r) => ({
        refNo: r.refNo, email: r.email, name: r.name, phone: r.phone, area: r.area,
        arrival: r.arrival, source: r.source, wines: r.wines.join(', ') || '-', prices: r.prices.join(', ') || '-',
        status: t(r.status === 'approved' ? 'statApproved' : r.status === 'rejected' ? 'statRejected' : 'statPending'),
      })),
    });
  };

  const exportExcel = () => {
    const rows = selectedIds.size ? regs.filter((r) => selectedIds.has(r.id)) : regs;
    exportRowsToExcel(
      rows.map((r) => ({
        refNo: r.refNo, email: r.email, name: r.name, phone: r.phone, area: r.area,
        arrival: r.arrival, source: r.source, wines: r.wines.join(', '), prices: r.prices.join(', '), status: r.status,
      })),
      [
        { key: 'refNo', label: t('colRef') }, { key: 'email', label: t('colEmail') },
        { key: 'name', label: t('colName') }, { key: 'phone', label: t('colPhone') },
        { key: 'area', label: t('colArea') }, { key: 'arrival', label: t('colArrival') },
        { key: 'source', label: t('colSource') }, { key: 'wines', label: t('colWines') },
        { key: 'prices', label: t('colPrices') }, { key: 'status', label: t('colStatus') },
      ],
      'form-responses.xlsx'
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
          <Button variant="secondary" onClick={runPrint}>{t('reportBtn')}</Button>
          <Button variant="secondary" onClick={exportExcel}>{t('exportBtn')}</Button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th />
              <th>{t('colRef')}</th><th>{t('colEmail')}</th><th>{t('colName')}</th><th>{t('colPhone')}</th>
              <th>{t('colArea')}</th><th>{t('colArrival')}</th><th>{t('colSource')}</th>
              <th>{t('colWines')}</th><th>{t('colPrices')}</th><th>{t('colStatus')}</th><th />
            </tr>
          </thead>
          <tbody>
            {regs.map((r) => (
              <tr key={r.id}>
                <td><input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                <td>{r.refNo}</td><td>{r.email}</td><td>{r.name}</td><td>{r.phone}</td>
                <td>{r.area}</td><td>{r.arrival}</td><td>{r.source}</td>
                <td>{r.wines.join(', ') || '-'}</td><td>{r.prices.join(', ') || '-'}</td>
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
