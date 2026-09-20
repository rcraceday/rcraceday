// src/app/providers/ThemeProvider.jsx

import { useEffect, useMemo } from "react";
import { useClub } from "@/app/providers/ClubProvider";
import { ThemeContext } from "@/app/providers/ThemeContext";

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
  cardColor: "#ffffff",
  borderColor: "#e5e7eb",
  buttonColor: "#00438a",
  headerAccent: "#00438a",
  headerText: "#1f2937",
  headerColor: "#00438a",
};

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
      adminLogoUrl: club?.admin_logo_url || club?.logo_url || DEFAULT_PALETTE.logoUrl,
      primary,
      primarySoft: primary,
      text: DEFAULT_PALETTE.text,
      button,
      buttonText: club?.button_text_color || DEFAULT_PALETTE.buttonText,
      headerAccent: primary,
      headerText: DEFAULT_PALETTE.headerText,
      cardColor: DEFAULT_PALETTE.cardColor,
      borderColor: DEFAULT_PALETTE.borderColor,
      buttonColor: button,
      headerColor: primary,
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
    root.style.setProperty("--theme-background", theme.palette.background);
    root.style.setProperty("--theme-surface", theme.palette.surface);
    root.style.setProperty("--theme-border", theme.palette.surfaceBorder);
    root.style.setProperty("--text-base", theme.palette.text);
    root.style.setProperty("--text-muted", theme.palette.textMuted);
    root.style.setProperty("--surface-base", theme.palette.surface);
    root.style.setProperty("--surface-alt", theme.palette.surfaceAlt);
    root.style.setProperty("--border-color", theme.palette.surfaceBorder);

    return () => {
      root.style.removeProperty("--theme-primary");
      root.style.removeProperty("--theme-text");
      root.style.removeProperty("--theme-button");
      root.style.removeProperty("--theme-button-text");
      root.style.removeProperty("--theme-background");
      root.style.removeProperty("--theme-surface");
      root.style.removeProperty("--theme-border");
      root.style.removeProperty("--text-base");
      root.style.removeProperty("--text-muted");
      root.style.removeProperty("--surface-base");
      root.style.removeProperty("--surface-alt");
      root.style.removeProperty("--border-color");
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

