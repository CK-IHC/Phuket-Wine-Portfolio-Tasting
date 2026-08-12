import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import type { EventRound } from '../../lib/types';
import { formatDateStringOnly } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';

const EMPTY_DRAFT = { name: '', date: '', startTime: '', endTime: '', venue: '', capacity: '0' };

export function RoundsPage() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [rounds, setRounds] = useState<EventRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  useEffect(() => {
    api.getRounds()
      .then((data) => { setRounds(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleStatus = async (r: EventRound) => {
    const status = r.status === 'open' ? 'closed' : 'open';
    await api.updateRound(r.id, { status });
    setRounds((prev) => prev.map((x) => (x.id === r.id ? { ...x, status } : x)));
  };

  const remove = async (r: EventRound) => {
    await api.deleteRound(r.id);
    setRounds((prev) => prev.filter((x) => x.id !== r.id));
    toast(t('toastRoundDeleted'));
  };

  const save = async () => {
    if (!draft.name.trim() || !draft.date) return;
    const round = {
      name: draft.name.trim(), date: draft.date, startTime: draft.startTime, endTime: draft.endTime,
      venue: draft.venue, capacity: Number(draft.capacity) || 0, status: 'closed' as const,
    };
    const id = await api.addRound(round);
    setRounds((prev) => [...prev, { ...round, id }]);
    setAddOpen(false);
    setDraft(EMPTY_DRAFT);
    toast(t('toastRoundAdded'));
  };

  if (loading) return <p className="text-muted">{t('loading')}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>{t('roundsTitle')}</h2>
        <Button variant="primary" onClick={() => setAddOpen(true)}>{t('addRoundBtn')}</Button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>{t('colRoundName')}</th><th>{t('colRoundDate')}</th><th>{t('colRoundTime')}</th>
              <th>{t('colRoundVenue')}</th><th>{t('colRoundCapacity')}</th><th>{t('colRoundStatus')}</th><th />
            </tr>
          </thead>
          <tbody>
            {rounds.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{formatDateStringOnly(r.date, lang)}</td>
                <td>{r.startTime}{r.endTime ? `–${r.endTime}` : ''}</td>
                <td>{r.venue}</td>
                <td>{r.capacity > 0 ? r.capacity.toLocaleString() : '—'}</td>
                <td>
                  <span
                    className={`tag ${r.status === 'open' ? 'tag-status-approved' : 'tag-status-rejected'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleStatus(r)}
                  >
                    {t(r.status === 'open' ? 'roundStatusOpen' : 'roundStatusClosed')}
                  </span>
                </td>
                <td><button className="btn btn-ghost" onClick={() => remove(r)}>{t('deleteBtn')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <Dialog
          title={t('addRoundTitle')}
          onClose={() => setAddOpen(false)}
          actions={<>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>{t('cancelBtn')}</Button>
            <Button variant="primary" onClick={save}>{t('saveBtn')}</Button>
          </>}
        >
          <Field label={t('roundNameLabel')}>
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label={t('roundDateLabel')}>
            <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label={t('roundStartTimeLabel')}>
              <input className="input" type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
            </Field>
            <Field label={t('roundEndTimeLabel')}>
              <input className="input" type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
            </Field>
          </div>
          <Field label={t('roundVenueLabel')}>
            <input className="input" value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} />
          </Field>
          <Field label={t('roundCapacityLabel')}>
            <input className="input" type="number" min={0} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} />
          </Field>
        </Dialog>
      )}
    </div>
  );
}
