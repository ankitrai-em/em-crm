import type { ActivityEntry, Lead, Role, Sale, TestRide, User } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const TOKEN_KEY = 'emcrm_token';

export const auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = auth.getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
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

export interface LoginResult {
  token: string;
  user: User;
}

export interface TelephonyConfig {
  provider: 'mock' | 'sarv' | 'twilio' | 'exotel';
  sarv: { userId?: string; token?: string };
  twilio: { accountSid?: string; authToken?: string; fromNumber?: string; twimlUrl?: string };
  exotel: { sid?: string; apiKey?: string; apiToken?: string; callerId?: string; agentNumber?: string; subdomain?: string };
}

export const api = {
  login: (email: string, password: string) => request<LoginResult>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/api/auth/me'),

  listLeads: () => request<Lead[]>('/api/leads'),
  createLead: (input: NewLeadInput) => request<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(input) }),
  patchLead: (id: string, patch: LeadPatch) => request<Lead>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  callLead: (id: string) => request<CallResult>(`/api/leads/${id}/call`, { method: 'POST' }),

  listUsers: () => request<User[]>('/api/users'),
  createUser: (input: NewUserInput) => request<User>('/api/users', { method: 'POST', body: JSON.stringify(input) }),
  patchUser: (id: string, patch: UserPatch) => request<User>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteUser: (id: string) => request<{ ok: true }>(`/api/users/${id}`, { method: 'DELETE' }),
  resetUserPassword: (id: string, password: string) => request<User>(`/api/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),

  getTelephonyIntegration: () => request<TelephonyConfig>('/api/integrations/telephony'),
  saveTelephonyIntegration: (config: TelephonyConfig) => request<TelephonyConfig>('/api/integrations/telephony', { method: 'PUT', body: JSON.stringify(config) }),

  uploadInvoice: async (file: File): Promise<UploadResult> => {
    const token = auth.getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Upload failed (${res.status})`);
    }
    return res.json();
  },
};

export const apiBaseUrl = BASE_URL;
