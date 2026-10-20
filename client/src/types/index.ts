export type Role = 'owner' | 'editor';

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface DocumentShare {
  id: string;
  documentId: string;
  userId: string;
  createdAt: string;
  user: User;
}

export interface DocumentItem {
  id: string;
  title: string;
  content: string | object;
  ownerId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  owner: User;
  shares?: DocumentShare[];
  role: Role;
  sharedAt?: string;
}

export interface DocumentListResponse {
  owned: DocumentItem[];
  shared: DocumentItem[];
}

export interface DocumentDetailResponse {
  document: DocumentItem;
  role: Role;
  version: number;
}

export interface DemoSessionResponse {
  message: string;
  user: User;
  sessionToken: string;
  expiresAt: string;
}
