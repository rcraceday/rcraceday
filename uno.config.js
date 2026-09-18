// uno.config.js
import { defineConfig, presetUno, presetIcons, presetTypography } from 'unocss'

export default defineConfig({
  content: [
    './index.html',
    './src/**/*.{html,js,jsx,ts,tsx}',
  ],

  presets: [
    presetUno(),
    presetIcons(),
    presetTypography(),
  ],

  theme: {
    colors: {
      /* ============================================================
         ADMIN-ONLY COLORS (SAFE)
         ============================================================ */
      admin: {
        accent: 'var(--admin-accent)',
      },

      /* ============================================================
         SYSTEM COLORS (SAFE)
         ============================================================ */
      surface: {
        base: 'var(--surface-base, #FFFFFF)',
        alt: 'var(--surface-alt, #F5F7FA)',
      },
      text: {
        base: 'var(--text-base, #0A1A2F)',
        muted: 'var(--text-muted, #4B5563)',
      },
      border: 'var(--border-color, #E5E7EB)',
    },

    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },

    borderRadius: {
      sm: '6px',
      md: '10px',
      lg: '14px',
      xl: '20px',
    },

    boxShadow: {
      card: '0 2px 8px rgba(0,0,0,0.06)',
      cardHover: '0 4px 12px rgba(0,0,0,0.08)',
    },

    fontFamily: {
      sans: 'var(--site-font)',
    },
  },

  safelist: [
    'input',
    'bg-[var(--surface-base)]',
    'text-[var(--text-base)]',
    'text-[var(--text-muted)]',
  ],

  shortcuts: {
    page: 'px-md py-lg bg-surface-base text-text-base',

    card: 'bg-surface-base rounded-lg shadow-card p-md border border-border',
    'card-hover': 'hover:shadow-cardHover transition-shadow',

    btn: 'px-md py-sm rounded-md font-semibold text-white bg-admin-accent active:scale-95 transition-all',

    input:
      'w-full px-md py-md rounded-lg border border-border bg-white text-text-base ' +
      'focus:(border-admin-accent ring-2 ring-admin-accent/20 outline-none) transition-all',

    'section-title': 'text-xl font-bold text-text-base mb-sm',
    'nav-item': 'flex flex-col items-center text-sm text-text-muted',
    chip: 'px-sm py-xs rounded-full bg-surface-alt text-text-base border border-border',
  },
})
