import { useCallback, useEffect, useMemo, useState } from "react";
import { createTranslator } from "@/app/i18n/translate";
import { getAppLocale, setAppLocale, subscribeLocale } from "@/app/i18n/localeStore";
import { I18nContext } from "@/app/i18n/I18nContext";

export default function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(getAppLocale());

  useEffect(() => subscribeLocale(setLocaleState), []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((code) => {
    setAppLocale(code);
  }, []);

  const t = useMemo(() => createTranslator(locale), [locale]);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
