import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { useEffect, useRef, useState } from "react";

function normalizeLinkHref(url) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

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
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
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
            type="url"
            value={linkDraft}
            placeholder="https://example.com"
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
