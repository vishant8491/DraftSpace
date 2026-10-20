import React, { useEffect, useRef } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSaveAndProceed: () => void;
  onDiscardAndProceed: () => void;
  onCancel: () => void;
  saving?: boolean;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onSaveAndProceed,
  onDiscardAndProceed,
  onCancel,
  saving = false,
}) => {
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    saveBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="unsaved-title" className="text-base font-semibold text-slate-900">
                Unsaved Changes
              </h2>
              <p className="text-xs text-slate-500">You have edits that are not yet saved.</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            aria-label="Cancel navigation"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600">
          Leaving this page now might result in lost changes if network synchronization has not completed.
        </p>

        <div className="pt-2 flex flex-col gap-2">
          <button
            ref={saveBtnRef}
            type="button"
            disabled={saving}
            onClick={onSaveAndProceed}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save & Proceed'}
          </button>

          <button
            type="button"
            onClick={onDiscardAndProceed}
            className="w-full py-2 px-4 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
          >
            Discard Changes &amp; Leave
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 px-4 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Stay Here
          </button>
        </div>
      </div>
    </div>
  );
};
