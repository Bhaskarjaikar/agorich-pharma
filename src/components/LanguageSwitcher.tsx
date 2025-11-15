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
          className={`h-7 rounded-full px-3 text-xs font-semibold transition-colors ${
            i18n.language === lang ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/20"
          }`}
          aria-pressed={i18n.language === lang}
        >
          {lang === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}










