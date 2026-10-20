import {
  User,
  DocumentItem,
  DocumentListResponse,
  DocumentDetailResponse,
  DocumentShare,
  DemoSessionResponse,
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
    credentials: 'include', // Transmit HttpOnly session cookies
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMessage =
      data && typeof data === 'object' && data.error
        ? data.error
        : `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(errorMessage) as Error & {
      code?: string;
      status?: number;
      details?: any;
      currentVersion?: number;
    };
    error.status = response.status;
    if (data && typeof data === 'object') {
      error.code = data.code;
      error.details = data.details;
      error.currentVersion = data.currentVersion;
    }
    throw error;
  }

  return data as T;
}

export const api = {
  // Demo Identity & Session Management
  getDemoUsers: () => request<{ notice: string; users: User[] }>('/demo-users'),
  getMe: () => request<{ user: User }>('/me'),
  createDemoSession: (userId: string) =>
    request<DemoSessionResponse>('/demo-session', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  deleteSession: () =>
    request<{ message: string }>('/session', {
      method: 'DELETE',
    }),

  // Documents
  listDocuments: () => request<DocumentListResponse>('/documents'),
  getDocument: (id: string) => request<DocumentDetailResponse>(`/documents/${id}`),
  createDocument: (data?: { title?: string; content?: any }) =>
    request<{ document: DocumentItem; version: number }>('/documents', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  updateDocument: (id: string, data: { version: number; title?: string; content?: any }) =>
    request<{ document: DocumentItem; version: number; role: Role }>(`/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteDocument: (id: string) =>
    request<{ success: boolean; message: string }>(`/documents/${id}`, {
      method: 'DELETE',
    }),

  // Sharing
  getShares: (id: string) => request<DocumentShare[]>(`/documents/${id}/shares`),
  addShare: (id: string, userId: string) =>
    request<{ message: string; share: DocumentShare }>(`/documents/${id}/shares`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  removeShare: (id: string, userId: string) =>
    request<{ success: boolean; message: string }>(`/documents/${id}/shares/${userId}`, {
      method: 'DELETE',
    }),

  // Product-Relevant File Import (.txt / .md)
  importDocument: (file: File, title?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }
    return request<{ message: string; document: DocumentItem; version: number }>('/documents/import', {
      method: 'POST',
      body: formData,
    });
  },
  importTextFile: (file: File, title?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }
    return request<{ message: string; document: DocumentItem; version: number }>('/documents/import', {
      method: 'POST',
      body: formData,
    });
  },
};
