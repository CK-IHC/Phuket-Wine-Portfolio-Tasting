import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import type { Announcement, BannerAspect } from '../../lib/types';
import { Button } from '../../components/ui/Button';
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

export function AnnouncementsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getAnnouncement().then((data) => { setAnn(data); setLoading(false); });
  }, []);

  const set = (patch: Partial<Announcement>) => setAnn((a) => (a ? { ...a, ...patch } : a));

  const addImage = async (file: File) => {
    if (!ann) return;
    const url = await api.uploadImage(file);
    set({ banners: [...ann.banners, { id: 'banner' + Date.now(), url }] });
  };

  const removeBanner = (id: string) => {
    if (!ann) return;
    set({ banners: ann.banners.filter((b) => b.id !== id) });
  };

  const save = async () => {
    if (!ann) return;
    setSaving(true);
    try {
      await api.saveAnnouncement(ann);
      toast(t('toastAnnounceSaved'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !ann) return <p className="text-muted">{t('loading')}</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{t('announceTitle')}</h2>
      <div className="card" style={{ gap: 14, maxWidth: 640 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label={t('eventDateField')}>
            <input className="input" type="date" value={ann.eventDate} onChange={(e) => set({ eventDate: e.target.value })} />
          </Field>
          <Field label={t('eventStartTimeField')}>
            <input className="input" type="time" value={ann.eventStartTime} onChange={(e) => set({ eventStartTime: e.target.value })} />
          </Field>
          <Field label={t('eventEndTimeField')}>
            <input className="input" type="time" value={ann.eventEndTime} onChange={(e) => set({ eventEndTime: e.target.value })} />
          </Field>
          <Field label={t('eventVenueField')}>
            <input className="input" value={ann.eventVenue} onChange={(e) => set({ eventVenue: e.target.value })} />
          </Field>
        </div>
        <Field label={t('announceTextLabelTh')}>
          <textarea className="input" value={ann.textTh} onChange={(e) => set({ textTh: e.target.value })} />
        </Field>
        <Field label={t('announceTextLabelEn')}>
          <textarea className="input" value={ann.textEn} onChange={(e) => set({ textEn: e.target.value })} />
        </Field>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Field label={t('startDateLabel')}>
            <input className="input" type="date" value={ann.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </Field>
          <Field label={t('endDateLabel')}>
            <input className="input" type="date" value={ann.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </Field>
        </div>
        <div style={{ width: 'fit-content' }}>
          <SegmentedControl
            options={[{ key: 'true', label: t('publishOpt') }, { key: 'false', label: t('hideOpt') }]}
            value={String(ann.published)}
            onChange={(v) => set({ published: v === 'true' })}
          />
        </div>
        <Field label={t('bannerSizeLabel')}>
          <div style={{ width: 'fit-content' }}>
            <SegmentedControl
              options={ASPECT_OPTIONS.map((o) => ({ key: o.key, label: t(o.labelKey) }))}
              value={ann.bannerAspect}
              onChange={(v) => set({ bannerAspect: v })}
            />
          </div>
        </Field>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="card-title">{t('bannerImagesTitle')}</div>
        <div className="text-muted" style={{ fontSize: 12, marginBottom: 10 }}>
          {t('bannerRecommendedSizeLabel')} ({t(ASPECT_OPTIONS.find((o) => o.key === ann.bannerAspect)!.labelKey)}): {BANNER_RECOMMENDED_PX[ann.bannerAspect]}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {ann.banners.map((b, i) => (
            <div key={b.id} style={{ width: 160, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ width: 160, aspectRatio: ann.bannerAspect.replace('/', ' / '), background: 'var(--color-surface)', border: '1px solid var(--color-divider)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {b.url ? (
                  <img src={b.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span className="text-muted" style={{ fontSize: 11 }}>Banner {i + 1}</span>
                    <span className="text-muted" style={{ fontSize: 10 }}>{BANNER_RECOMMENDED_PX[ann.bannerAspect]}</span>
                  </div>
                )}
              </div>
              <button className="btn btn-ghost" onClick={() => removeBanner(b.id)}>{t('removeImageBtn')}</button>
            </div>
          ))}
          <button
            className="btn btn-secondary"
            style={{ width: 160, aspectRatio: ann.bannerAspect.replace('/', ' / ') }}
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
      </div>

      <Button variant="primary" style={{ marginTop: 20 }} onClick={save} disabled={saving}>{t('saveBtn')}</Button>
    </div>
  );
}
