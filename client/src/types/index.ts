export type Role = 'owner' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  userId: string;
  role: 'editor' | 'viewer';
  createdAt: string;
  updatedAt: string;
  user: User;
}

export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: User;
  shares?: DocumentShare[];
  role: Role;
  shareId?: string;
  sharedAt?: string;
}

export interface DocumentListResponse {
  owned: DocumentItem[];
  shared: DocumentItem[];
}

export interface DocumentDetailResponse {
  document: DocumentItem;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: User;
}
