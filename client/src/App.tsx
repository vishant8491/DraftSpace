import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, SaveStatus } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { TiptapEditor } from './components/TiptapEditor';
import { ShareModal } from './components/ShareModal';
import { ImportModal } from './components/ImportModal';
import { ConflictModal } from './components/ConflictModal';
import { UnsavedChangesModal } from './components/UnsavedChangesModal';
import { RevokedAccessModal } from './components/RevokedAccessModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { DocumentItem } from './types';
import { api } from './api/client';

export const MainContent: React.FC = () => {
  const { currentUser, switchUser, logout } = useAuth();
  const [ownedDocs, setOwnedDocs] = useState<DocumentItem[]>([]);
  const [sharedDocs, setSharedDocs] = useState<DocumentItem[]>([]);
  const [currentDocument, setCurrentDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  // Modals state
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState<boolean>(false);
  const [conflictServerVersion, setConflictServerVersion] = useState<number>(1);
  const [pendingNavigationAction, setPendingNavigationAction] = useState<(() => void) | null>(null);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState<boolean>(false);
  const [isRevokedModalOpen, setIsRevokedModalOpen] = useState<boolean>(false);

  // Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // State refs for save serialization and cancellation
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const hasPendingEditsRef = useRef<boolean>(false);
  const pendingDataRef = useRef<{ title?: string; content?: any }>({});
  const editRevisionRef = useRef<number>(0);
  const savedRevisionRef = useRef<number>(0);
  const currentDocRef = useRef<DocumentItem | null>(null);
  const loadRequestIdRef = useRef<number>(0);

  currentDocRef.current = currentDocument;

  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Dedicated URL parser: extracts docId from #/document/:id or /document/:id
  const getDocumentIdFromUrl = (): string | null => {
    const hash = window.location.hash;
    const match = hash.match(/#\/document\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];

    const path = window.location.pathname;
    const pathMatch = path.match(/\/document\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && pathMatch[1]) return pathMatch[1];

    return null;
  };

  // URL updater
  const updateUrl = (docId: string | null) => {
    if (docId) {
      if (window.location.hash !== `#/document/${docId}`) {
        window.history.pushState(null, '', `#/document/${docId}`);
      }
    } else {
      if (window.location.hash && window.location.hash !== '#/' && window.location.hash !== '') {
        window.history.pushState(null, '', '#/');
      }
    }
  };

  // Load documents for current user
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.listDocuments();
      setOwnedDocs(res.owned);
      setSharedDocs(res.shared);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
      setError(err.message || 'Failed to load documents');
      addToast('error', err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch a document by ID with stale load cancellation
  const fetchAndOpenDocument = useCallback(
    async (id: string) => {
      const requestId = ++loadRequestIdRef.current;
      try {
        setLoading(true);
        setError(null);
        const res = await api.getDocument(id);

        // Cancel if a newer load request arrived
        if (requestId !== loadRequestIdRef.current) return;

        setCurrentDocument({
          ...res.document,
          role: res.role,
          version: res.version,
        });
        setSaveStatus('saved');
        pendingDataRef.current = {};
        hasPendingEditsRef.current = false;
        editRevisionRef.current = 0;
        savedRevisionRef.current = 0;
        updateUrl(id);
      } catch (err: any) {
        if (requestId !== loadRequestIdRef.current) return;
        console.error('Failed to open document:', err);
        const msg =
          err.status === 403 || err.code === 'FORBIDDEN'
            ? 'Access Denied: You do not have permission to view or edit this document.'
            : err.message || 'Unable to open document';
        setError(msg);
        addToast('error', msg);
        updateUrl(null);
        setCurrentDocument(null);
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Synchronize on load and user change
  useEffect(() => {
    if (!currentUser) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      isSavingRef.current = false;
      hasPendingEditsRef.current = false;
      pendingDataRef.current = {};
      editRevisionRef.current = 0;
      savedRevisionRef.current = 0;
      setOwnedDocs([]);
      setSharedDocs([]);
      setCurrentDocument(null);
      updateUrl(null);
      setIsRevokedModalOpen(false);
      setIsConflictModalOpen(false);
      setIsUnsavedModalOpen(false);
      setIsShareModalOpen(false);
      setIsImportModalOpen(false);
      return;
    }

    // Reset pending editor state and modals safely when switching accounts
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    isSavingRef.current = false;
    hasPendingEditsRef.current = false;
    pendingDataRef.current = {};
    editRevisionRef.current = 0;
    savedRevisionRef.current = 0;
    setIsRevokedModalOpen(false);
    setIsConflictModalOpen(false);
    setIsUnsavedModalOpen(false);
    setIsShareModalOpen(false);
    setIsImportModalOpen(false);

    loadDocuments();

    // Check if initial URL points to a document
    const initialDocId = getDocumentIdFromUrl();
    if (initialDocId) {
      fetchAndOpenDocument(initialDocId);
    } else {
      setCurrentDocument(null);
      updateUrl(null);
    }
  }, [currentUser?.id, fetchAndOpenDocument, loadDocuments]);

  // Handle browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const docId = getDocumentIdFromUrl();
      if (docId) {
        if (currentDocRef.current?.id !== docId) {
          fetchAndOpenDocument(docId);
        }
      } else {
        setCurrentDocument(null);
        loadDocuments();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [fetchAndOpenDocument, loadDocuments]);

  // Warn before browser tab close/reload if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingEditsRef.current || saveStatus === 'unsaved' || saveStatus === 'conflict') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
        return 'You have unsaved changes.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  // Serialized Save Engine: executes one save at a time against current version
  const executeSave = async (overrideVersion?: number): Promise<boolean> => {
    const doc = currentDocRef.current;
    if (!doc) return false;

    // Concurrency lock: do not launch overlapping requests
    if (isSavingRef.current) {
      hasPendingEditsRef.current = true;
      return false;
    }

    const payload = { ...pendingDataRef.current };
    if (!payload.title && !payload.content) {
      setSaveStatus('saved');
      return true;
    }

    const versionToUse = overrideVersion !== undefined ? overrideVersion : doc.version;
    const revisionAtSaveStart = editRevisionRef.current;

    try {
      isSavingRef.current = true;
      setSaveStatus('saving');

      const res = await api.updateDocument(doc.id, {
        version: versionToUse,
        ...payload,
      });

      // Acknowledged by backend
      setCurrentDocument((prev) =>
        prev && prev.id === doc.id
          ? {
              ...prev,
              ...res.document,
              version: res.version,
            }
          : prev
      );

      savedRevisionRef.current = revisionAtSaveStart;

      // Ensure save response for document A cannot overwrite document B's save indicator or queue saves
      if (currentDocRef.current?.id !== doc.id) {
        return true;
      }

      // Check if newer edits occurred while request was in-flight
      if (editRevisionRef.current > revisionAtSaveStart) {
        setSaveStatus('unsaved');
        hasPendingEditsRef.current = true;
        // Schedule next debounced save with incremented version
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          executeSave(res.version);
        }, 800);
      } else {
        setSaveStatus('saved');
        hasPendingEditsRef.current = false;
        pendingDataRef.current = {};
      }

      return true;
    } catch (err: any) {
      if (err.status === 409 || err.code === 'CONCURRENCY_CONFLICT') {
        setSaveStatus('conflict');
        if (err.currentVersion) {
          setConflictServerVersion(err.currentVersion);
        }
        setIsConflictModalOpen(true);
      } else if (err.status === 403 || err.code === 'FORBIDDEN') {
        // Access revoked by owner: permanently stop repeated autosave attempts
        setSaveStatus('error');
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
        hasPendingEditsRef.current = false;
        setIsRevokedModalOpen(true);
      } else {
        setSaveStatus('error');
        addToast('error', err.message || 'Failed to save changes.');
      }
      return false;
    } finally {
      isSavingRef.current = false;
    }
  };

  // Debounced auto-save handler for editor content changes (800ms debounce)
  const handleContentChange = (newJsonContent: any) => {
    if (!currentDocument) return;

    editRevisionRef.current++;
    hasPendingEditsRef.current = true;
    setSaveStatus('unsaved');

    pendingDataRef.current.content = newJsonContent;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Stop autosaving if in conflict mode
    if (saveStatus === 'conflict') return;

    autoSaveTimerRef.current = setTimeout(() => {
      executeSave();
    }, 800);
  };

  // Title change handler (Owner only)
  const handleTitleChange = (newTitle: string) => {
    if (!currentDocument || currentDocument.ownerId !== currentUser?.id) return;

    const clampedTitle = newTitle.slice(0, 120);
    editRevisionRef.current++;
    hasPendingEditsRef.current = true;
    setSaveStatus('unsaved');

    setCurrentDocument((prev) => (prev ? { ...prev, title: clampedTitle } : null));
    pendingDataRef.current.title = clampedTitle;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (saveStatus === 'conflict') return;

    autoSaveTimerRef.current = setTimeout(() => {
      executeSave();
    }, 800);
  };

  // Title blur immediate save with empty title fallback
  const handleTitleBlur = () => {
    if (!currentDocument || currentDocument.ownerId !== currentUser?.id) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    const trimmedTitle = currentDocument.title.trim();
    if (!trimmedTitle) {
      const fallbackTitle = 'Untitled Document';
      setCurrentDocument((prev) => (prev ? { ...prev, title: fallbackTitle } : null));
      pendingDataRef.current.title = fallbackTitle;
    }
    if (saveStatus !== 'conflict' && hasPendingEditsRef.current) {
      executeSave();
    }
  };

  // Manual save action (Ctrl+S or Save button)
  const handleManualSave = () => {
    if (!currentDocument) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    executeSave();
  };

  // Retry save
  const handleRetrySave = () => {
    executeSave();
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
  });

  // Navigation Guard: check for unsaved edits before navigating
  const attemptNavigation = (action: () => void) => {
    if (hasPendingEditsRef.current || saveStatus === 'unsaved' || saveStatus === 'conflict') {
      setPendingNavigationAction(() => action);
      setIsUnsavedModalOpen(true);
    } else {
      action();
    }
  };

  const handleConfirmSaveAndLeave = async () => {
    setIsUnsavedModalOpen(false);
    const success = await executeSave();
    if (success) {
      pendingNavigationAction?.();
    } else {
      addToast('error', 'Save was not acknowledged. Remaining on document.');
    }
    setPendingNavigationAction(null);
  };

  const handleConfirmDiscardAndLeave = () => {
    setIsUnsavedModalOpen(false);
    hasPendingEditsRef.current = false;
    pendingDataRef.current = {};
    setSaveStatus('saved');
    pendingNavigationAction?.();
    setPendingNavigationAction(null);
  };

  // Open Document from dashboard
  const handleOpenDocument = (doc: DocumentItem) => {
    attemptNavigation(() => {
      fetchAndOpenDocument(doc.id);
    });
  };

  // Return to Dashboard
  const handleBackToDashboard = () => {
    attemptNavigation(() => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      setCurrentDocument(null);
      updateUrl(null);
      loadDocuments();
    });
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
      updateUrl(res.document.id);
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
        updateUrl(null);
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
    updateUrl(newDoc.id);
  };

  // 409 Conflict Recovery Actions
  const handleCopyDraft = () => {
    try {
      const text = JSON.stringify(pendingDataRef.current.content || currentDocument?.content, null, 2);
      navigator.clipboard.writeText(text);
      addToast('success', 'Draft content copied to clipboard');
    } catch {
      addToast('info', 'Please manually select and copy your text.');
    }
  };

  const handleReloadServerVersion = async () => {
    setIsConflictModalOpen(false);
    if (currentDocument) {
      await fetchAndOpenDocument(currentDocument.id);
      addToast('info', 'Loaded latest server version.');
    }
  };

  const handleForceOverwrite = async () => {
    setIsConflictModalOpen(false);
    const success = await executeSave(conflictServerVersion);
    if (success) {
      addToast('success', `Changes saved to version v${conflictServerVersion + 1}`);
    }
  };

  const handleSwitchUser = (userId: string) => {
    attemptNavigation(() => switchUser(userId));
  };

  const handleLogout = () => {
    attemptNavigation(() => logout());
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-100 selection:text-brand-900">
      {/* Top Workspace Header */}
      <Navbar
        currentDocument={currentDocument}
        onBackToDashboard={handleBackToDashboard}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        saveStatus={saveStatus}
        onManualSave={handleManualSave}
        onRetrySave={handleRetrySave}
        onOpenConflictModal={() => setIsConflictModalOpen(true)}
        onTitleChange={handleTitleChange}
        onTitleBlur={handleTitleBlur}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
      />

      {/* Main Body */}
      <main className="flex-1 flex flex-col">
        {currentDocument ? (
          <TiptapEditor
            key={currentDocument.id}
            documentId={currentDocument.id}
            content={currentDocument.content}
            onChange={handleContentChange}
            editable={true} // Shared editors and owners can edit content
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
            error={error}
            onRetry={loadDocuments}
          />
        )}
      </main>

      {/* Share Modal (Owner Only) */}
      {currentDocument && isShareModalOpen && (
        <ShareModal
          document={currentDocument}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          onShareUpdated={() => {
            loadDocuments();
            if (currentDocument) {
              api.getDocument(currentDocument.id).then((res) => {
                setCurrentDocument((prev) =>
                  prev ? { ...prev, ...res.document, role: res.role, version: res.version } : null
                );
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

      {/* 409 Conflict Recovery Modal */}
      <ConflictModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        onCopyDraft={handleCopyDraft}
        onReloadServerVersion={handleReloadServerVersion}
        onForceOverwrite={handleForceOverwrite}
        serverVersion={conflictServerVersion}
      />

      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesModal
        isOpen={isUnsavedModalOpen}
        onSaveAndProceed={handleConfirmSaveAndLeave}
        onDiscardAndProceed={handleConfirmDiscardAndLeave}
        onCancel={() => {
          setIsUnsavedModalOpen(false);
          setPendingNavigationAction(null);
        }}
        saving={saveStatus === 'saving'}
      />

      {/* Revoked Access Modal */}
      <RevokedAccessModal
        isOpen={isRevokedModalOpen}
        onCopyDraft={handleCopyDraft}
        onBackToDashboard={() => {
          setIsRevokedModalOpen(false);
          if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
          hasPendingEditsRef.current = false;
          pendingDataRef.current = {};
          setCurrentDocument(null);
          updateUrl(null);
          loadDocuments();
        }}
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
