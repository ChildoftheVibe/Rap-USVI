"use client";

import { Extension } from "@tiptap/core";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const FONT_SIZES = [
  { label: "Small", value: "13px" },
  { label: "Normal", value: "" },
  { label: "Large", value: "20px" },
  { label: "X-Large", value: "26px" },
  { label: "XX-Large", value: "34px" },
];

const TOOLBAR_BUTTON =
  "rounded-sm border border-outline-variant px-2.5 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";
const TOOLBAR_BUTTON_ACTIVE = "border-primary bg-primary text-white hover:text-white";

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ id, value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        link: false,
        strike: false,
      }),
      TextStyle,
      Color,
      FontSize,
    ],
    content: value,
    editorProps: {
      attributes: {
        id: id ?? "",
        spellcheck: "true",
        class:
          "min-h-[120px] w-full rounded-b-sm border border-t-0 border-outline-variant bg-surface px-4 py-2.5 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary [&_p]:mb-2 [&_p:last-child]:mb-0",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  function recheckSpelling() {
    const dom = editor?.view.dom;
    if (!(dom instanceof HTMLElement)) return;
    dom.setAttribute("spellcheck", "false");
    void dom.offsetHeight;
    dom.setAttribute("spellcheck", "true");
    dom.focus();
  }

  if (!editor) {
    return (
      <div className="min-h-[164px] w-full rounded-sm border border-outline-variant bg-surface px-4 py-2.5 text-sm text-on-surface-variant">
        Loading editor…
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-t-sm border border-outline-variant bg-surface-container-lowest p-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${TOOLBAR_BUTTON} font-bold ${editor.isActive("bold") ? TOOLBAR_BUTTON_ACTIVE : ""}`}
          aria-pressed={editor.isActive("bold")}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${TOOLBAR_BUTTON} italic ${editor.isActive("italic") ? TOOLBAR_BUTTON_ACTIVE : ""}`}
          aria-pressed={editor.isActive("italic")}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${TOOLBAR_BUTTON} underline ${editor.isActive("underline") ? TOOLBAR_BUTTON_ACTIVE : ""}`}
          aria-pressed={editor.isActive("underline")}
        >
          U
        </button>

        <span className="mx-1 h-6 w-px bg-outline-variant" aria-hidden="true" />

        <label className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
          Size
          <select
            value={editor.getAttributes("textStyle").fontSize ?? ""}
            onChange={(e) => {
              const newSize = e.target.value;
              if (newSize) {
                editor.chain().focus().setFontSize(newSize).run();
              } else {
                editor.chain().focus().unsetFontSize().run();
              }
            }}
            className="rounded-sm border border-outline-variant bg-surface px-1.5 py-1 text-xs"
          >
            {FONT_SIZES.map((size) => (
              <option key={size.label} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
          Color
          <input
            type="color"
            value={editor.getAttributes("textStyle").color || "#000000"}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="h-7 w-8 cursor-pointer rounded-sm border border-outline-variant bg-surface p-0.5"
          />
        </label>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetColor().run()}
          className={TOOLBAR_BUTTON}
        >
          Reset color
        </button>

        <span className="mx-1 h-6 w-px bg-outline-variant" aria-hidden="true" />

        <button type="button" onClick={recheckSpelling} className={TOOLBAR_BUTTON}>
          Check spelling
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
