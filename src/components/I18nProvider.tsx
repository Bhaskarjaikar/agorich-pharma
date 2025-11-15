"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { initI18n, getInitialLocale } from "@/lib/i18n";

export default function I18nProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [i18n] = useState(() => initI18n());

  useEffect(() => {
    // Ensure initial language is applied on mount
    void i18n.changeLanguage(getInitialLocale()).finally(() => setReady(true));
  }, [i18n]);

  if (!ready) return null;
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}























