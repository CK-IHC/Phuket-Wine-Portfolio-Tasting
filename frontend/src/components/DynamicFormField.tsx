import type { FormField } from '../lib/types';
import { useLanguage } from '../i18n/LanguageContext';
import { Field } from './ui/Field';
import { Button } from './ui/Button';

export type FieldValue = string | string[] | undefined;

export function fieldLabel(f: FormField) {
  return f.label + (f.required ? ' *' : '');
}

export function DynamicFormField({
  field,
  value,
  onChange,
  disabled = false,
  onDownloadQr,
}: {
  field: FormField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  disabled?: boolean;
  onDownloadQr?: () => void;
}) {
  const { t, lang } = useLanguage();
  const label = fieldLabel(field);

  if (field.type === 'qr') {
    return (
      <Field label={label} large>
        <div className="card" style={{ alignItems: 'center', textAlign: 'center', gap: 10 }}>
          <div style={{ width: 180, height: 180 }}>
            {field.qrUrl ? (
              <img src={field.qrUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>QR CODE</span>
              </div>
            )}
          </div>
          <div className="card-body">{t('paymentDesc')}</div>
          {onDownloadQr && (
            <Button variant="secondary" block onClick={onDownloadQr}>{t('downloadQrBtn')}</Button>
          )}
        </div>
      </Field>
    );
  }

  if (field.type === 'short') {
    return (
      <Field label={label} large>
        <input
          className="input"
          type="text"
          placeholder={field.placeholder}
          value={(value as string) || ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }

  if (field.type === 'paragraph') {
    return (
      <Field label={label} large>
        <textarea
          className="input"
          placeholder={field.placeholder}
          value={(value as string) || ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }

  if (field.type === 'date') {
    return (
      <Field label={label} large>
        <input
          className="input"
          type="date"
          value={(value as string) || ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }

  if (field.type === 'time') {
    return (
      <Field label={label} large>
        <input
          className="input"
          type="time"
          value={(value as string) || ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    );
  }

  if (field.type === 'dropdown') {
    return (
      <Field label={label} large>
        <select
          className="input"
          value={(value as string) || ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">…</option>
          {field.options.map((opt) => (
            <option key={opt.id} value={opt.label}>{opt.label}</option>
          ))}
        </select>
      </Field>
    );
  }

  if (field.type === 'radio') {
    return (
      <Field label={label} large>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {field.options.map((opt) => (
            <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: disabled ? 'default' : 'pointer' }}>
              <input
                type="radio"
                name={field.id}
                checked={value === opt.label}
                disabled={disabled}
                onChange={() => onChange(opt.label)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </Field>
    );
  }

  if (field.type === 'checkbox') {
    const arr = (value as string[]) || [];
    const max = field.maxSelect || field.options.length;
    return (
      <Field
        label={label}
        large
        hint={
          lang === 'th'
            ? `เลือกได้สูงสุด ${max} ข้อ (${arr.length}/${max})`
            : `Select up to ${max} (${arr.length}/${max})`
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {field.options.map((opt) => {
            const selected = arr.includes(opt.label);
            return (
              <button
                type="button"
                key={opt.id}
                className={`chip ${selected ? 'selected' : ''}`}
                disabled={disabled}
                onClick={() => {
                  if (selected) onChange(arr.filter((x) => x !== opt.label));
                  else if (arr.length < max) onChange([...arr, opt.label]);
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Field>
    );
  }

  if (field.type === 'scale') {
    const arr = Array.from({ length: 5 }, (_, i) => String(i + 1));
    return (
      <Field label={label} large>
        <div style={{ display: 'flex', gap: 8 }}>
          {arr.map((n) => (
            <button
              type="button"
              key={n}
              className={`chip ${value === n ? 'selected' : ''}`}
              disabled={disabled}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>
    );
  }

  if (field.type === 'file') {
    return (
      <Field label={label} large>
        <input type="file" className="input" disabled={disabled} onChange={(e) => onChange(e.target.files?.[0]?.name || '')} />
      </Field>
    );
  }

  return null;
}
