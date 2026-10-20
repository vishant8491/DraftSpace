import React, { useState, useEffect } from 'react';
import { DocumentItem, DocumentShare } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { X, UserPlus, Trash2, Shield, Check, Loader2 } from 'lucide-react';

interface ShareModalProps {
  document: DocumentItem;
  isOpen: boolean;
  onClose: () => void;
  onShareUpdated?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  document,
  isOpen,
  onClose,
  onShareUpdated,
}) => {
  const { demoUsers, currentUser } = useAuth();
  const [shares, setShares] = useState<DocumentShare[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isOwner = currentUser?.id === document.ownerId;

  // Load active shares
  useEffect(() => {
    if (isOpen && isOwner) {
      loadShares();
    }
  }, [isOpen, document.id, isOwner]);

  const loadShares = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getShares(document.id);
      setShares(data);
    } catch (err: any) {
      console.error('Failed to load shares:', err);
      setError(err.message || 'Failed to load collaborator list');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Users available to add (exclude owner and currently shared users)
  const sharedUserIds = new Set(shares.map((s) => s.userId));
  sharedUserIds.add(document.ownerId);
  const availableUsers = demoUsers.filter((u) => !sharedUserIds.has(u.id));

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      setSubmitting(true);
      setError(null);
      await api.addShare(document.id, selectedUserId);
      setSuccessMsg('Collaborator granted editor access successfully.');
      setSelectedUserId('');
      await loadShares();
      onShareUpdated?.();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add collaborator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      setError(null);
      await api.removeShare(document.id, userId);
      await loadShares();
      onShareUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to remove collaborator');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Share document</h2>
            <p className="text-sm text-slate-500 truncate max-w-xs">{document.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Alerts */}
          {error && (
            <div className="p-3 text-sm bg-rose-50 text-rose-800 rounded-lg border border-rose-200">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 text-sm bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add Collaborator Form (Owner only) */}
          {isOwner ? (
            <form onSubmit={handleAddCollaborator} className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Grant Editor Access
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
                >
                  <option value="">Select a demo user to share with...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.displayName} ({user.email})
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={!selectedUserId || submitting}
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Grant Access</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <span>Only the document owner can grant or revoke sharing access.</span>
            </div>
          )}

          {/* People with access list */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              People with access
            </h3>

            {loading ? (
              <div className="py-6 flex items-center justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading access list...</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {/* Document Owner */}
                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center">
                      {document.owner.displayName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                        <span>{document.owner.displayName}</span>
                        {document.ownerId === currentUser?.id && (
                          <span className="text-xs text-slate-400 font-normal">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{document.owner.email}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                    Owner
                  </span>
                </div>

                {/* Collaborators */}
                {shares.map((share) => (
                  <div key={share.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        {share.user.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                          <span>{share.user.displayName}</span>
                          {share.userId === currentUser?.id && (
                            <span className="text-xs text-slate-400 font-normal">(you)</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{share.user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 rounded-md">
                        Shared Editor
                      </span>
                      {isOwner && (
                        <button
                          type="button"
                          title="Revoke access"
                          onClick={() => handleRemoveCollaborator(share.userId)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {shares.length === 0 && (
                  <div className="py-4 text-center text-sm text-slate-400">
                    No collaborators added yet. This document is private to the owner.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
