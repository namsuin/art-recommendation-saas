import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="language-toggle">
      <button
        onClick={() => setLanguage('en')}
        className={`language-toggle-option ${language === 'en' ? 'active' : ''}`}
        aria-label="Switch to English"
      >
        EN
      </button>
      <span className="lang-divider">/</span>
      <button
        onClick={() => setLanguage('kr')}
        className={`language-toggle-option ${language === 'kr' ? 'active' : ''}`}
        aria-label="한국어로 전환"
      >
        KR
      </button>
    </div>
  );
};