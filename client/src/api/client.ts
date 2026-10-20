import {
  User,
  DocumentItem,
  DocumentListResponse,
  DocumentDetailResponse,
  DocumentShare,
  AuthResponse,
  Role,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('draftspace_session_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage = data && typeof data === 'object' && data.error 
      ? data.error 
      : `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(errorMessage) as Error & { code?: string; status?: number; details?: any };
    error.status = response.status;
    if (data && typeof data === 'object') {
      error.code = data.code;
      error.details = data.details;
    }
    throw error;
  }

  return data as T;
}

export const api = {
  // Auth & Users
  getUsers: () => request<User[]>('/auth/users'),
  getMe: () => request<{ user: User; sessionToken?: string }>('/auth/me'),
  loginAsUser: (userId: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  // Documents
  listDocuments: () => request<DocumentListResponse>('/documents'),
  getDocument: (id: string) => request<DocumentDetailResponse>(`/documents/${id}`),
  createDocument: (data?: { title?: string; content?: string }) =>
    request<{ document: DocumentItem }>('/documents', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  updateDocument: (id: string, data: { title?: string; content?: string }) =>
    request<{ document: DocumentItem; role: Role }>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDocument: (id: string) =>
    request<{ success: boolean; message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    }),

  // Sharing
  getShares: (id: string) => request<DocumentShare[]>(`/documents/${id}/shares`),
  addOrUpdateShare: (id: string, userId: string, role: 'editor' | 'viewer') =>
    request<DocumentShare>(`/documents/${id}/shares`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),
  removeShare: (id: string, userId: string) =>
    request<{ success: boolean; message: string }>(`/documents/${id}/shares/${userId}`, {
      method: 'DELETE',
    }),

  // File Upload / Import
  importTextFile: (file: File, title?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }
    return request<{ message: string; document: DocumentItem }>('/upload/import', {
      method: 'POST',
      body: formData,
    });
  },
};
