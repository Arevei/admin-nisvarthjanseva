"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function isActiveClass(active: boolean) {
  return active
    ? "border-rose-600 bg-rose-600 text-white"
    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50";
}

export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Placeholder.configure({
        placeholder: placeholder || "Write content here...",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value || "",
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
    editorProps: {
      attributes: {
        class:
          "min-h-48 rounded-b-xl border-x border-b border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML() === "<p></p>" ? "" : editor.getHTML();
    const incoming = value || "";
    if (current !== incoming) {
      editor.commands.setContent(incoming || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="rounded-xl border border-zinc-300 bg-zinc-100 p-3 text-sm text-zinc-500">Loading editor...</div>;
  }

  return (
    <div className="rounded-xl">
      <div className="flex flex-wrap gap-1 rounded-t-xl border border-zinc-300 bg-zinc-100 p-2">
        <button type="button" className={`rounded-md border px-2 py-1 text-xs ${isActiveClass(editor.isActive("bold"))}`} onClick={() => editor.chain().focus().toggleBold().run()}>
          Bold
        </button>
        <button type="button" className={`rounded-md border px-2 py-1 text-xs ${isActiveClass(editor.isActive("italic"))}`} onClick={() => editor.chain().focus().toggleItalic().run()}>
          Italic
        </button>
        <button type="button" className={`rounded-md border px-2 py-1 text-xs ${isActiveClass(editor.isActive("underline"))}`} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          Underline
        </button>
        <button type="button" className={`rounded-md border px-2 py-1 text-xs ${isActiveClass(editor.isActive("heading", { level: 2 }))}`} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </button>
        <button type="button" className={`rounded-md border px-2 py-1 text-xs ${isActiveClass(editor.isActive("bulletList"))}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          Bullet
        </button>
        <button type="button" className={`rounded-md border px-2 py-1 text-xs ${isActiveClass(editor.isActive("orderedList"))}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          Number
        </button>
        <button type="button" className={`rounded-md border px-2 py-1 text-xs ${isActiveClass(editor.isActive({ textAlign: "left" }))}`} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          Left
        </button>
        <button type="button" className={`rounded-md border px-2 py-1 text-xs ${isActiveClass(editor.isActive({ textAlign: "center" }))}`} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          Center
        </button>
        <button type="button" className={`rounded-md border px-2 py-1 text-xs ${isActiveClass(editor.isActive({ textAlign: "right" }))}`} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          Right
        </button>
        <button
          type="button"
          className={`rounded-md border px-2 py-1 text-xs ${isActiveClass(editor.isActive("link"))}`}
          onClick={() => {
            const existing = editor.getAttributes("link").href as string | undefined;
            const valueFromPrompt = window.prompt("Enter URL", existing || "");
            if (valueFromPrompt === null) return;
            if (!valueFromPrompt.trim()) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            editor.chain().focus().setLink({ href: valueFromPrompt.trim() }).run();
          }}
        >
          Link
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
