
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

export type Language = 'en' | 'fr' | 'rw' | 'sw' | 'hi' | 'zh' | 'ja' | 'ko' | 'ha' | 'yo' | 'bn' | 'ta' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  translate: (key: string, replacements?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {},
  fr: {},
  rw: {},
  sw: {},
  hi: {},
  zh: {},
  ja: {},
  ko: {},
  ha: {},
  yo: {},
  bn: {},
  ta: {},
  ar: {},
};

const allSupportedLanguages: Language[] = ['en', 'fr', 'rw', 'sw', 'hi', 'zh', 'ja', 'ko', 'ha', 'yo', 'bn', 'ta', 'ar'];

// Helper to dynamically load translations
async function loadTranslations(lang: Language) {
  if (Object.keys(translations[lang]).length === 0) { // Only load if not already loaded
    try {
      const module = await import(`@/locales/${lang}.json`);
      translations[lang] = module.default;
    } catch (error) {
      console.error(`Could not load translations for ${lang}:`, error);
      // Fallback to English if a language file is missing or fails to load
      if (lang !== 'en' && Object.keys(translations['en']).length === 0) {
        const enModule = await import(`@/locales/en.json`);
        translations['en'] = enModule.default;
      }
    }
  }
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en'); // Default to English
  const [loadedLanguages, setLoadedLanguages] = useState<Set<Language>>(new Set(['en']));

  useEffect(() => {
    // Load default 'en' translations on mount
    loadTranslations('en').then(() => {
        setLoadedLanguages(prev => new Set(prev).add('en'));
    });
  }, []);
  
  useEffect(() => {
    const savedLanguage = localStorage.getItem('appLanguage') as Language | null;
    if (savedLanguage && allSupportedLanguages.includes(savedLanguage)) {
      setLanguageState(savedLanguage);
       if (!loadedLanguages.has(savedLanguage)) {
        loadTranslations(savedLanguage).then(() => {
          setLoadedLanguages(prev => new Set(prev).add(savedLanguage));
        });
      }
    }
  }, [loadedLanguages]);

  const setLanguage = useCallback((lang: Language) => {
    loadTranslations(lang).then(() => {
      setLanguageState(lang);
      localStorage.setItem('appLanguage', lang);
      setLoadedLanguages(prev => new Set(prev).add(lang));
    });
  }, []);

  const translate = useCallback((key: string, replacements: Record<string, string> = {}): string => {
    const langTranslations = translations[language] || translations['en']; // Fallback to English
    let translatedString = langTranslations[key] || key; // Fallback to key if translation not found

    Object.entries(replacements).forEach(([placeholder, value]) => {
      translatedString = translatedString.replace(`{{${placeholder}}}`, value);
    });
    return translatedString;
  }, [language]);
  
  // Ensure the current language translations are loaded before rendering children
  if (!loadedLanguages.has(language)) {
    // Render a loading state or null while translations are loading
    return null; 
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

