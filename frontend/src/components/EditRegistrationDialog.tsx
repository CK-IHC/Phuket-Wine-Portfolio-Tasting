import { useState } from 'react';
import type { Registration } from '../lib/types';
import { useLanguage } from '../i18n/LanguageContext';
import { Dialog } from './ui/Dialog';
import { Field } from './ui/Field';
import { Button } from './ui/Button';

export function EditRegistrationDialog({
  registration,
  onClose,
  onSave,
}: {
  registration: Registration;
  onClose: () => void;
  onSave: (patch: Registration) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<Registration>(registration);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<Registration>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      title={`${t('editRegTitle')} — ${draft.refNo}`}
      onClose={onClose}
      actions={<>
        <Button variant="secondary" onClick={onClose}>{t('cancelBtn')}</Button>
        <Button variant="primary" onClick={save} disabled={saving}>{t('saveBtn')}</Button>
      </>}
    >
      <Field label={t('colName')}><input className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} /></Field>
      <Field label={t('colEmail')}><input className="input" value={draft.email} onChange={(e) => set({ email: e.target.value })} /></Field>
      <Field label={t('colPhone')}><input className="input" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
      <Field label={t('colArea')}><input className="input" value={draft.area} onChange={(e) => set({ area: e.target.value })} /></Field>
      <Field label={t('colArrival')}><input className="input" value={draft.arrival} onChange={(e) => set({ arrival: e.target.value })} /></Field>
      <Field label={t('colSource')}><input className="input" value={draft.source} onChange={(e) => set({ source: e.target.value })} /></Field>
    </Dialog>
  );
}
