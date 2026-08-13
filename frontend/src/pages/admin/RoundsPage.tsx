import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import type { BannerAspect, EventRound } from '../../lib/types';
import { formatDateStringOnly } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Field } from '../../components/ui/Field';
import { SegmentedControl } from '../../components/ui/SegmentedControl';

const ASPECT_OPTIONS: { key: BannerAspect; labelKey: 'sizeWide' | 'sizeSquare' | 'sizeClassic' | 'sizeTall' }[] = [
  { key: '16/9', labelKey: 'sizeWide' },
  { key: '1/1', labelKey: 'sizeSquare' },
  { key: '4/3', labelKey: 'sizeClassic' },
  { key: '9/16', labelKey: 'sizeTall' },
];

const BANNER_RECOMMENDED_PX: Record<BannerAspect, string> = {
  '16/9': '1600 × 900 px',
  '1/1': '1080 × 1080 px',
  '4/3': '1200 × 900 px',
  '9/16': '1080 × 1920 px',
};

type Draft = Omit<EventRound, 'id' | 'capacity' | 'status'> & { capacity: string };

const EMPTY_DRAFT: Draft = {
  name: '', date: '', startTime: '', endTime: '', venue: '', capacity: '0',
  textTh: '', textEn: '', banners: [], bannerAspect: '16/9', published: true,
};

export function RoundsPage() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [rounds, setRounds] = useState<EventRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setDialogOpen(true);
  };

  const openEdit = (r: EventRound) => {
    setEditingId(r.id);
    setDraft({
      name: r.name, date: r.date, startTime: r.startTime, endTime: r.endTime, venue: r.venue,
      capacity: String(r.capacity), textTh: r.textTh, textEn: r.textEn,
      banners: r.banners, bannerAspect: r.bannerAspect, published: r.published,
    });
    setDialogOpen(true);
  };

  const addImage = async (file: File) => {
    const url = await api.uploadImage(file, 'Banners');
    setDraft((d) => ({ ...d, banners: [...d.banners, { id: 'banner' + Date.now(), url }] }));
  };

  const removeBanner = (id: string) => {
    setDraft((d) => ({ ...d, banners: d.banners.filter((b) => b.id !== id) }));
  };

  const save = async () => {
    if (!draft.name.trim() || !draft.date) return;
    setSaving(true);
    try {
      const capacity = Number(draft.capacity) || 0;
      if (editingId) {
        const patch = { ...draft, capacity };
        await api.updateRound(editingId, patch);
        setRounds((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...patch } : r)));
      } else {
        const round = { ...draft, capacity, status: 'closed' as const };
        const id = await api.addRound(round);
        setRounds((prev) => [...prev, { ...round, id }]);
      }
      setDialogOpen(false);
      toast(t(editingId ? 'toastSaved' : 'toastRoundAdded'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted">{t('loading')}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>{t('roundsTitle')}</h2>
        <Button variant="primary" onClick={openAdd}>{t('addRoundBtn')}</Button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>{t('colRoundName')}</th><th>{t('colRoundDate')}</th><th>{t('colRoundTime')}</th>
              <th>{t('colRoundVenue')}</th><th>{t('colRoundCapacity')}</th>
              <th>{t('publishedColLabel')}</th><th>{t('colRoundStatus')}</th><th /><th />
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
                <td>{r.published ? t('publishOpt') : t('hideOpt')}</td>
                <td>
                  <span
                    className={`tag ${r.status === 'open' ? 'tag-status-approved' : 'tag-status-rejected'}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleStatus(r)}
                  >
                    {t(r.status === 'open' ? 'roundStatusOpen' : 'roundStatusClosed')}
                  </span>
                </td>
                <td><button className="btn btn-ghost" onClick={() => openEdit(r)}>{t('editRowBtn')}</button></td>
                <td><button className="btn btn-ghost" onClick={() => remove(r)}>{t('deleteBtn')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <Dialog
          title={t(editingId ? 'editRoundTitle' : 'addRoundTitle')}
          onClose={() => setDialogOpen(false)}
          maxWidth={560}
          actions={<>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>{t('cancelBtn')}</Button>
            <Button variant="primary" onClick={save} disabled={saving}>{t('saveBtn')}</Button>
          </>}
        >
          <Field label={t('roundNameLabel')}>
            <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Field label={t('roundDateLabel')}>
              <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </Field>
            <Field label={t('roundStartTimeLabel')}>
              <input className="input" type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} />
            </Field>
            <Field label={t('roundEndTimeLabel')}>
              <input className="input" type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Field label={t('roundVenueLabel')}>
              <input className="input" value={draft.venue} onChange={(e) => setDraft({ ...draft, venue: e.target.value })} />
            </Field>
            <Field label={t('roundCapacityLabel')}>
              <input className="input" type="number" min={0} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} />
            </Field>
          </div>

          <Field label={t('announceTextLabelTh')}>
            <textarea className="input" value={draft.textTh} onChange={(e) => setDraft({ ...draft, textTh: e.target.value })} />
          </Field>
          <Field label={t('announceTextLabelEn')}>
            <textarea className="input" value={draft.textEn} onChange={(e) => setDraft({ ...draft, textEn: e.target.value })} />
          </Field>

          <div style={{ width: 'fit-content' }}>
            <SegmentedControl
              options={[{ key: 'true', label: t('publishOpt') }, { key: 'false', label: t('hideOpt') }]}
              value={String(draft.published)}
              onChange={(v) => setDraft({ ...draft, published: v === 'true' })}
            />
          </div>

          <Field label={t('bannerSizeLabel')}>
            <div style={{ width: 'fit-content' }}>
              <SegmentedControl
                options={ASPECT_OPTIONS.map((o) => ({ key: o.key, label: t(o.labelKey) }))}
                value={draft.bannerAspect}
                onChange={(v) => setDraft({ ...draft, bannerAspect: v })}
              />
            </div>
          </Field>

          <Field label={t('bannerImagesTitle')}>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>
              {t('bannerRecommendedSizeLabel')}: {BANNER_RECOMMENDED_PX[draft.bannerAspect]}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {draft.banners.map((b, i) => (
                <div key={b.id} style={{ width: 110, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ width: 110, aspectRatio: draft.bannerAspect.replace('/', ' / '), background: 'var(--color-surface)', border: '1px solid var(--color-divider)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {b.url ? <img src={b.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span className="text-muted" style={{ fontSize: 10 }}>Banner {i + 1}</span>}
                  </div>
                  <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => removeBanner(b.id)}>{t('removeImageBtn')}</button>
                </div>
              ))}
              <button
                className="btn btn-secondary"
                style={{ width: 110, aspectRatio: draft.bannerAspect.replace('/', ' / ') }}
                onClick={() => fileInputRef.current?.click()}
              >
                {t('addImageBtn')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) addImage(file);
                  e.target.value = '';
                }}
              />
            </div>
          </Field>
        </Dialog>
      )}
    </div>
  );
}
