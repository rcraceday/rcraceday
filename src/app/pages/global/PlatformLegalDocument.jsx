import { Fragment } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/app/i18n/I18nContext";
import Footer from "@/components/ui/Footer";
const PLATFORM_LOGO_SRC = "/rcraceday_logo.png";
import legalBundle from "@/app/i18n/messages/enBundles/legal";

const INLINE_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

function renderTextWithInlineLinks(text) {
  if (!text || !INLINE_LINK_PATTERN.test(text)) return text;

  INLINE_LINK_PATTERN.lastIndex = 0;
  const nodes = [];
  let lastIndex = 0;
  let match = INLINE_LINK_PATTERN.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const href = match[2];
    const label = match[1];
    const key = `${match.index}-${label}`;

    if (href.startsWith("/")) {
      nodes.push(
        <Link key={key} to={href} className="public-auth-link">
          {label}
        </Link>
      );
    } else if (href.startsWith("mailto:") || href.startsWith("http://") || href.startsWith("https://")) {
      nodes.push(
        <a key={key} href={href} className="public-auth-link">
          {label}
        </a>
      );
    } else {
      nodes.push(label);
    }

    lastIndex = INLINE_LINK_PATTERN.lastIndex;
    match = INLINE_LINK_PATTERN.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.map((node, index) =>
    typeof node === "string" ? <Fragment key={`t-${index}`}>{node}</Fragment> : node
  );
}

/**
 * Renders a static legal document (English source in enBundles/legal.js; titles via i18n when translated).
 */
export default function PlatformLegalDocument({ documentKey }) {
  const { t } = useTranslation();
  const base = `legal.${documentKey}`;
  const doc = legalBundle.legal?.[documentKey];
  if (!doc) return null;

  const sectionOrder = doc.sectionOrder || [];

  return (
    <div className="platform-legal-page">
      <header className="platform-legal-header">
        <Link to="/" className="platform-legal-brand" aria-label="RCRaceday home">
          <img src={PLATFORM_LOGO_SRC} alt="" className="platform-legal-logo" />
        </Link>
      </header>

      <main className="platform-legal-main">
        <h1 className="platform-legal-title">{t(`${base}.title`)}</h1>
        {doc.lead ? <p className="platform-legal-lead">{doc.lead}</p> : null}
        {doc.effectiveDate ? (
          <p className="platform-legal-effective">{t(`${base}.effectiveDate`)}</p>
        ) : null}

        {sectionOrder.map((sectionId) => {
          const section = doc.sections?.[sectionId];
          if (!section) return null;
          const titleKey = `${base}.sections.${sectionId}.title`;
          const translatedTitle = t(titleKey);
          const title =
            translatedTitle && !translatedTitle.startsWith("legal.")
              ? translatedTitle
              : section.title;
          const paragraphs = Array.isArray(section.paragraphs) ? section.paragraphs : [];

          return (
            <section key={sectionId} className="platform-legal-section">
              <h2 className="platform-legal-section-title">{title}</h2>
              {paragraphs.map((paragraph) => (
                <p key={`${sectionId}-${paragraph.slice(0, 32)}`} className="platform-legal-paragraph">
                  {documentKey === "terms" && sectionId === "privacy" ? (
                    <>
                      Our{" "}
                      <Link to="/privacy" className="public-auth-link">
                        Privacy Policy
                      </Link>{" "}
                      explains how we collect, use, and store personal information. By using the
                      Service you acknowledge that we handle information as described in that
                      policy.
                    </>
                  ) : documentKey === "privacy" && sectionId === "contact" && paragraph.includes("Terms of Use") ? (
                    <>
                      See also our{" "}
                      <Link to="/terms" className="public-auth-link">
                        Terms of Use
                      </Link>
                      .
                    </>
                  ) : (
                    renderTextWithInlineLinks(paragraph)
                  )}
                </p>
              ))}
            </section>
          );
        })}

        <p className="platform-legal-back">
          <Link to="/" className="public-auth-link">
            {t(`${base}.backHome`)}
          </Link>
        </p>
      </main>

      <Footer />
    </div>
  );
}