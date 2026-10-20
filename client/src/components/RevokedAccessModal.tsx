import React, { useEffect, useRef } from 'react';
import { ShieldAlert, Copy, ArrowLeft } from 'lucide-react';

interface RevokedAccessModalProps {
  isOpen: boolean;
  onCopyDraft: () => void;
  onBackToDashboard: () => void;
}

export const RevokedAccessModal: React.FC<RevokedAccessModalProps> = ({
  isOpen,
  onCopyDraft,
  onBackToDashboard,
}) => {
  const copyBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    copyBtnRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoked-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full p-6 space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 id="revoked-modal-title" className="text-lg font-bold text-slate-900">
              Access Revoked
            </h2>
            <p className="text-xs text-rose-600 font-medium mt-0.5">
              Permissions removed by document owner
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Your access to this document has been revoked. The server rejected the latest write
          request (<code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">403 Forbidden</code>).
          Repeated autosave attempts have been stopped, but your local draft remains intact so you
          can copy your changes.
        </p>

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            ref={copyBtnRef}
            type="button"
            onClick={onCopyDraft}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs"
          >
            <Copy className="w-4 h-4" />
            <span>Copy local draft to clipboard</span>
          </button>

          <button
            type="button"
            onClick={onBackToDashboard}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to documents</span>
          </button>
        </div>
      </div>
    </div>
  );
};
