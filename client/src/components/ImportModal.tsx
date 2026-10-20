import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { DocumentItem } from '../types';
import { X, UploadCloud, FileText, Check, Loader2, AlertCircle, RotateCcw } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (doc: DocumentItem) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus and Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleModalClose = () => {
    setFile(null);
    setTitle('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  const handleFileSelection = (selectedFile: File) => {
    setError(null);

    // 1. Case-insensitive extension check (.txt only)
    const isTxt = selectedFile.name.toLowerCase().endsWith('.txt');
    if (!isTxt) {
      setError('Only UTF-8 plain text (.txt) files are supported. Markdown (.md) and Word (.docx) are not supported.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Zero-byte check
    if (selectedFile.size === 0) {
      setError('The selected file is empty (0 bytes). Please choose a file containing text.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 3. 1 MiB limit check
    const MAX_SIZE = 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setError('File size exceeds the 1 MiB limit.');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFile(selectedFile);
    // Suggest document title from file name
    const defaultTitle = selectedFile.name.replace(/\.[^/.]+$/, '').trim() || 'Imported Document';
    setTitle(defaultTitle.slice(0, 120));

    // Reset input value so re-selecting the exact same file fires onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a UTF-8 .txt file to import.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.importTextFile(file, title.trim());
      onImportSuccess(res.document);
      handleModalClose();
    } catch (err: any) {
      setError(err.message || 'Failed to import document');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 id="import-modal-title" className="text-xl font-semibold text-slate-900">
              Import Document
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Support for UTF-8 <code className="text-xs font-semibold bg-slate-100 px-1 py-0.5 rounded text-slate-700">.txt</code> only (up to 1 MiB)
            </p>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            aria-label="Close import dialog"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3 text-sm bg-rose-50 text-rose-800 rounded-lg border border-rose-200 flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-500 hover:text-rose-700 p-0.5"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                fileInputRef.current?.click();
              }
            }}
            className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 ${
              isDragging
                ? 'border-brand-500 bg-brand-50'
                : file
                ? 'border-emerald-400 bg-emerald-50/40'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt,text/plain"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelection(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB &bull; Click to choose different file
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mb-2">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  Click to select or drag and drop
                </p>
                <p className="text-xs text-slate-400 mt-1">UTF-8 plain text (.txt) only &bull; Up to 1 MiB</p>
              </div>
            )}
          </div>

          {/* Title Input */}
          {file && (
            <div className="space-y-1.5">
              <label htmlFor="import-doc-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Document Title
              </label>
              <input
                id="import-doc-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title..."
                maxLength={120}
                required
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <p className="text-[11px] text-slate-400 text-right">{title.length}/120</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || submitting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Import &amp; Edit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
