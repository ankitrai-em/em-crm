import type { ActivityEntry, Lead, Role, Sale, TestRide, User } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${path} failed (${res.status})`);
  }
  return res.json();
}

export interface NewLeadInput {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  pin?: string;
  source: string;
  campaign?: string;
  owner?: string;
}

export interface LeadPatch {
  stage?: number;
  followupAt?: number | null;
  taskDate?: number | null;
  reTriggered?: boolean;
  attempts?: number;
  testRide?: TestRide | null;
  sale?: Sale | null;
  activityNote?: string;
  activityEntry?: ActivityEntry;
}

export interface CallResult {
  provider: string;
  status: string;
  sid: string;
  message: string;
  lead: Lead;
}

export interface NewUserInput {
  name: string;
  email?: string;
  phone?: string;
  role: Role;
}

export interface UserPatch {
  name?: string;
  email?: string;
  phone?: string;
  role?: Role;
}

export interface UploadResult {
  fileName: string;
  originalName: string;
  url: string;
}

export const api = {
  listLeads: () => request<Lead[]>('/api/leads'),
  createLead: (input: NewLeadInput) => request<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(input) }),
  patchLead: (id: string, patch: LeadPatch) => request<Lead>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  callLead: (id: string) => request<CallResult>(`/api/leads/${id}/call`, { method: 'POST' }),

  listUsers: () => request<User[]>('/api/users'),
  createUser: (input: NewUserInput) => request<User>('/api/users', { method: 'POST', body: JSON.stringify(input) }),
  patchUser: (id: string, patch: UserPatch) => request<User>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteUser: (id: string) => request<{ ok: true }>(`/api/users/${id}`, { method: 'DELETE' }),

  uploadInvoice: async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/uploads`, { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Upload failed (${res.status})`);
    }
    return res.json();
  },
};

export const apiBaseUrl = BASE_URL;
