import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Copy, RefreshCw, ArrowUpRight, X } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyDraft: () => void;
  onReloadServerVersion: () => void;
  onForceOverwrite: () => void;
  serverVersion: number;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  onCopyDraft,
  onReloadServerVersion,
  onForceOverwrite,
  serverVersion,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const copyBtnRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape listener
  useEffect(() => {
    if (!isOpen) return;

    copyBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="conflict-title" className="text-lg font-semibold text-slate-900">
                Version Conflict (409)
              </h2>
              <p className="text-xs text-slate-500">
                Server has updated to version <strong className="font-mono">v{serverVersion}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close conflict dialog"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Another session or user has saved changes to this document while you were editing.
          To prevent accidentally overwriting their work, autosave has been paused.
          Your local unsaved draft is completely preserved.
        </p>

        <div className="space-y-2.5 pt-1">
          {/* Action 1: Copy Draft */}
          <button
            ref={copyBtnRef}
            type="button"
            onClick={onCopyDraft}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-slate-500" />
              <span>Copy my local draft to clipboard</span>
            </span>
            <span className="text-xs text-slate-400 font-normal">Safe</span>
          </button>

          {/* Action 2: Reload Server Version */}
          <button
            type="button"
            onClick={onReloadServerVersion}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100/80 border border-brand-200 rounded-xl transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-brand-600" />
              <span>Reload latest server version</span>
            </span>
            <span className="text-xs text-brand-600/70 font-normal">Recommended</span>
          </button>

          {/* Action 3: Force Save */}
          <button
            type="button"
            onClick={onForceOverwrite}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-500" />
              <span>Overwrite with my draft (advance to v{serverVersion})</span>
            </span>
          </button>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Keep Editing Local Draft
          </button>
        </div>
      </div>
    </div>
  );
};
