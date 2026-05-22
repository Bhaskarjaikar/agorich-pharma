import i18next, { i18n as I18nType } from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import hi from "./hi.json";

let i18nInstance: I18nType | null = null;

export const supportedLocales = ["en", "hi"] as const;
export type SupportedLocale = typeof supportedLocales[number];

export function getInitialLocale(): SupportedLocale {
  if (typeof window === "undefined") return "en";
  const fromStorage = (localStorage.getItem("lang") || "").toLowerCase();
  if (supportedLocales.includes(fromStorage as SupportedLocale)) return fromStorage as SupportedLocale;
  const fromCookie = (document.cookie.match(/(?:^|; )lang=([^;]+)/)?.[1] || "").toLowerCase();
  if (supportedLocales.includes(fromCookie as SupportedLocale)) return fromCookie as SupportedLocale;
  const browser = (navigator.language || "en").slice(0, 2).toLowerCase();
  return supportedLocales.includes(browser as SupportedLocale) ? (browser as SupportedLocale) : "en";
}

export function setLocale(lang: SupportedLocale) {
  if (typeof document !== "undefined") {
    document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`;
    // Update HTML lang attribute
    document.documentElement.lang = lang;
  }
  if (typeof window !== "undefined") {
    localStorage.setItem("lang", lang);
  }
  if (i18nInstance && i18nInstance.language !== lang) {
    void i18nInstance.changeLanguage(lang).then(() => {
      console.log("🌐 Language changed to:", lang);
    }).catch((err) => {
      console.error("❌ Error changing language:", err);
    });
  }
}

// Export function to get the i18n instance
export function getI18nInstance() {
  return i18nInstance;
}

export function initI18n(): I18nType {
  if (i18nInstance) return i18nInstance;
  i18nInstance = i18next.createInstance();
  i18nInstance
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        hi: { translation: hi }
      },
      lng: getInitialLocale(),
      fallbackLng: "en",
      interpolation: { escapeValue: false }
    });
  return i18nInstance;
}










