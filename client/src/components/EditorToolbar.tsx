import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Minus,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, disabled = false }) => {
  if (!editor) {
    return null;
  }

  const btnClass = (isActive: boolean) =>
    `p-1.5 rounded-md text-slate-700 transition-colors flex items-center justify-center ${
      disabled
        ? 'opacity-40 cursor-not-allowed'
        : isActive
        ? 'bg-brand-100 text-brand-700 font-semibold shadow-inner'
        : 'hover:bg-slate-200/80 active:bg-slate-300'
    }`;

  const separator = <div className="h-5 w-px bg-slate-300 mx-1" />;

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center gap-1 sticky top-0 z-20 shadow-sm">
      {/* History */}
      <button
        type="button"
        title="Undo (Ctrl+Z)"
        disabled={disabled || !editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
        className={btnClass(false)}
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Redo (Ctrl+Y)"
        disabled={disabled || !editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
        className={btnClass(false)}
      >
        <Redo2 className="w-4 h-4" />
      </button>

      {separator}

      {/* Headings */}
      <button
        type="button"
        title="Heading 1"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btnClass(editor.isActive('heading', { level: 1 }))}
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Heading 2"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnClass(editor.isActive('heading', { level: 2 }))}
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Heading 3"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnClass(editor.isActive('heading', { level: 3 }))}
      >
        <Heading3 className="w-4 h-4" />
      </button>

      {separator}

      {/* Formatting */}
      <button
        type="button"
        title="Bold (Ctrl+B)"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive('bold'))}
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Italic (Ctrl+I)"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive('italic'))}
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Underline (Ctrl+U)"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btnClass(editor.isActive('underline'))}
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>

      {separator}

      {/* Alignment */}
      <button
        type="button"
        title="Align Left"
        disabled={disabled}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={btnClass(editor.isActive({ textAlign: 'left' }))}
      >
        <AlignLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Align Center"
        disabled={disabled}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={btnClass(editor.isActive({ textAlign: 'center' }))}
      >
        <AlignCenter className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Align Right"
        disabled={disabled}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={btnClass(editor.isActive({ textAlign: 'right' }))}
      >
        <AlignRight className="w-4 h-4" />
      </button>

      {separator}

      {/* Lists */}
      <button
        type="button"
        title="Bullet List"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive('bulletList'))}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Numbered List"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnClass(editor.isActive('orderedList'))}
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      {separator}

      {/* Extras: Quote, Code block, Divider */}
      <button
        type="button"
        title="Quote"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnClass(editor.isActive('blockquote'))}
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Code Block"
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={btnClass(editor.isActive('codeBlock'))}
      >
        <Code className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Horizontal Rule"
        disabled={disabled}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btnClass(false)}
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
};
