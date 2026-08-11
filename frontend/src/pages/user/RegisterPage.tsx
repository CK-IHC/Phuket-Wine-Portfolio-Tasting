import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { LangToggle } from '../../components/ui/LangToggle';
import { Button } from '../../components/ui/Button';
import { Blueprint } from '../../components/ui/Blueprint';
import { DynamicFormField, type FieldValue } from '../../components/DynamicFormField';
import { api } from '../../lib/api';
import type { FormField } from '../../lib/types';

export function RegisterPage() {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<Record<string, FieldValue>>({});
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refNo, setRefNo] = useState<string | null>(null);

  useEffect(() => {
    api.getFormFields().then(setFields).catch(() => {});
  }, []);

  const setAnswer = (id: string, value: FieldValue) => setAnswers((s) => ({ ...s, [id]: value }));

  const handleSlipFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSlipPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const downloadQr = (field: FormField) => {
    if (!field.qrUrl) {
      toast(t('toastNoQr'));
      return;
    }
    const a = document.createElement('a');
    a.href = field.qrUrl;
    a.download = 'payment-qr.png';
    a.click();
  };

  const submit = async () => {
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
        <div style={{ maxWidth: 520, margin: '60px auto', padding: '0 16px' }}>
          <Blueprint className="card" style={{ textAlign: 'center', gap: 14, padding: '32px 20px' }}>
            <span className="tag tag-accent" style={{ width: 'fit-content', margin: '0 auto' }}>{t('successTag')}</span>
            <h2>{t('successTitle')}</h2>
            <p className="text-muted">{t('successRefLabel')}</p>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 34, letterSpacing: '.04em' }}>{refNo}</div>
            <p className="text-muted" style={{ fontSize: 13 }}>{t('successNote')}</p>
            <Button variant="primary" block onClick={() => navigate('/')}>{t('backHomeBtn')}</Button>
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
    </div>
  );
}
