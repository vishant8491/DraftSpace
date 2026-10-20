import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { EditorToolbar } from './EditorToolbar';
import { Lock } from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable: boolean;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  editable,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[750px] text-slate-800 leading-relaxed',
      },
    },
  });

  // Keep editor content in sync when loaded/changed externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  // Keep editable status updated
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-slate-100">
      {/* Read-Only Warning Banner */}
      {!editable && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-amber-600" />
          <span>
            <strong>View-Only Access:</strong> You do not have permission to edit this document.
          </span>
        </div>
      )}

      {/* Formatting Toolbar */}
      <EditorToolbar editor={editor} disabled={!editable} />

      {/* Google Docs Style Document Surface */}
      <div className="flex-1 overflow-y-auto px-4 py-8 flex justify-center">
        <div className="w-full max-w-[850px] bg-white rounded shadow-sm border border-slate-200/90 p-8 sm:p-14 lg:p-16 min-h-[900px] mb-12">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
