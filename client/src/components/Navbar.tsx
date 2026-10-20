import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DocumentItem } from '../types';
import {
  FileText,
  ChevronDown,
  ArrowLeft,
  Share2,
  Save,
  Check,
  Loader2,
  AlertTriangle,
  UploadCloud,
  LogOut,
  Info,
} from 'lucide-react';

interface NavbarProps {
  currentDocument?: DocumentItem | null;
  onBackToDashboard?: () => void;
  onOpenShareModal?: () => void;
  onOpenImportModal?: () => void;
  saveStatus?: 'saved' | 'saving' | 'unsaved' | 'conflict';
  onManualSave?: () => void;
  onTitleChange?: (newTitle: string) => void;
  onTitleBlur?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDocument,
  onBackToDashboard,
  onOpenShareModal,
  onOpenImportModal,
  saveStatus = 'saved',
  onManualSave,
  onTitleChange,
  onTitleBlur,
}) => {
  const { currentUser, demoUsers, switchUser, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOwner = currentDocument && currentUser?.id === currentDocument.ownerId;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-2.5 flex items-center justify-between shadow-xs">
      {/* Left Section: Logo & Document Title */}
      <div className="flex items-center gap-4">
        {currentDocument ? (
          <button
            onClick={onBackToDashboard}
            title="Back to all documents"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Docs</span>
          </button>
        ) : (
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={onBackToDashboard}>
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 tracking-tight text-lg leading-tight">
                Draft<span className="text-brand-600">Space</span>
              </span>
            </div>
          </div>
        )}

        {/* In-Editor Title Input, Version, and Save Status */}
        {currentDocument && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={currentDocument.title}
                disabled={!isOwner}
                onChange={(e) => onTitleChange?.(e.target.value)}
                onBlur={onTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                title={isOwner ? 'Click to rename document' : 'Only the document owner can rename this document'}
                className={`text-base sm:text-lg font-semibold px-2 py-0.5 rounded border transition-all truncate max-w-[200px] sm:max-w-md ${
                  isOwner
                    ? 'text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none'
                    : 'text-slate-700 bg-slate-100/60 border-transparent cursor-not-allowed'
                }`}
              />

              {/* Version Badge for Optimistic Concurrency */}
              <span className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                v{currentDocument.version}
              </span>
            </div>

            {/* Save Status Pill */}
            <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full select-none">
              {saveStatus === 'saved' && (
                <span className="text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Saved to DB</span>
                </span>
              )}
              {saveStatus === 'saving' && (
                <span className="text-brand-600 flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="text-amber-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Unsaved changes</span>
                </span>
              )}
              {saveStatus === 'conflict' && (
                <span className="text-rose-600 font-semibold flex items-center gap-1 animate-bounce">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Conflict (409)</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Section: Actions & Demo Account Switcher */}
      <div className="flex items-center gap-2.5">
        {/* Editor Actions */}
        {currentDocument && (
          <>
            {onManualSave && (
              <button
                onClick={onManualSave}
                disabled={saveStatus === 'saved' || saveStatus === 'saving'}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
                title="Save document now (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            )}

            {/* Share Button (Owner only or View info) */}
            <button
              onClick={onOpenShareModal}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors shadow-xs ${
                isOwner
                  ? 'bg-brand-600 hover:bg-brand-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
              {currentDocument.shares && currentDocument.shares.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-xs">
                  {currentDocument.shares.length}
                </span>
              )}
            </button>
          </>
        )}

        {/* Global Import Action on Dashboard */}
        {!currentDocument && onOpenImportModal && (
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Import .txt</span>
          </button>
        )}

        {/* Explicit Demo Account Chooser */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all bg-white"
            title="Explicit Demo Account Chooser"
          >
            <div className="w-7 h-7 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center">
              {currentUser?.displayName?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-none">
                {currentUser?.displayName || 'Loading...'}
              </span>
              <span className="text-[10px] text-amber-700 font-medium uppercase tracking-wider leading-none mt-0.5">
                Demo Account
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Switcher Dropdown Menu */}
          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn">
              <div className="px-4 py-2 border-b border-slate-100 bg-amber-50/50">
                <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-xs">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mocked Demo Authentication</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Select a seeded account to receive a real server-issued session cookie:
                </p>
              </div>

              <div className="py-1">
                {demoUsers.map((user) => {
                  const isActive = user.id === currentUser?.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => {
                        switchUser(user.id);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                        isActive ? 'bg-brand-50 text-brand-900 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isActive ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {user.displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{user.displayName}</span>
                            {isActive && (
                              <span className="text-[10px] font-medium px-1.5 py-0.2 bg-brand-100 text-brand-700 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-brand-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                <span>HttpOnly Cookie Session</span>
                <button
                  onClick={() => {
                    logout();
                    setUserDropdownOpen(false);
                  }}
                  className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
