"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "zh";
export const LANGUAGE_STORAGE_KEY = "grok-bot-100-lang";
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  t: (en: string, zh: string) => string;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // SSR and the first client render always agree, regardless of browser locale.
  const [language, updateLanguage] = useState<Language>("en");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === "en" || saved === "zh") updateLanguage(saved);
      } catch {
        /* In-memory language switching works without browser storage. */
      }
    });
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY)
        updateLanguage(event.newValue === "zh" ? "zh" : "en");
    };
    window.addEventListener("storage", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  function setLanguage(next: Language) {
    updateLanguage(next);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      /* Preserve the user's choice for this session. */
    }
  }
  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: (en, zh) => (language === "zh" ? zh : en),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage requires LanguageProvider");
  return context;
}

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div
      className="language-toggle"
      role="group"
      aria-label={t("Language", "语言")}
    >
      {(
        [
          ["en", "EN"],
          ["zh", "中文"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-pressed={language === value}
          onClick={() => setLanguage(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
