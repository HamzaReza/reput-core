'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language } from './i18n';

interface LanguageContextProps {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (section: keyof typeof translations['it'], key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    const stored = localStorage.getItem('newsai_lang');
    if (stored === 'en' || stored === 'it') {
      setLang(stored);
    }
  }, []);

  const changeLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('newsai_lang', l);
  };

  const t = (section: keyof typeof translations['it'], key: string) => {
    try {
      return (translations[lang] as any)[section][key] || (translations['it'] as any)[section][key] || key;
    } catch {
      return key;
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
