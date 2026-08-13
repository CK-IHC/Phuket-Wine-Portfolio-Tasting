import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LangToggle } from '../../components/ui/LangToggle';
import { Button } from '../../components/ui/Button';
import { Blueprint } from '../../components/ui/Blueprint';
import { BannerCarousel } from '../../components/BannerCarousel';
import { api } from '../../lib/api';
import { formatDateStringOnly } from '../../lib/format';
import type { EventRound } from '../../lib/types';

export function HomePage() {
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [rounds, setRounds] = useState<EventRound[] | null>(null);

  useEffect(() => {
    api.getRounds().then(setRounds).catch(() => setRounds([]));
  }, []);

  // Published rounds, open-for-registration first, otherwise by date descending.
  const visibleRounds = (rounds || [])
    .filter((r) => r.published)
    .sort((a, b) => {
      if ((a.status === 'open') !== (b.status === 'open')) return a.status === 'open' ? -1 : 1;
      return b.date.localeCompare(a.date);
    });

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

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 60px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {rounds === null && <p className="text-muted" style={{ textAlign: 'center' }}>{t('loading')}</p>}
        {rounds !== null && visibleRounds.length === 0 && (
          <p className="text-muted" style={{ textAlign: 'center' }}>{t('noRoundOpenMessage')}</p>
        )}

        {visibleRounds.map((round) => (
          <div key={round.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420, margin: '0 auto', width: '100%' }}>
            <BannerCarousel banners={round.banners} aspect={round.bannerAspect} />

            <Blueprint style={{ padding: 18, gap: 10, display: 'flex', flexDirection: 'column' }}>
              <span
                className={`tag ${round.status === 'open' ? 'tag-round-open' : 'tag-round-closed'}`}
                style={{ width: 'fit-content' }}
              >
                {t(round.status === 'open' ? 'roundStatusOpen' : 'roundStatusClosed')}
              </span>
              <h3 style={{ margin: 0 }}>{round.name}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0 }}>{lang === 'th' ? round.textTh : round.textEn}</p>
              <p style={{ fontSize: 13, marginTop: 4, marginBottom: 0, fontWeight: 600 }}>
                {formatDateStringOnly(round.date, lang)}
                {round.startTime && ` · ${round.startTime}`}
                {round.endTime && `–${round.endTime}`}
                {round.venue && ` · ${round.venue}`}
              </p>

              {round.status === 'open' && (
                <Button
                  variant="primary"
                  block
                  style={{ height: 52, fontSize: 16, marginTop: 6 }}
                  onClick={() => navigate(`/register?round=${round.id}`)}
                >
                  {t('registerBtn')}
                </Button>
              )}
            </Blueprint>
          </div>
        ))}
      </div>
    </div>
  );
}
