
'use client';

import type { Editor } from '@tiptap/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Pilcrow, // Changed from Type to Pilcrow for paragraph icon
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TiptapEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  onSave?: () => void;
  isSaveDisabled?: boolean;
}

const TiptapToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  // Define toolbar buttons with explicit commands and isActive checks
  const toolbarButtons = [
    {
      command: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
      icon: Bold,
      label: 'Negrito',
    },
    {
      command: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
      icon: Italic,
      label: 'Itálico',
    },
    {
      command: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
      icon: Strikethrough,
      label: 'Riscado',
    },
    {
      command: () => editor.chain().focus().setParagraph().run(),
      isActive: () => editor.isActive('paragraph'),
      icon: Pilcrow,
      label: 'Parágrafo',
    },
    {
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
      icon: Heading2,
      label: 'Título',
    },
    {
      command: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
      icon: List,
      label: 'Lista Marcadores',
    },
    {
      command: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
      icon: ListOrdered,
      label: 'Lista Numerada',
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-input p-2 bg-muted/50 rounded-t-md">
      {toolbarButtons.map((btn) => (
        <Button
          key={btn.label} // Use label as key for simplicity, assuming labels are unique
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 p-1.5',
            btn.isActive() ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
          )}
          onClick={btn.command}
          title={btn.label}
          aria-pressed={btn.isActive()}
        >
          <btn.icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
};

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit includes:
        // bold, italic, strike, paragraph, heading, bulletList, orderedList
        // code, codeBlock, blockquote, horizontalRule, hardBreak,
        // listItem, orderedList, bulletList, heading
        // Ensure defaults are not accidentally turned off if not explicitly configured
      }),
    ],
    content: content,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base max-w-none p-3 focus:outline-none min-h-[150px] w-full',
      },
    },
  });

  return (
    <div className="w-full border border-input rounded-md bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-ring">
      <TiptapToolbar editor={editor} />
      <EditorContent editor={editor} className="tiptap-editor-scroll" />
    </div>
  );
};
