
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
  Pilcrow,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TiptapEditorProps {
  content: string;
  onChange: (newContent: string) => void;
}

const TiptapToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const toolbarButtons = [
    {
      command: () => editor.chain().focus().toggleBold().run(),
      isActive: () => editor.isActive('bold'),
      icon: Bold,
      label: 'Negrito',
      canExecute: () => editor.can().chain().focus().toggleBold().run(),
    },
    {
      command: () => editor.chain().focus().toggleItalic().run(),
      isActive: () => editor.isActive('italic'),
      icon: Italic,
      label: 'Itálico',
      canExecute: () => editor.can().chain().focus().toggleItalic().run(),
    },
    {
      command: () => editor.chain().focus().toggleStrike().run(),
      isActive: () => editor.isActive('strike'),
      icon: Strikethrough,
      label: 'Riscado',
      canExecute: () => editor.can().chain().focus().toggleStrike().run(),
    },
    {
      command: () => editor.chain().focus().setParagraph().run(),
      isActive: () => editor.isActive('paragraph'),
      icon: Pilcrow,
      label: 'Parágrafo',
      canExecute: () => editor.can().chain().focus().setParagraph().run(),
    },
    {
      command: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: () => editor.isActive('heading', { level: 2 }),
      icon: Heading2,
      label: 'Título',
      canExecute: () => editor.can().chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      command: () => editor.chain().focus().toggleBulletList().run(),
      isActive: () => editor.isActive('bulletList'),
      icon: List,
      label: 'Lista Marcadores',
      canExecute: () => editor.can().chain().focus().toggleBulletList().run(),
    },
    {
      command: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: () => editor.isActive('orderedList'),
      icon: ListOrdered,
      label: 'Lista Numerada',
      canExecute: () => editor.can().chain().focus().toggleOrderedList().run(),
    },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-input p-2 bg-muted/50 rounded-t-md">
      {toolbarButtons.map((btn) => (
        <Button
          key={btn.label}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 p-1.5',
            btn.isActive() ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
          )}
          onClick={btn.command}
          disabled={!btn.canExecute()}
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
        // Defaults should be fine for basic lists
      }),
    ],
    content: content,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'tiptap-editable-area p-3 focus:outline-none min-h-[150px] w-full text-sm leading-relaxed', // Added tiptap-editable-area
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
