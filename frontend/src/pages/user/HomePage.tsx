import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LangToggle } from '../../components/ui/LangToggle';
import { Button } from '../../components/ui/Button';
import { BannerCarousel } from '../../components/BannerCarousel';
import { api } from '../../lib/api';
import { formatDateStringOnly } from '../../lib/format';
import type { Announcement } from '../../lib/types';

export function HomePage() {
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    api.getAnnouncement().then(setAnnouncement).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <nav className="nav" style={{ borderBottom: '1px solid var(--color-divider)' }}>
        <span className="nav-brand">Phuket Wine Portfolio Tasting</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LangToggle />
          <button
            className="icon-circle-btn"
            title={t('gearTitle')}
            onClick={() => navigate(session ? '/admin/dashboard' : '/admin/login')}
          >
            ⚙
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 60px' }}>
        {announcement && (
          <BannerCarousel banners={announcement.banners} aspect={announcement.bannerAspect} />
        )}

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
          <span className="tag tag-accent" style={{ width: 'fit-content' }}>{t('tagAnnouncement')}</span>
          <p style={{ fontSize: 15, lineHeight: 1.6 }}>
            {announcement ? (lang === 'th' ? announcement.textTh : announcement.textEn) : ''}
          </p>
          {announcement && (
            <p style={{ fontSize: 13, marginTop: 4, fontWeight: 600 }}>
              {formatDateStringOnly(announcement.eventDate, lang)}
              {announcement.eventStartTime && ` · ${announcement.eventStartTime}`}
              {announcement.eventEndTime && `–${announcement.eventEndTime}`}
              {announcement.eventVenue && ` · ${announcement.eventVenue}`}
            </p>
          )}
        </div>

        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <Button
            variant="primary"
            block
            style={{ marginTop: 28, height: 52, fontSize: 16 }}
            onClick={() => navigate('/register')}
          >
            {t('registerBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}
