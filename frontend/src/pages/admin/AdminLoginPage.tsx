import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LangToggle } from '../../components/ui/LangToggle';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';

export function AdminLoginPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(phone.trim());
      navigate('/admin/dashboard');
    } catch {
      setError(t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px' }}>
      <div className="card" style={{ gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <LangToggle />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: 4 }}>{t('adminLoginTitle')}</h2>
          <p className="text-muted" style={{ fontSize: 13 }}>{t('adminLoginSubtitle')}</p>
        </div>
        <Field label={t('phoneLabel')}>
          <input
            className="input"
            type="text"
            placeholder={t('loginPhonePlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </Field>
        {error && (
          <div style={{ color: 'var(--color-accent-900)', background: 'var(--color-accent-100)', border: '1px solid var(--color-accent-300)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
            {error}
          </div>
        )}
        <Button variant="primary" block onClick={submit} disabled={loading || !phone.trim()}>
          {loading ? t('loading') : t('loginBtn')}
        </Button>
        <p className="text-muted" style={{ fontSize: 11, textAlign: 'center' }}>{t('loginNote')}</p>
        <Button variant="ghost" style={{ margin: '0 auto' }} onClick={() => navigate('/')}>{t('backHome')}</Button>
      </div>
    </div>
  );
}
