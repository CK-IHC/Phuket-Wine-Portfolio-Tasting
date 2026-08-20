import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { LangToggle } from '../../components/ui/LangToggle';
import { Button } from '../../components/ui/Button';
import { Blueprint } from '../../components/ui/Blueprint';
import { DynamicFormField, type FieldValue } from '../../components/DynamicFormField';
import { api } from '../../lib/api';
import { buildQrCardBlob } from '../../lib/qrCard';
import { buildEntryCardBlob } from '../../lib/entryCard';
import { saveImageFromUrl } from '../../lib/saveImage';
import { DEFAULT_EVENT_TITLE } from '../../lib/roundTitle';
import { formatDateStringOnly } from '../../lib/format';
import type { EventRound, FormField } from '../../lib/types';

export function RegisterPage() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedRoundId = searchParams.get('round') || '';

  const [fields, setFields] = useState<FormField[]>([]);
  const [rounds, setRounds] = useState<EventRound[]>([]);
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [selectedRoundId, setSelectedRoundId] = useState('');
  const [answers, setAnswers] = useState<Record<string, FieldValue>>({});
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refNo, setRefNo] = useState<string | null>(null);
  const [qrCardUrl, setQrCardUrl] = useState<string | null>(null);
  const [entryCardUrl, setEntryCardUrl] = useState<string | null>(null);

  useEffect(() => {
    api.getFormFields().then(setFields).catch(() => {});
    api.getRounds()
      .then((data) => {
        setRounds(data);
        const open = data.filter((r) => r.status === 'open');
        if (preselectedRoundId && open.some((r) => r.id === preselectedRoundId)) {
          setSelectedRoundId(preselectedRoundId);
        } else if (open.length === 1) {
          setSelectedRoundId(open[0].id);
        }
        setLoadingRounds(false);
      })
      .catch(() => setLoadingRounds(false));
  }, []);

  const openRounds = rounds.filter((r) => r.status === 'open');
  const selectedRound = openRounds.find((r) => r.id === selectedRoundId) || null;

  const setAnswer = (id: string, value: FieldValue) => setAnswers((s) => ({ ...s, [id]: value }));

  const handleSlipFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSlipPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const downloadQr = async (field: FormField) => {
    if (!field.qrUrl) {
      toast(t('toastNoQr'));
      return;
    }
    try {
      const blob = await buildQrCardBlob({
        qrUrl: field.qrUrl,
        caption: field.qrCaption,
        heading: selectedRound?.title || DEFAULT_EVENT_TITLE,
      });
      setQrCardUrl(URL.createObjectURL(blob));
    } catch {
      setQrCardUrl(field.qrUrl);
    }
  };

  const closeQrCard = () => {
    if (qrCardUrl) URL.revokeObjectURL(qrCardUrl);
    setQrCardUrl(null);
  };

  const saveQrCard = () => qrCardUrl && saveImageFromUrl(qrCardUrl, 'payment-qr-card.png', () => toast(t('toastLongPressSave')));
  const saveEntryCard = () => entryCardUrl && saveImageFromUrl(entryCardUrl, 'entry-card.png', () => toast(t('toastLongPressSave')));

  // Status is always "pending" the instant a registration is submitted —
  // no admin has reviewed the slip yet — so the card must say that, not
  // claim the payment is already verified.
  useEffect(() => {
    if (!refNo) return;
    let cancelled = false;
    const name = (answers['f2'] as string) || '';
    buildEntryCardBlob({
      eventTitle: selectedRound?.title || DEFAULT_EVENT_TITLE,
      cardLabel: t('entryCardLabel'),
      statusPillText: t('entryStatusPillSuccess'),
      refNoLabel: t('entryRefNoLabel'),
      refNo,
      name,
      eventInfoLabel: t('entryInfoTitle'),
      dateLabel: t('entryDateLabel'),
      dateValue: selectedRound ? formatDateStringOnly(selectedRound.date, lang) : '',
      timeLabel: t('entryTimeLabel'),
      timeValue: selectedRound ? `${selectedRound.startTime}${selectedRound.endTime ? '–' + selectedRound.endTime : ''}` : '',
      venueLabel: t('entryVenueLabel'),
      venueValue: selectedRound?.venue || '',
      footerNote: t('entryFooterNote'),
    })
      .then((blob) => { if (!cancelled) setEntryCardUrl(URL.createObjectURL(blob)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [refNo]);

  const submit = async () => {
    if (openRounds.length > 1 && !selectedRound) {
      setError(t('chooseRoundLabel'));
      return;
    }
    for (const f of fields) {
      if (!f.required || f.type === 'qr') continue;
      const v = answers[f.id];
      const empty = f.type === 'checkbox' ? !(Array.isArray(v) && v.length) : !v;
      if (empty) {
        setError(`${t('errFieldRequiredPrefix')} "${f.label}" ${t('errFieldRequiredSuffix')}`.trim());
        return;
      }
    }
    if (!slipFile) {
      setError(t('errSlipRequired'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const get = (id: string) => (answers[id] as string) || '';
      const getArr = (id: string) => (answers[id] as string[]) || [];
      const newRefNo = await api.submitRegistration({
        name: get('f2'),
        phone: get('f3'),
        email: get('f1'),
        area: get('f5'),
        arrival: get('f6'),
        source: get('f7'),
        wines: getArr('f8'),
        prices: getArr('f9'),
        amount: 1500,
        roundId: selectedRound?.id || '',
        roundName: selectedRound?.name || '',
        answers: Object.fromEntries(Object.entries(answers).filter(([, v]) => v !== undefined)) as Record<string, string | string[]>,
        slip: slipFile,
      });
      setRefNo(newRefNo);
    } catch {
      setError(lang === 'th' ? 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่' : 'Submission failed, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  if (refNo) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <nav className="nav" style={{ borderBottom: '1px solid var(--color-divider)' }}>
          <Button variant="ghost" onClick={() => navigate('/')}>{t('backHome')}</Button>
          <LangToggle />
        </nav>
        <div style={{ maxWidth: 380, margin: '40px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <h2 style={{ margin: 0, textAlign: 'center' }}>{t('successTitle')}</h2>
          {entryCardUrl ? (
            <img src={entryCardUrl} style={{ width: '100%', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)' }} />
          ) : (
            <p className="text-muted">{t('loading')}</p>
          )}
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <Button variant="secondary" block onClick={() => navigate('/')}>{t('backHomeBtn')}</Button>
            <Button variant="primary" block onClick={saveEntryCard} disabled={!entryCardUrl}>{t('downloadEntryCardBtn')}</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingRounds) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <nav className="nav" style={{ borderBottom: '1px solid var(--color-divider)' }}>
          <Button variant="ghost" onClick={() => navigate('/')}>{t('backHome')}</Button>
          <LangToggle />
        </nav>
        <p className="text-muted" style={{ textAlign: 'center', marginTop: 60 }}>{t('loading')}</p>
      </div>
    );
  }

  if (openRounds.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
        <nav className="nav" style={{ borderBottom: '1px solid var(--color-divider)' }}>
          <Button variant="ghost" onClick={() => navigate('/')}>{t('backHome')}</Button>
          <LangToggle />
        </nav>
        <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px' }}>
          <Blueprint className="card" style={{ textAlign: 'center', gap: 10, padding: '32px 20px' }}>
            <p>{t('noRoundOpenMessage')}</p>
            <Button variant="secondary" onClick={() => navigate('/')}>{t('backHomeBtn')}</Button>
          </Blueprint>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <nav className="nav" style={{ borderBottom: '1px solid var(--color-divider)' }}>
        <Button variant="ghost" onClick={() => navigate('/')}>{t('backHome')}</Button>
        <LangToggle />
      </nav>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 60px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>{t('formTitle')}</h1>
          <p className="text-muted">{t('formSubtitle')}</p>
        </div>

        {openRounds.length > 1 && (
          <div className="field">
            <label style={{ fontSize: 17, fontWeight: 700 }}>{t('chooseRoundLabel')} *</label>
            <select className="input" value={selectedRoundId} onChange={(e) => setSelectedRoundId(e.target.value)}>
              <option value="">…</option>
              {openRounds.map((r) => (
                <option key={r.id} value={r.id}>{r.name} — {r.date}</option>
              ))}
            </select>
          </div>
        )}

        {fields.map((f) => (
          <DynamicFormField
            key={f.id}
            field={f}
            value={answers[f.id]}
            onChange={(v) => setAnswer(f.id, v)}
            onDownloadQr={f.type === 'qr' ? () => downloadQr(f) : undefined}
          />
        ))}

        <div className="field">
          <label style={{ fontSize: 17, fontWeight: 700 }}>{t('slipLabel')} *</label>
          <div style={{ border: '2px dashed var(--color-divider)', borderRadius: 'var(--radius-md)', padding: 18, textAlign: 'center', position: 'relative', background: 'var(--color-surface)' }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleSlipFile}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
            <div className="text-muted" style={{ fontSize: 13, pointerEvents: 'none' }}>
              {slipFile ? `${t('slipSelectedPrefix')}: ${slipFile.name}` : t('slipFileDefault')}
            </div>
          </div>
          {slipPreview && (
            <img src={slipPreview} style={{ maxWidth: 220, marginTop: 10, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-divider)' }} />
          )}
        </div>

        {error && (
          <div style={{ color: 'var(--color-accent-900)', background: 'var(--color-accent-100)', border: '1px solid var(--color-accent-300)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <Button variant="primary" block style={{ height: 52, fontSize: 16 }} onClick={submit} disabled={submitting}>
          {submitting ? t('loading') : t('submitBtn')}
        </Button>
      </div>

      {qrCardUrl && (
        <div className="dialog-backdrop" onClick={closeQrCard}>
          <div className="dialog" style={{ maxWidth: 'min(90vw, 380px)', alignItems: 'center', padding: 16, gap: 12 }} onClick={(e) => e.stopPropagation()}>
            <img src={qrCardUrl} style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block', borderRadius: 'var(--radius-md)' }} />
            <p className="text-muted" style={{ fontSize: 12, textAlign: 'center', margin: 0 }}>{t('qrCardHint')}</p>
            <div className="dialog-actions" style={{ width: '100%' }}>
              <Button variant="secondary" onClick={closeQrCard}>{t('closeBtn')}</Button>
              <Button variant="primary" onClick={saveQrCard}>{t('saveImageBtn')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
