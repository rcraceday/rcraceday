import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  isExternalRichTextLink,
  resolveRichTextLinkHref,
  sanitizeRichTextHtml,
} from "@/app/lib/richText";

/**
 * Read-only rich text with working internal (SPA) and external links.
 */
export default function RichTextContent({ html, className = "", style }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);

  const onClick = useCallback(
    (event) => {
      const root = rootRef.current;
      if (!root) return;
      const anchor = event.target.closest("a");
      if (!anchor || !root.contains(anchor)) return;

      const rawHref = anchor.getAttribute("href");
      const href = resolveRichTextLinkHref(rawHref);
      if (!href) return;

      if (isExternalRichTextLink(rawHref)) {
        event.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }

      event.preventDefault();
      navigate(href);
    },
    [navigate]
  );

  return (
    <div
      ref={rootRef}
      className={className}
      style={style}
      onClick={onClick}
      dangerouslySetInnerHTML={{
        __html: sanitizeRichTextHtml(html),
      }}
    />
  );
}
