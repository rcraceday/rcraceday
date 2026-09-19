// src/app/providers/ThemeProvider.jsx

import { createContext, useContext, useEffect, useMemo } from "react";
import { useClub } from "@/app/providers/ClubProvider";

const DEFAULT_PALETTE = {
  logoUrl: null,
  primary: "#00438a",
  primarySoft: "#0a5bb8",
  text: "#1f2937",
  textMuted: "#6b7280",
  button: "#00438a",
  buttonText: "#ffffff",
  background: "#ffffff",
  surface: "#ffffff",
  surfaceAlt: "#f9fafb",
  surfaceBorder: "#e5e7eb",
  headerAccent: "#00438a",
  headerText: "#ffffff",
};

export const ThemeContext = createContext({
  palette: DEFAULT_PALETTE,
  mode: "drivers",
});

export default function ThemeProvider({
  mode = "drivers",
  clubTheme = {},
  children,
}) {
  const { club } = useClub();

  const theme = useMemo(() => {
    const primary = club?.primary_color || DEFAULT_PALETTE.primary;
    const button = club?.button_color || primary;
    const palette = {
      ...DEFAULT_PALETTE,
      ...clubTheme,
      logoUrl: club?.logo_url || DEFAULT_PALETTE.logoUrl,
      primary,
      primarySoft: club?.accent_color || primary,
      text: club?.header_text_color || DEFAULT_PALETTE.text,
      button,
      buttonText: club?.button_text_color || DEFAULT_PALETTE.buttonText,
      headerAccent: primary,
      headerText: club?.header_text_color || DEFAULT_PALETTE.headerText,
      background: club?.background_color || DEFAULT_PALETTE.background,
      surface: club?.card_color || DEFAULT_PALETTE.surface,
      surfaceBorder: club?.border_color || DEFAULT_PALETTE.surfaceBorder,
      hero: {
        ...(clubTheme.hero || {}),
        ...(club?.theme?.hero || {}),
        logo: club?.logo_url || null,
      },
    };

    return {
      palette,
      mode,
    };
  }, [club, clubTheme, mode]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--theme-primary", theme.palette.primary);
    root.style.setProperty("--theme-text", theme.palette.text);
    root.style.setProperty("--theme-button", theme.palette.button);
    root.style.setProperty("--theme-button-text", theme.palette.buttonText);
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}