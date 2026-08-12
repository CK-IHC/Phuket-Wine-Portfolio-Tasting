import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LangToggle } from '../../components/ui/LangToggle';
import { Button } from '../../components/ui/Button';
import type { TrKey } from '../../i18n/translations';

const TABS: { path: string; labelKey: TrKey }[] = [
  { path: 'dashboard', labelKey: 'tabDashboard' },
  { path: 'rounds', labelKey: 'tabRounds' },
  { path: 'list', labelKey: 'tabList' },
  { path: 'verify', labelKey: 'tabVerify' },
  { path: 'responses', labelKey: 'tabResponses' },
  { path: 'users', labelKey: 'tabUsers' },
  { path: 'announcements', labelKey: 'tabAnnounce' },
  { path: 'form-builder', labelKey: 'tabForm' },
];

export function AdminLayout() {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <nav className="nav" style={{ borderBottom: '1px solid var(--color-divider)' }}>
        <span className="nav-brand">{t('adminBrand')}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LangToggle />
          <Button variant="secondary" onClick={() => navigate('/')}>{t('userViewBtn')}</Button>
          <Button variant="secondary" onClick={() => { logout(); navigate('/'); }}>{t('logoutBtn')}</Button>
        </div>
      </nav>
      <div className="admin-tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `admin-tab ${isActive ? 'active' : ''}`}
          >
            {t(tab.labelKey)}
          </NavLink>
        ))}
      </div>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '20px 16px 60px' }}>
        <Outlet />
      </div>
    </div>
  );
}
