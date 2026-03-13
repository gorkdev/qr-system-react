import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ToolbarButton = ({ onClick, isActive, children, title }) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    title={title}
    className={cn(
      "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const Toolbar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Kalın"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="İtalik"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        isActive={editor.isActive("heading", { level: 2 })}
        title="Başlık"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Madde listesi"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numaralı liste"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Alıntı"
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="mx-1 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        isActive={false}
        title="Geri al"
      >
        <Undo className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        isActive={false}
        title="İleri al"
      >
        <Redo className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  );
};

const RichEditor = ({ content = "", onChange, placeholder = "" }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none px-3 py-2 min-h-[120px] focus:outline-none text-sm",
      },
    },
  });

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichEditor;
