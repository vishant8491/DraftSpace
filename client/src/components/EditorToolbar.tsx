import React from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
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

  // Prevent default mousedown to retain editor text selection when clicking toolbar buttons
  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const btnClass = (isActive: boolean, isActionDisabled: boolean = false) =>
    `p-1.5 rounded-md text-slate-700 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-500 ${
      disabled || isActionDisabled
        ? 'opacity-40 cursor-not-allowed text-slate-400'
        : isActive
        ? 'bg-brand-100 text-brand-800 font-semibold shadow-inner'
        : 'hover:bg-slate-200/80 active:bg-slate-300'
    }`;

  const separator = <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />;

  return (
    <div
      role="toolbar"
      aria-label="Document formatting toolbar"
      className="bg-slate-50 border-b border-slate-200 px-3 sm:px-4 py-1.5 flex flex-wrap items-center gap-1 sticky top-0 z-20 shadow-xs"
    >
      {/* History Controls */}
      <button
        type="button"
        aria-label="Undo edit (Ctrl+Z)"
        title="Undo (Ctrl+Z)"
        disabled={disabled || !editor.can().undo()}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().undo().run()}
        className={btnClass(false, !editor.can().undo())}
      >
        <Undo2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        aria-label="Redo edit (Ctrl+Y)"
        title="Redo (Ctrl+Y)"
        disabled={disabled || !editor.can().redo()}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().redo().run()}
        className={btnClass(false, !editor.can().redo())}
      >
        <Redo2 className="w-4 h-4" />
      </button>

      {separator}

      {/* Headings & Paragraph */}
      <button
        type="button"
        aria-label="Paragraph text"
        title="Normal text"
        aria-pressed={editor.isActive('paragraph')}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={btnClass(editor.isActive('paragraph') && !editor.isActive('heading'))}
      >
        <Pilcrow className="w-4 h-4" />
      </button>

      <button
        type="button"
        aria-label="Heading 1"
        title="Heading 1"
        aria-pressed={editor.isActive('heading', { level: 1 })}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={btnClass(editor.isActive('heading', { level: 1 }))}
      >
        <Heading1 className="w-4 h-4" />
      </button>

      <button
        type="button"
        aria-label="Heading 2"
        title="Heading 2"
        aria-pressed={editor.isActive('heading', { level: 2 })}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={btnClass(editor.isActive('heading', { level: 2 }))}
      >
        <Heading2 className="w-4 h-4" />
      </button>

      <button
        type="button"
        aria-label="Heading 3"
        title="Heading 3"
        aria-pressed={editor.isActive('heading', { level: 3 })}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={btnClass(editor.isActive('heading', { level: 3 }))}
      >
        <Heading3 className="w-4 h-4" />
      </button>

      {separator}

      {/* Inline Marks: Bold, Italic, Underline */}
      <button
        type="button"
        aria-label="Bold formatting (Ctrl+B)"
        title="Bold (Ctrl+B)"
        aria-pressed={editor.isActive('bold')}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={btnClass(editor.isActive('bold'))}
      >
        <Bold className="w-4 h-4" />
      </button>

      <button
        type="button"
        aria-label="Italic formatting (Ctrl+I)"
        title="Italic (Ctrl+I)"
        aria-pressed={editor.isActive('italic')}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={btnClass(editor.isActive('italic'))}
      >
        <Italic className="w-4 h-4" />
      </button>

      <button
        type="button"
        aria-label="Underline formatting (Ctrl+U)"
        title="Underline (Ctrl+U)"
        aria-pressed={editor.isActive('underline')}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={btnClass(editor.isActive('underline'))}
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>

      {separator}

      {/* Alignment */}
      <button
        type="button"
        aria-label="Align left"
        title="Align left"
        aria-pressed={editor.isActive({ textAlign: 'left' })}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={btnClass(editor.isActive({ textAlign: 'left' }))}
      >
        <AlignLeft className="w-4 h-4" />
      </button>

      <button
        type="button"
        aria-label="Align center"
        title="Align center"
        aria-pressed={editor.isActive({ textAlign: 'center' })}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={btnClass(editor.isActive({ textAlign: 'center' }))}
      >
        <AlignCenter className="w-4 h-4" />
      </button>

      <button
        type="button"
        aria-label="Align right"
        title="Align right"
        aria-pressed={editor.isActive({ textAlign: 'right' })}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={btnClass(editor.isActive({ textAlign: 'right' }))}
      >
        <AlignRight className="w-4 h-4" />
      </button>

      {separator}

      {/* Lists */}
      <button
        type="button"
        aria-label="Bulleted list"
        title="Bulleted list"
        aria-pressed={editor.isActive('bulletList')}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={btnClass(editor.isActive('bulletList'))}
      >
        <List className="w-4 h-4" />
      </button>

      <button
        type="button"
        aria-label="Numbered list"
        title="Numbered list"
        aria-pressed={editor.isActive('orderedList')}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={btnClass(editor.isActive('orderedList'))}
      >
        <ListOrdered className="w-4 h-4" />
      </button>

      {separator}

      {/* Extra Block Elements */}
      <button
        type="button"
        aria-label="Blockquote"
        title="Blockquote"
        aria-pressed={editor.isActive('blockquote')}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={btnClass(editor.isActive('blockquote'))}
      >
        <Quote className="w-4 h-4" />
      </button>

      <button
        type="button"
        aria-label="Code block"
        title="Code block"
        aria-pressed={editor.isActive('codeBlock')}
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={btnClass(editor.isActive('codeBlock'))}
      >
        <Code className="w-4 h-4" />
      </button>

      <button
        type="button"
        aria-label="Horizontal rule divider"
        title="Horizontal rule"
        disabled={disabled}
        onMouseDown={handleToolbarMouseDown}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={btnClass(false)}
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
};
