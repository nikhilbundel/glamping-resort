'use client';

import { useEffect, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import {
  Bold, Italic, Underline as U, Strikethrough, Heading2, Heading3, Heading4, List, ListOrdered, Quote, Link2, Unlink, ImagePlus, Table as TableIcon,
  AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Minus, Rows3, Columns3, Trash2, Code2,
} from 'lucide-react';
import { MediaPicker } from '../media/MediaPicker';
import { cn } from '@/lib/utils';

function Tool({ on, active, label, children, disabled }: { on: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={on}
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      className={cn('inline-flex h-8 w-8 items-center justify-center rounded text-zinc-700 hover:bg-zinc-200 disabled:opacity-30 dark:text-zinc-300 dark:hover:bg-zinc-700', active && 'bg-zinc-200 text-emerald-700 dark:bg-zinc-700')}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onImage, onHtml, htmlMode }: { editor: Editor; onImage: () => void; onHtml: () => void; htmlMode: boolean }) {
  const c = () => editor.chain().focus();
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL (https://…, /page, mailto:, tel:)', prev || 'https://');
    if (url === null) return;
    if (!url) return c().extendMarkRange('link').unsetLink().run();
    c().extendMarkRange('link').setLink({ href: url }).run();
  };
  const inTable = editor.isActive('table');
  return (
    <div className="sticky top-0 z-10 flex flex-wrap gap-0.5 border-b border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/60" role="toolbar" aria-label="Formatting">
      <Tool label="Bold" on={() => c().toggleBold().run()} active={editor.isActive('bold')}><Bold className="h-4 w-4" /></Tool>
      <Tool label="Italic" on={() => c().toggleItalic().run()} active={editor.isActive('italic')}><Italic className="h-4 w-4" /></Tool>
      <Tool label="Underline" on={() => c().toggleUnderline().run()} active={editor.isActive('underline')}><U className="h-4 w-4" /></Tool>
      <Tool label="Strikethrough" on={() => c().toggleStrike().run()} active={editor.isActive('strike')}><Strikethrough className="h-4 w-4" /></Tool>
      <span className="mx-1 w-px bg-zinc-300 dark:bg-zinc-600" />
      <Tool label="Heading 2" on={() => c().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}><Heading2 className="h-4 w-4" /></Tool>
      <Tool label="Heading 3" on={() => c().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}><Heading3 className="h-4 w-4" /></Tool>
      <Tool label="Heading 4" on={() => c().toggleHeading({ level: 4 }).run()} active={editor.isActive('heading', { level: 4 })}><Heading4 className="h-4 w-4" /></Tool>
      <Tool label="Bullet list" on={() => c().toggleBulletList().run()} active={editor.isActive('bulletList')}><List className="h-4 w-4" /></Tool>
      <Tool label="Numbered list" on={() => c().toggleOrderedList().run()} active={editor.isActive('orderedList')}><ListOrdered className="h-4 w-4" /></Tool>
      <Tool label="Quote" on={() => c().toggleBlockquote().run()} active={editor.isActive('blockquote')}><Quote className="h-4 w-4" /></Tool>
      <Tool label="Divider" on={() => c().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Tool>
      <span className="mx-1 w-px bg-zinc-300 dark:bg-zinc-600" />
      <Tool label="Align left" on={() => c().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}><AlignLeft className="h-4 w-4" /></Tool>
      <Tool label="Align center" on={() => c().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}><AlignCenter className="h-4 w-4" /></Tool>
      <Tool label="Align right" on={() => c().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}><AlignRight className="h-4 w-4" /></Tool>
      <span className="mx-1 w-px bg-zinc-300 dark:bg-zinc-600" />
      <Tool label="Link" on={setLink} active={editor.isActive('link')}><Link2 className="h-4 w-4" /></Tool>
      <Tool label="Remove link" on={() => c().unsetLink().run()} disabled={!editor.isActive('link')}><Unlink className="h-4 w-4" /></Tool>
      <Tool label="Insert image" on={onImage}><ImagePlus className="h-4 w-4" /></Tool>
      <Tool label="Insert table" on={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></Tool>
      {inTable && (
        <>
          <Tool label="Add row" on={() => c().addRowAfter().run()}><Rows3 className="h-4 w-4" /></Tool>
          <Tool label="Add column" on={() => c().addColumnAfter().run()}><Columns3 className="h-4 w-4" /></Tool>
          <Tool label="Delete table" on={() => c().deleteTable().run()}><Trash2 className="h-4 w-4" /></Tool>
        </>
      )}
      <span className="mx-1 w-px bg-zinc-300 dark:bg-zinc-600" />
      <Tool label="Undo" on={() => c().undo().run()}><Undo2 className="h-4 w-4" /></Tool>
      <Tool label="Redo" on={() => c().redo().run()}><Redo2 className="h-4 w-4" /></Tool>
      <Tool label="Edit HTML" on={onHtml} active={htmlMode}><Code2 className="h-4 w-4" /></Tool>
    </div>
  );
}

export function RichTextEditor({ value, onChange, id }: { value: string; onChange: (html: string) => void; id: string }) {
  const [picker, setPicker] = useState(false);
  const [htmlMode, setHtmlMode] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    editorProps: { attributes: { id, class: 'prose prose-sm max-w-none min-h-[160px] px-4 py-3 outline-none dark:prose-invert prose-table:border prose-td:border prose-td:px-2 prose-th:border prose-th:px-2' } },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Sync external resets (e.g. restoring a revision) without fighting the cursor
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const cur = editor.getHTML();
    if ((value || '') !== cur && !(cur === '<p></p>' && !value)) editor.commands.setContent(value || '', false);
  }, [value, editor]);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900">
      {editor && <Toolbar editor={editor} onImage={() => setPicker(true)} onHtml={() => setHtmlMode((m) => !m)} htmlMode={htmlMode} />}
      {htmlMode ? (
        <textarea
          aria-label="HTML source"
          className="min-h-[220px] w-full bg-zinc-950 p-3 font-mono text-xs text-zinc-100 outline-none"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            editor?.commands.setContent(e.target.value, false);
          }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      <MediaPicker open={picker} onClose={() => setPicker(false)} onSelect={([m]) => m && editor?.chain().focus().setImage({ src: m.url, alt: m.alt }).run()} />
    </div>
  );
}
