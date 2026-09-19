import { createContext, useContext, useEffect, useMemo } from "react";
import { useClub } from "@/app/providers/ClubProvider";

const DEFAULT_PALETTE = {
  logoUrl: null,
  primary: "#00438a",
  text: "#1f2937",
  button: "#00438a",
  buttonText: "#ffffff",
};

export const ThemeContext = createContext({
  palette: DEFAULT_PALETTE,
});

export default function ThemeProvider({ children }) {
  const { club } = useClub();

  const palette = useMemo(() => {
    const next = {
      logoUrl: club?.logo_url ?? null,
      primary: club?.primary_color ?? "#00438a",
      text: club?.text_color ?? "#1f2937",
      button: club?.button_color ?? "#00438a",
      buttonText: club?.button_text_color ?? "#ffffff",
    };

    return next;
  }, [club]);

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--theme-primary", palette.primary);
    root.style.setProperty("--theme-text", palette.text);
    root.style.setProperty("--theme-button", palette.button);
    root.style.setProperty("--theme-button-text", palette.buttonText);
  }, [palette]);

  return (
    <ThemeContext.Provider value={{ palette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    return { palette: DEFAULT_PALETTE };
  }

  return context;
}