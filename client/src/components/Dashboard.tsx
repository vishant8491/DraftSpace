import React, { useState } from 'react';
import { DocumentItem } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  UploadCloud,
  Search,
  FileText,
  Clock,
  Share2,
  Trash2,
  Edit3,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';

interface DashboardProps {
  ownedDocuments: DocumentItem[];
  sharedDocuments: DocumentItem[];
  onOpenDocument: (doc: DocumentItem) => void;
  onCreateNewDocument: () => void;
  onOpenImportModal: () => void;
  onOpenShareModal: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  ownedDocuments,
  sharedDocuments,
  onOpenDocument,
  onCreateNewDocument,
  onOpenImportModal,
  onOpenShareModal,
  onDeleteDocument,
  loading,
  error,
  onRetry,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'owned' | 'shared'>('owned');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const documentsToDisplay = activeTab === 'owned' ? ownedDocuments : sharedDocuments;
  const filteredDocuments = documentsToDisplay.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getPlainTextPreview = (content: any) => {
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      if (parsed && parsed.content && Array.isArray(parsed.content)) {
        const textParts: string[] = [];
        const extractText = (node: any) => {
          if (node.text) textParts.push(node.text);
          if (node.content && Array.isArray(node.content)) {
            node.content.forEach(extractText);
          }
        };
        parsed.content.forEach(extractText);
        return textParts.join(' ').slice(0, 140) || 'Empty document...';
      }
    } catch {
      // Fallback
    }
    return 'Empty document...';
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Workspace Header & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Active Demo: {currentUser?.displayName || 'Signed Out'}
            </span>
            {currentUser?.email && (
              <span className="text-xs text-slate-400">&bull; {currentUser.email}</span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Document Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
            Create, edit, and organize documents with role-based access and optimistic concurrency.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onCreateNewDocument}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-semibold text-xs sm:text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <Plus className="w-4 h-4" />
            <span>New document</span>
          </button>
          <button
            type="button"
            onClick={onOpenImportModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <UploadCloud className="w-4 h-4 text-slate-500" />
            <span>Import .txt</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-3">
        {/* Tab Pills: My Documents vs Shared with Me */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl max-w-xs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'owned'}
            onClick={() => setActiveTab('owned')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
              activeTab === 'owned'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>My documents</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'owned' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {ownedDocuments.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'shared'}
            onClick={() => setActiveTab('shared')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
              activeTab === 'shared'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Shared with me</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'shared' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {sharedDocuments.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            aria-label="Search documents by title"
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
          />
        </div>
      </div>

      {/* Document Grid / Rows */}
      {loading ? (
        <div className="py-20 text-center space-y-3" role="status">
          <div className="w-7 h-7 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading documents from database...</p>
        </div>
      ) : filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredDocuments.map((doc) => {
            const isOwner = doc.ownerId === currentUser?.id;
            return (
              <div
                key={doc.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenDocument(doc)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpenDocument(doc);
                }}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-400 hover:shadow-sm transition-all p-5 cursor-pointer flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* Role badge */}
                    {isOwner ? (
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                        Owner
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-md flex items-center gap-1">
                        <Edit3 className="w-3 h-3 text-slate-500" />
                        Shared Editor
                      </span>
                    )}

                    <span className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-50 rounded border border-slate-200">
                      v{doc.version}
                    </span>
                  </div>
                </div>

                {/* Title & Preview */}
                <div className="space-y-1.5 mb-4">
                  <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1 text-sm sm:text-base">
                    {doc.title || 'Untitled Document'}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {getPlainTextPreview(doc.content)}
                  </p>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatTimestamp(doc.updatedAt)}</span>
                  </div>

                  {/* Actions / Collaborator count */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {isOwner ? (
                      <>
                        <button
                          type="button"
                          aria-label={`Manage sharing for ${doc.title}`}
                          title="Manage sharing"
                          onClick={() => onOpenShareModal(doc)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${doc.title}`}
                          title="Delete document"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                              onDeleteDocument(doc.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                        By {doc.owner?.displayName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-14 sm:py-16 bg-white rounded-2xl border border-slate-200 text-center p-6 sm:p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900">
              {!currentUser
                ? 'No active demo session'
                : activeTab === 'owned'
                ? searchQuery
                  ? 'No matching documents found'
                  : 'No documents created yet'
                : 'No documents shared with this account'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              {!currentUser
                ? 'Please choose a demo account from the header dropdown to view or edit documents.'
                : activeTab === 'owned'
                ? 'Create a new document or import a text file to begin.'
                : 'When another user shares a document with this demo account, it will appear here.'}
            </p>
          </div>
          {currentUser && activeTab === 'owned' && !searchQuery && (
            <div className="pt-2 flex justify-center gap-2.5">
              <button
                type="button"
                onClick={onCreateNewDocument}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors"
              >
                Create document
              </button>
              <button
                type="button"
                onClick={onOpenImportModal}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Import .txt
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
