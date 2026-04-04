// src/components/ui/Footer.jsx
import rcracedayLogo from "@/assets/RCRaceday_logo_300x300_Powered.png";

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white mt-0">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col items-center gap-4">

        {/* Logo */}
        <a
          href="/clubselect"
          className="opacity-90 hover:opacity-100 transition"
          style={{ lineHeight: 0 }}
        >
          <img
            src={rcracedayLogo}
            alt="RC RaceDay"
            className="h-18 w-auto"   // ⭐ 20px logo
          />
        </a>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-3 text-sm">
          <FooterLink href="/terms">Terms of Use</FooterLink>
          <Separator />
          <FooterLink href="/privacy">Privacy Policy</FooterLink>
          <Separator />
          <FooterLink href="/support">Support</FooterLink>
          <Separator />
          <FooterLink href="/contact">Contact RCRaceday</FooterLink>
          <Separator />
          <FooterLink
            href="https://rcraceday.com"
            external
          >
            RCRaceday.com
          </FooterLink>
        </nav>

        {/* Copyright */}
        <p className="text-xs text-slate-500">
          © 2026 RCRaceday. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ---------------------------------------------
   Helper Components
---------------------------------------------- */

function FooterLink({ href, children, external = false }) {
  const props = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <a
      href={href}
      {...props}
      className="text-slate-500 hover:text-slate-900 transition-colors"
      style={{
        textDecoration: "none",     // ⭐ Prevent global link styling
        fontWeight: 400,
      }}
    >
      {children}
    </a>
  );
}

function Separator() {
  return (
    <span
      className="text-slate-300 select-none"
      style={{ padding: "0 4px" }}
    >
      |
    </span>
  );
}
