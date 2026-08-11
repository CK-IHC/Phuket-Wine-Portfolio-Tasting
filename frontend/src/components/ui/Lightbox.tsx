import { useLanguage } from '../../i18n/LanguageContext';
import { Button } from './Button';

export function Lightbox({
  src,
  fallbackLabel,
  onClose,
}: {
  src?: string;
  fallbackLabel?: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" style={{ maxWidth: 'min(90vw, 600px)', alignItems: 'center', padding: 12 }} onClick={(e) => e.stopPropagation()}>
        {src ? (
          <img src={src} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>{fallbackLabel || 'IMAGE'}</span>
          </div>
        )}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>{t('closeBtn')}</Button>
        </div>
      </div>
    </div>
  );
}
