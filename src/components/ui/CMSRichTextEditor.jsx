import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef, useState } from "react";
import { fixRichTextLinkHtml } from "@/app/lib/richText";

export function normalizeLinkHref(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("https:///") || trimmed.startsWith("http:///")) {
    return trimmed.replace(/^https?:\/\//i, "");
  }
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  // `chargers-rc/app/events/...` without a leading slash
  if (/^[a-z0-9][a-z0-9-]*\/app\//i.test(trimmed)) return `/${trimmed}`;
  return `https://${trimmed}`;
}

function isInternalLinkHref(href) {
  if (!href) return false;
  return href.startsWith("/") || href.startsWith("#");
}

function linkAllowedUri(url, ctx) {
  const href = String(url || "").trim();
  if (!href) return false;
  if (isInternalLinkHref(href)) return true;
  return ctx.defaultValidate(href);
}

function defaultShouldAutoLink(url) {
  if (!url) return false;
  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
  const hasMaybeProtocol = /^[a-z][a-z0-9+.-]*:/i.test(url);
  if (hasProtocol || (hasMaybeProtocol && !url.includes("@"))) return true;
  const hostname = (url.includes("@") ? url.split("@").pop() : url).split(/[/?#:]/)[0];
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  if (!/\./.test(hostname)) return false;
  return true;
}

const AppLink = Link.extend({
  parseHTML() {
    return [
      {
        tag: "a[href]",
        getAttrs: (dom) => {
          const href = dom.getAttribute("href");
          if (!href) return false;
          const normalized = normalizeLinkHref(href);
          if (isInternalLinkHref(normalized)) return null;
          if (
            !this.options.isAllowedUri(normalized, {
              defaultValidate: (url) => {
                try {
                  const parsed = new URL(url, window.location.origin);
                  return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
                } catch {
                  return false;
                }
              },
              protocols: this.options.protocols,
              defaultProtocol: this.options.defaultProtocol,
            })
          ) {
            return false;
          }
          return null;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const href = normalizeLinkHref(HTMLAttributes.href || "");
    const attrs = { ...HTMLAttributes, href, rel: "noopener noreferrer" };
    const isRelative = isInternalLinkHref(href);
    let isSameOrigin = false;
    if (/^https?:\/\//i.test(href)) {
      try {
        isSameOrigin = new URL(href).origin === window.location.origin;
      } catch {
        isSameOrigin = false;
      }
    }
    if (!isRelative && !isSameOrigin) {
      attrs.target = "_blank";
    } else {
      delete attrs.target;
    }
    return ["a", attrs, 0];
  },
  addCommands() {
    return {
      ...this.parent?.(),
      setLink:
        (attributes) =>
        ({ chain }) => {
          const href = normalizeLinkHref(attributes?.href);
          if (!href) {
            return chain().unsetLink().run();
          }
          if (
            !linkAllowedUri(href, {
              defaultValidate: (url) => {
                try {
                  const parsed = new URL(url, window.location.origin);
                  return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol);
                } catch {
                  return false;
                }
              },
            })
          ) {
            return false;
          }
          return chain()
            .setMark(this.name, { ...attributes, href })
            .setMeta("preventAutolink", true)
            .run();
        },
    };
  },
});

function toolbarButtonProps(onClick) {
  return {
    type: "button",
    onMouseDown: (e) => e.preventDefault(),
    onClick,
  };
}

export default function CMSRichTextEditor({ value, onChange }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const selectionRef = useRef({ from: 0, to: 0 });
  const linkInputRef = useRef(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      AppLink.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        isAllowedUri: linkAllowedUri,
        shouldAutoLink: (url) => {
          if (isInternalLinkHref(url) || /^[a-z0-9][a-z0-9-]*\/app\//i.test(url)) {
            return false;
          }
          return defaultShouldAutoLink(url);
        },
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(fixRichTextLinkHtml(editor.getHTML()));
    },
  });

  const openLinkEditor = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;

    selectionRef.current = { from, to };
    const existing = editor.getAttributes("link").href || "";
    setLinkDraft(existing);
    setLinkOpen(true);
    requestAnimationFrame(() => linkInputRef.current?.focus());
  };

  const commitLink = () => {
    if (!editor) return;
    const { from, to } = selectionRef.current;
    const href = normalizeLinkHref(linkDraft);

    const chain = editor.chain().focus().setTextSelection({ from, to });

    if (!href) {
      chain.unsetLink().run();
    } else {
      chain.setLink({ href }).run();
    }

    setLinkOpen(false);
    setLinkDraft("");
  };

  const cancelLink = () => {
    setLinkOpen(false);
    setLinkDraft("");
    editor?.commands.focus();
  };

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <button {...toolbarButtonProps(() => editor.chain().focus().toggleBold().run())}>
          Bold
        </button>
        <button {...toolbarButtonProps(() => editor.chain().focus().toggleItalic().run())}>
          Italic
        </button>
        <button {...toolbarButtonProps(() => editor.chain().focus().toggleUnderline().run())}>
          Underline
        </button>
        <button
          {...toolbarButtonProps(() => editor.chain().focus().toggleBulletList().run())}
        >
          Bullets
        </button>
        <button
          {...toolbarButtonProps(() => editor.chain().focus().toggleOrderedList().run())}
        >
          Numbered
        </button>
        <button {...toolbarButtonProps(openLinkEditor)}>Link</button>
        <button
          {...toolbarButtonProps(() => {
            if (editor.isActive("link")) {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
            } else {
              editor.chain().focus().unsetLink().run();
            }
          })}
        >
          Remove Link
        </button>
      </div>

      {linkOpen && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #E5E7EB",
            background: "#F9FAFB",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <input
            ref={linkInputRef}
            type="text"
            value={linkDraft}
            placeholder="/your-club/app/events/… or https://…"
            onChange={(e) => setLinkDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitLink();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelLink();
              }
            }}
            style={{
              flex: "1 1 200px",
              minWidth: "160px",
              padding: "6px 10px",
              border: "1px solid #D1D5DB",
              borderRadius: "6px",
            }}
          />
          <button type="button" {...toolbarButtonProps(commitLink)}>Apply</button>
          <button type="button" {...toolbarButtonProps(cancelLink)}>Cancel</button>
        </div>
      )}

      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: "6px",
          padding: "12px",
          minHeight: "150px",
          background: "#fff",
        }}
      >
        <EditorContent editor={editor} className="tiptap" />
      </div>
    </div>
  );
}
