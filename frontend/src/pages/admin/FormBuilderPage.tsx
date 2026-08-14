import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import type { FieldType, FormField } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { DynamicFormField, fieldLabel } from '../../components/DynamicFormField';
import { diagnoseImageLoadError } from '../../lib/diagnoseImage';
import { ResilientImage } from '../../components/ResilientImage';
import type { TrKey } from '../../i18n/translations';

const TOOLBOX: { type: FieldType; labelKey: TrKey }[] = [
  { type: 'short', labelKey: 'toolShort' },
  { type: 'paragraph', labelKey: 'toolParagraph' },
  { type: 'radio', labelKey: 'toolRadio' },
  { type: 'checkbox', labelKey: 'toolCheckbox' },
  { type: 'dropdown', labelKey: 'toolDropdown' },
  { type: 'date', labelKey: 'toolDate' },
  { type: 'time', labelKey: 'toolTime' },
  { type: 'scale', labelKey: 'toolScale' },
  { type: 'file', labelKey: 'toolFile' },
  { type: 'qr', labelKey: 'toolQr' },
];

const TYPE_LABEL_KEY: Record<FieldType, TrKey> = {
  short: 'typeShort', paragraph: 'typeParagraph', radio: 'typeRadio', checkbox: 'typeCheckbox',
  dropdown: 'typeDropdown', date: 'typeDate', time: 'typeTime', scale: 'typeScale', file: 'typeFile', qr: 'typeQr',
};

export function FormBuilderPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, string | string[] | undefined>>({});

  useEffect(() => {
    api.getFormFields()
      .then((data) => { setFields(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const selected = fields.find((f) => f.id === selectedId) || null;

  const addField = (type: FieldType) => {
    const id = 'f' + Date.now();
    const base: FormField = {
      id, type, label: 'New question', required: false, placeholder: '',
      options: ['radio', 'checkbox', 'dropdown'].includes(type) ? [{ id: 'o0', label: 'Option 1' }] : [],
      maxSelect: type === 'checkbox' ? 3 : undefined,
    };
    setFields((prev) => [...prev, base]);
    setSelectedId(id);
  };

  const duplicateField = (f: FormField) => {
    const id = 'f' + Date.now();
    const idx = fields.findIndex((x) => x.id === f.id);
    const copy: FormField = { ...f, id, options: f.options.map((o) => ({ ...o })) };
    setFields((prev) => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
    setSelectedId(id);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const moveField = (id: string, dir: -1 | 1) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr;
    });
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addOption = (fieldId: string) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, options: [...f.options, { id: 'o' + Date.now(), label: 'New option' }] } : f)));
  };
  const updateOption = (fieldId: string, optId: string, label: string) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, options: f.options.map((o) => (o.id === optId ? { ...o, label } : o)) } : f)));
  };
  const removeOption = (fieldId: string, optId: string) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, options: f.options.filter((o) => o.id !== optId) } : f)));
  };

  const uploadQr = async (fieldId: string, file: File) => {
    try {
      const url = await api.uploadImage(file);
      updateField(fieldId, { qrUrl: url });
    } catch (err) {
      toast(`${t('toastUploadFailed')}${err instanceof Error && err.message ? ': ' + err.message : ''}`);
    }
  };

  const saveDraft = async () => {
    try {
      await api.saveFormFields(fields);
      toast(t('toastDraftSaved'));
    } catch {
      toast(t('toastSaveFailed'));
    }
  };
  const publish = async () => {
    try {
      await api.saveFormFields(fields);
      toast(t('toastPublished'));
    } catch {
      toast(t('toastSaveFailed'));
    }
  };

  if (loading) return <p className="text-muted">{t('loading')}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>{t('formBuilderTitle')}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={saveDraft}>{t('saveDraftBtn')}</Button>
          <Button variant="secondary" onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}>
            {mode === 'edit' ? t('previewBtn') : t('editBtn')}
          </Button>
          <Button variant="primary" onClick={publish}>{t('publishBtn')}</Button>
        </div>
      </div>

      {mode === 'preview' && (
        <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fields.map((f) => (
            <DynamicFormField
              key={f.id}
              field={f}
              value={previewAnswers[f.id]}
              onChange={(v) => setPreviewAnswers((s) => ({ ...s, [f.id]: v }))}
            />
          ))}
        </div>
      )}

      {mode === 'edit' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,220px) minmax(260px,1fr) minmax(240px,300px)', gap: 16, alignItems: 'start' }}>
          <div className="card" style={{ gap: 8 }}>
            <div className="card-kicker">{t('addFieldKicker')}</div>
            {TOOLBOX.map((ti) => (
              <button key={ti.type} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => addField(ti.type)}>
                {t(ti.labelKey)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {fields.map((f, idx) => (
              <div
                key={f.id}
                style={{
                  padding: 12, borderRadius: 'var(--radius-md)',
                  border: `1px solid ${selectedId === f.id ? 'var(--color-accent-500)' : 'var(--color-divider)'}`,
                  background: 'var(--color-surface)', cursor: 'pointer',
                }}
                onClick={() => setSelectedId(f.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <div>
                    <div className="card-kicker">{t(TYPE_LABEL_KEY[f.type])}</div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15 }}>{fieldLabel(f)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-icon" disabled={idx === 0} onClick={() => moveField(f.id, -1)}>↑</button>
                    <button className="btn btn-icon" disabled={idx === fields.length - 1} onClick={() => moveField(f.id, 1)}>↓</button>
                    <button className="btn btn-icon" onClick={() => duplicateField(f)}>⧉</button>
                    <button className="btn btn-icon" onClick={() => removeField(f.id)}>×</button>
                  </div>
                </div>
                {f.type === 'qr' && (
                  <>
                    <div style={{ width: 100, height: 100, marginTop: 8, background: 'var(--color-surface-raised)', border: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {f.qrUrl ? (
                        <ResilientImage
                          src={f.qrUrl}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          onAllFailed={async (lastUrl) => toast(`${t('toastImageLoadFailed')}: ${await diagnoseImageLoadError(lastUrl)}`)}
                        />
                      ) : (
                        <span className="text-muted" style={{ fontSize: 11 }}>QR CODE</span>
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: 6, maxWidth: 260, border: '1px dashed var(--color-divider)', borderRadius: 'var(--radius-md)',
                        padding: '6px 10px', fontSize: 12, color: f.qrCaption ? 'var(--color-text)' : 'var(--color-text-muted)',
                      }}
                    >
                      {f.qrCaption || t('qrCaptionLabel')}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {selected && (
            <div className="card" style={{ gap: 12 }}>
              <div className="card-kicker">{t('propertiesKicker')}</div>
              <Field label={t('questionLabel')}>
                <input className="input" value={selected.label} onChange={(e) => updateField(selected.id, { label: e.target.value })} />
              </Field>
              <label className="radio" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={selected.required} onChange={(e) => updateField(selected.id, { required: e.target.checked })} />
                {t('requiredLabel')}
              </label>

              {['short', 'paragraph'].includes(selected.type) && (
                <Field label={t('placeholderLabel')}>
                  <input className="input" value={selected.placeholder || ''} onChange={(e) => updateField(selected.id, { placeholder: e.target.value })} />
                </Field>
              )}

              {['radio', 'checkbox', 'dropdown'].includes(selected.type) && (
                <Field label={t('optionsLabel')}>
                  {selected.options.map((opt) => (
                    <div key={opt.id} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <input className="input" value={opt.label} onChange={(e) => updateOption(selected.id, opt.id, e.target.value)} />
                      <button className="btn btn-icon" onClick={() => removeOption(selected.id, opt.id)}>×</button>
                    </div>
                  ))}
                  <button className="btn btn-ghost" onClick={() => addOption(selected.id)}>{t('addOptionBtn')}</button>
                </Field>
              )}

              {selected.type === 'checkbox' && (
                <Field label={t('maxSelectLabel')}>
                  <input
                    className="input" type="number" min={1}
                    value={selected.maxSelect || 1}
                    onChange={(e) => updateField(selected.id, { maxSelect: Number(e.target.value) || 1 })}
                  />
                </Field>
              )}

              {selected.type === 'qr' && (
                <Field label={t('typeQr')}>
                  <div style={{ width: 120, height: 120, marginBottom: 8, background: 'var(--color-surface)', border: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {selected.qrUrl ? (
                      <ResilientImage
                        src={selected.qrUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onAllFailed={async (lastUrl) => toast(`${t('toastImageLoadFailed')}: ${await diagnoseImageLoadError(lastUrl)}`)}
                      />
                    ) : (
                      <span className="text-muted" style={{ fontSize: 11 }}>QR CODE</span>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="input" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadQr(selected.id, file);
                  }} />
                </Field>
              )}

              {selected.type === 'qr' && (
                <Field label={t('qrCaptionLabel')}>
                  <textarea
                    className="input"
                    value={selected.qrCaption || ''}
                    onChange={(e) => updateField(selected.id, { qrCaption: e.target.value })}
                  />
                </Field>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
