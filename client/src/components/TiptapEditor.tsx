import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { EditorToolbar } from './EditorToolbar';
import { Lock } from 'lucide-react';

interface TiptapEditorProps {
  content: any;
  onChange: (jsonContent: any) => void;
  editable: boolean;
  documentId: string;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  editable,
  documentId,
}) => {
  const [editorReady, setEditorReady] = useState(false);
  const currentDocIdRef = useRef<string>(documentId);

  const parseContent = (val: any) => {
    if (!val) {
      return { type: 'doc', content: [{ type: 'paragraph' }] };
    }
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: val }] }],
        };
      }
    }
    return val;
  };

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
    content: parseContent(content),
    editable,
    onCreate: () => {
      setEditorReady(true);
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[700px] text-slate-800 leading-relaxed font-sans text-base max-w-none',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Document content editor',
      },
    },
  });

  // Re-sync editor content ONLY when documentId changes (prevents caret reset on save!)
  useEffect(() => {
    if (editor && documentId !== currentDocIdRef.current) {
      currentDocIdRef.current = documentId;
      editor.commands.setContent(parseContent(content), false);
    }
  }, [documentId, content, editor]);

  // Keep editable permissions updated
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100vh-57px)] bg-slate-100 overflow-x-hidden">
      {/* Read-Only Warning Banner */}
      {!editable && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs sm:text-sm text-amber-800 flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>View-Only:</strong> You do not have permissions to edit this document.
          </span>
        </div>
      )}

      {/* Formatting Toolbar */}
      <EditorToolbar editor={editor} disabled={!editable || !editorReady} />

      {/* Document Workspace Canvas */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-6 sm:py-10 flex justify-center">
        <div className="w-full max-w-[850px] bg-white rounded-sm shadow-xs border border-slate-200/80 px-6 py-10 sm:px-14 sm:py-16 min-h-[850px] mb-16 transition-shadow focus-within:shadow-md">
          {!editorReady ? (
            <div className="space-y-4 animate-pulse pt-4">
              <div className="h-8 bg-slate-200 rounded w-1/2 mb-6" />
              <div className="h-4 bg-slate-100 rounded w-full" />
              <div className="h-4 bg-slate-100 rounded w-5/6" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
            </div>
          ) : (
            <EditorContent editor={editor} />
          )}
        </div>
      </div>
    </div>
  );
};
