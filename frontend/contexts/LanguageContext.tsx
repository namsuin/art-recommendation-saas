import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from '../utils/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // 로컬 스토리지에서 언어 설정 가져오기
    const savedLang = localStorage.getItem('language');
    if (savedLang === 'en' || savedLang === 'kr') {
      return savedLang;
    }
    // 브라우저 언어 감지
    const browserLang = navigator.language.toLowerCase();
    return browserLang.includes('ko') ? 'kr' : 'en';
  });

  useEffect(() => {
    // 언어 변경 시 로컬 스토리지에 저장
    localStorage.setItem('language', language);
    // HTML lang 속성 업데이트
    document.documentElement.lang = language === 'kr' ? 'ko' : 'en';
  }, [language]);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};