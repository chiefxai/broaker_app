import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { mapLanguageText } from './language-mapper';

export type AppLanguage = 'en' | 'ta' | 'te' | 'ml';
type TranslationKey = 'home' | 'properties' | 'sharedLinks' | 'settings' | 'mock' | 'language' | 'english' | 'tamil' | 'telugu' | 'malayalam' | 'chooseLanguage' | 'goBack';

const STORAGE_KEY = '@broaker/language/v1';
const translationKeys: Record<TranslationKey, string> = {
  home: 'Home', properties: 'Properties', sharedLinks: 'Shared Links', settings: 'Settings',
  mock: 'MOCK', language: 'Language', english: 'English', tamil: 'தமிழ் (Tamil)', telugu: 'తెలుగు', malayalam: 'മലയാളം', chooseLanguage: 'Choose language', goBack: 'Go back',
};

interface LanguageContextValue {
  language: AppLanguage;
  isHydrated: boolean;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey) => string;
  translate: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isAppLanguage(value: string | null): value is AppLanguage {
  return value === 'en' || value === 'ta' || value === 'te' || value === 'ml';
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [isHydrated, setIsHydrated] = useState(false);
  const changedBeforeHydration = useRef(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => { if (mounted && !changedBeforeHydration.current && isAppLanguage(stored)) setLanguageState(stored); })
      .catch(() => undefined)
      .finally(() => { if (mounted) setIsHydrated(true); });
    return () => { mounted = false; };
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    changedBeforeHydration.current = true;
    setLanguageState(next);
  }, []);
  useEffect(() => {
    if (isHydrated) AsyncStorage.setItem(STORAGE_KEY, language).catch(() => undefined);
  }, [isHydrated, language]);

  const t = useCallback((key: TranslationKey) => mapLanguageText(translationKeys[key], language), [language]);
  const translate = useCallback((text: string) => mapLanguageText(text, language), [language]);
  const value = useMemo(() => ({ language, isHydrated, setLanguage, t, translate }), [language, isHydrated, setLanguage, t, translate]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

export function useCurrentLanguage(): AppLanguage {
  return useContext(LanguageContext)?.language ?? 'en';
}
