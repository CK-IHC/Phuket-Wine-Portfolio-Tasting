import { useLanguage } from '../../i18n/LanguageContext';

export function LangToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button className={`lang-btn ${lang === 'th' ? 'active' : ''}`} onClick={() => setLang('th')}>TH</button>
      <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
    </div>
  );
}
