"use client";

import { useTranslation } from "react-i18next";
import { supportedLocales, setLocale, SupportedLocale } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  async function change(lang: SupportedLocale) {
    try {
      setLocale(lang);
      // Force i18n instance to change language
      if (i18n && i18n.language !== lang) {
        await i18n.changeLanguage(lang);
      }
    } catch (error) {
      console.error("❌ Error changing language:", error);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {supportedLocales.map((lang) => (
        <button
          key={lang}
          onClick={() => change(lang)}
          className={`h-8 rounded-full px-4 text-xs font-bold transition-all shadow-sm ${
            i18n.language === lang 
              ? "bg-blue-600 text-white shadow-md" 
              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600"
          }`}
          aria-pressed={i18n.language === lang}
        >
          {lang === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}










