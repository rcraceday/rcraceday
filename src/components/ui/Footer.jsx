// src/components/ui/Footer.jsx
import { Link } from "react-router-dom";
import { useTranslation } from "@/app/i18n/I18nContext";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="w-full border-t border-slate-200 bg-white mt-0">
      <div className="max-w-[720px] mx-auto px-4 py-6 flex flex-col items-center gap-4">

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-3 text-sm">
          <FooterLink href="/terms">{t("footer.terms")}</FooterLink>
          <Separator />
          <FooterLink href="/privacy">{t("footer.privacy")}</FooterLink>
          <Separator />
          <FooterLink href="/support">{t("footer.support")}</FooterLink>
          <Separator />
          <FooterLink href="/contact">{t("footer.contact")}</FooterLink>
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
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}

/* ---------------------------------------------
   Helper Components
---------------------------------------------- */

function FooterLink({ href, children, external = false }) {
  const className = "text-slate-500 hover:text-slate-900 transition-colors";
  const style = {
    textDecoration: "none",
    fontWeight: 400,
  };

  if (!external && href?.startsWith("/")) {
    return (
      <Link to={href} className={className} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={className}
      style={style}
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
