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
        return textParts.join(' ').slice(0, 150) || 'Empty document...';
      }
    } catch {
      // Fallback
    }
    return 'Empty document...';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-brand-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold tracking-wide">
              Active Demo: {currentUser?.displayName}
            </span>
            <span className="text-white/60 text-xs">&bull; Strict RBAC &amp; Optimistic Concurrency</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            DraftSpace Document Hub
          </h1>
          <p className="text-sm text-brand-100 max-w-xl">
            Create, format, and share documents with atomic versioning.
            Only owners can rename or manage sharing; shared editors can edit content.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onCreateNewDocument}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-brand-700 hover:bg-brand-50 rounded-xl font-semibold text-sm shadow-sm transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Document</span>
          </button>
          <button
            onClick={onOpenImportModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500/30 hover:bg-brand-500/40 text-white border border-white/20 rounded-xl font-medium text-sm transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import .txt</span>
          </button>
        </div>
      </div>

      {/* Filter & Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Tab Pills: Owned vs Shared */}
        <div className="flex items-center p-1 bg-slate-200/70 rounded-xl max-w-sm">
          <button
            onClick={() => setActiveTab('owned')}
            className={`flex-1 py-1.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'owned'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>My Documents</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'owned'
                  ? 'bg-brand-100 text-brand-700'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {ownedDocuments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('shared')}
            className={`flex-1 py-1.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'shared'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Shared with me</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'shared'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {sharedDocuments.length}
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents by title..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs"
          />
        </div>
      </div>

      {/* Document Grid / List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading documents...</p>
        </div>
      ) : filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((doc) => {
            const isOwner = doc.ownerId === currentUser?.id;
            return (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
                className="group bg-white rounded-2xl border border-slate-200/90 hover:border-brand-400 hover:shadow-md transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between relative overflow-hidden"
              >
                {/* Top Row: Icon & Status Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Role badge */}
                    {isOwner ? (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                        Owner
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 rounded-md flex items-center gap-1">
                        <Edit3 className="w-3 h-3" />
                        Shared Editor
                      </span>
                    )}

                    <span className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-100 rounded border border-slate-200">
                      v{doc.version}
                    </span>
                  </div>
                </div>

                {/* Document Title & Content Preview */}
                <div className="space-y-1.5 mb-4">
                  <h3 className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1 text-base">
                    {doc.title || 'Untitled Document'}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {getPlainTextPreview(doc.content)}
                  </p>
                </div>

                {/* Footer Metadata & Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatTimestamp(doc.updatedAt)}</span>
                  </div>

                  {/* Actions / Owner Info */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {isOwner ? (
                      <>
                        <button
                          type="button"
                          title="Manage sharing"
                          onClick={() => onOpenShareModal(doc)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-md hover:bg-brand-50 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete document"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                              onDeleteDocument(doc.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <span className="truncate max-w-[120px]">
                          By {doc.owner?.displayName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 bg-white rounded-3xl border border-slate-200 text-center p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">
              {activeTab === 'owned'
                ? searchQuery
                  ? 'No documents matched your search'
                  : 'No documents created yet'
                : 'No documents shared with you yet'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {activeTab === 'owned'
                ? 'Create a document or import a .txt file to start writing with rich formatting.'
                : 'Documents shared with your demo account will appear here. Try switching between Alice, Bob, and Charlie to test sharing!'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
