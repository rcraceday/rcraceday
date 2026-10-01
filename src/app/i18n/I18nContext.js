import { createContext, useContext } from "react";

export const I18nContext = createContext({
  locale: "en",
  t: (key) => key,
  setLocale: () => {},
});

export function useTranslation() {
  return useContext(I18nContext);
}
