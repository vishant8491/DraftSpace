import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { TiptapEditor } from './components/TiptapEditor';
import { ShareModal } from './components/ShareModal';
import { ImportModal } from './components/ImportModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { DocumentItem } from './types';
import { api } from './api/client';

export const MainContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [ownedDocs, setOwnedDocs] = useState<DocumentItem[]>([]);
  const [sharedDocs, setSharedDocs] = useState<DocumentItem[]>([]);
  const [currentDocument, setCurrentDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'conflict'>('saved');
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveDataRef = useRef<{ title?: string; content?: any } | null>(null);

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load documents for active user
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.listDocuments();
      setOwnedDocs(res.owned);
      setSharedDocs(res.shared);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
      addToast('error', err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadDocuments();
      // Return to dashboard when user switches
      setCurrentDocument(null);
    }
  }, [loadDocuments, currentUser?.id]);

  // Execute Save with Optimistic Concurrency Control
  const performSave = async (id: string, version: number, data: { title?: string; content?: any }) => {
    try {
      setSaveStatus('saving');
      const res = await api.updateDocument(id, {
        version,
        ...data,
      });

      setCurrentDocument((prev) =>
        prev && prev.id === id ? { ...prev, ...res.document, version: res.version } : prev
      );
      setSaveStatus('saved');
      pendingSaveDataRef.current = null;
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONCURRENCY_CONFLICT') {
        setSaveStatus('conflict');
        addToast(
          'error',
          'Concurrency Conflict (409): Modified by another session. Please reload before saving.'
        );
      } else {
        setSaveStatus('unsaved');
        addToast('error', err.message || 'Failed to save changes');
      }
    }
  };

  // Debounced auto-save handler for editor content changes
  const handleContentChange = (newJsonContent: any) => {
    if (!currentDocument) return;

    setCurrentDocument((prev) => (prev ? { ...prev, content: newJsonContent } : null));
    setSaveStatus('unsaved');

    pendingSaveDataRef.current = {
      ...(pendingSaveDataRef.current || {}),
      content: newJsonContent,
    };

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      if (currentDocument && pendingSaveDataRef.current) {
        performSave(currentDocument.id, currentDocument.version, pendingSaveDataRef.current);
      }
    }, 1200);
  };

  // Title change handler (Owner only)
  const handleTitleChange = (newTitle: string) => {
    if (!currentDocument || currentDocument.ownerId !== currentUser?.id) return;

    setCurrentDocument((prev) => (prev ? { ...prev, title: newTitle } : null));
    setSaveStatus('unsaved');
    pendingSaveDataRef.current = {
      ...(pendingSaveDataRef.current || {}),
      title: newTitle,
    };
  };

  // Title blur immediate save
  const handleTitleBlur = () => {
    if (!currentDocument || currentDocument.ownerId !== currentUser?.id || !pendingSaveDataRef.current) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    performSave(currentDocument.id, currentDocument.version, pendingSaveDataRef.current);
  };

  // Manual save (Ctrl+S or button)
  const handleManualSave = () => {
    if (!currentDocument) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    const dataToSave = pendingSaveDataRef.current || {
      title: currentDocument.title,
      content: currentDocument.content,
    };
    performSave(currentDocument.id, currentDocument.version, dataToSave);
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDocument]);

  // Open Document
  const handleOpenDocument = async (doc: DocumentItem) => {
    try {
      setLoading(true);
      const res = await api.getDocument(doc.id);
      setCurrentDocument({
        ...res.document,
        role: res.role,
        version: res.version,
      });
      setSaveStatus('saved');
      pendingSaveDataRef.current = null;
    } catch (err: any) {
      console.error('Error fetching document details:', err);
      addToast('error', err.message || 'Unable to open document');
    } finally {
      setLoading(false);
    }
  };

  // Create New Document
  const handleCreateDocument = async () => {
    try {
      setLoading(true);
      const res = await api.createDocument({
        title: 'Untitled Document',
      });
      addToast('success', 'New document created');
      await loadDocuments();
      setCurrentDocument(res.document);
      setSaveStatus('saved');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string) => {
    try {
      await api.deleteDocument(id);
      addToast('success', 'Document deleted');
      await loadDocuments();
      if (currentDocument?.id === id) {
        setCurrentDocument(null);
      }
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete document');
    }
  };

  // File Import Success
  const handleImportSuccess = (newDoc: DocumentItem) => {
    addToast('success', `Imported "${newDoc.title}"`);
    loadDocuments();
    setCurrentDocument(newDoc);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation */}
      <Navbar
        currentDocument={currentDocument}
        onBackToDashboard={() => {
          if (pendingSaveDataRef.current && currentDocument) {
            performSave(currentDocument.id, currentDocument.version, pendingSaveDataRef.current);
          }
          setCurrentDocument(null);
          loadDocuments();
        }}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        saveStatus={saveStatus}
        onManualSave={handleManualSave}
        onTitleChange={handleTitleChange}
        onTitleBlur={handleTitleBlur}
      />

      {/* Main Body */}
      <main className="flex-1 flex flex-col">
        {currentDocument ? (
          <TiptapEditor
            key={currentDocument.id}
            documentId={currentDocument.id}
            content={currentDocument.content}
            onChange={handleContentChange}
            editable={true} // Shared editors and owners can edit content; title is owner-locked in header
          />
        ) : (
          <Dashboard
            ownedDocuments={ownedDocs}
            sharedDocuments={sharedDocs}
            onOpenDocument={handleOpenDocument}
            onCreateNewDocument={handleCreateDocument}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onOpenShareModal={(doc) => {
              setCurrentDocument(doc);
              setIsShareModalOpen(true);
            }}
            onDeleteDocument={handleDeleteDocument}
            loading={loading}
          />
        )}
      </main>

      {/* Share Modal */}
      {currentDocument && isShareModalOpen && (
        <ShareModal
          document={currentDocument}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onShareUpdated={() => {
            loadDocuments();
            if (currentDocument) {
              api.getDocument(currentDocument.id).then((res) => {
                setCurrentDocument({ ...res.document, role: res.role, version: res.version });
              });
            }
          }}
        />
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

export default App;
