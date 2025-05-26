
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
  onSave?: () => void; // Optional: if a save button is needed directly with the editor
  isSaveDisabled?: boolean; // Optional: to control save button state
}

const TiptapToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const isActive = (type: string, attrs?: Record<string, any>) => editor.isActive(type, attrs);
  const toggle = (type: string, attrs?: Record<string, any>) => editor.chain().focus()[type as keyof typeof editor.chain](attrs).run();

  const toolbarButtons = [
    { command: () => toggle('bold'), name: 'bold', icon: Bold, label: 'Negrito' },
    { command: () => toggle('italic'), name: 'italic', icon: Italic, label: 'Itálico' },
    { command: () => toggle('strike'), name: 'strike', icon: Strikethrough, label: 'Riscado' },
    { command: () => toggle('paragraph'), name: 'paragraph', icon: Pilcrow, label: 'Parágrafo' },
    { command: () => toggle('heading', { level: 2 }), name: 'heading', attrs: { level: 2 }, icon: Heading2, label: 'Título' },
    { command: () => toggle('bulletList'), name: 'bulletList', icon: List, label: 'Lista Marcadores' },
    { command: () => toggle('orderedList'), name: 'orderedList', icon: ListOrdered, label: 'Lista Numerada' },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-input p-2 bg-muted/50 rounded-t-md">
      {toolbarButtons.map((btn) => (
        <Button
          key={btn.name + (btn.attrs ? JSON.stringify(btn.attrs) : '')}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 p-1.5',
            isActive(btn.name, btn.attrs) ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
          )}
          onClick={btn.command}
          title={btn.label}
          aria-pressed={isActive(btn.name, btn.attrs)}
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
  onSave,
  isSaveDisabled,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable blockquote and codeBlock if not needed
        // blockquote: false,
        // codeBlock: false,
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
      {/* Optional: Save button integrated here if needed
      {onSave && (
        <div className="p-2 border-t border-input flex justify-end">
          <Button onClick={onSave} disabled={isSaveDisabled}>
            Salvar Observação
          </Button>
        </div>
      )}
      */}
    </div>
  );
};
