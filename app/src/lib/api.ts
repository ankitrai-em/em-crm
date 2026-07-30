import type { Accessory, ActivityEntry, AllocationStatus, AuditLogEntry, Dealer, Disposition, InventoryItem, Lead, LeadImportResult, Role, Sale, SaleAuditRow, TestRide, User } from '../types';

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
    // A 401 on a request that carried a token means the session itself is dead (e.g. the
    // 11:59 PM daily reset bumped everyone's token version) — not a login failure, which
    // never has a token to begin with. Tell the app to drop back to the login screen.
    if (res.status === 401 && token) {
      auth.clearToken();
      window.dispatchEvent(new Event('auth:expired'));
    }
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

export interface NewInventoryInput {
  modelRange: string;
  modelSku: string;
  modelColour: string;
}

export const api = {
  login: (email: string, password: string) => request<LoginResult>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/api/auth/me'),

  listLeads: () => request<Lead[]>('/api/leads'),
  createLead: (input: NewLeadInput) => request<Lead>('/api/leads', { method: 'POST', body: JSON.stringify(input) }),
  patchLead: (id: string, patch: LeadPatch) => request<Lead>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  callLead: (id: string) => request<CallResult>(`/api/leads/${id}/call`, { method: 'POST' }),
  importLeads: async (file: File): Promise<LeadImportResult> => {
    const token = auth.getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/leads/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Import failed (${res.status})`);
    }
    return res.json();
  },

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

  getAuditLog: () => request<AuditLogEntry[]>('/api/audit-log'),

  getDispositions: () => request<Disposition[]>('/api/settings/dispositions'),
  saveDispositions: (list: Disposition[]) => request<Disposition[]>('/api/settings/dispositions', { method: 'PUT', body: JSON.stringify(list) }),

  getDealerStates: () => request<string[]>('/api/dealers/states'),
  getDealerCities: (state: string) => request<string[]>(`/api/dealers/cities?state=${encodeURIComponent(state)}`),
  getDealers: (state: string, city: string) => request<Dealer[]>(`/api/dealers?state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}`),
  getDealerCount: () => request<{ count: number }>('/api/dealers/count'),
  importDealers: async (file: File): Promise<{ count: number }> => {
    const token = auth.getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/api/dealers/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Import failed (${res.status})`);
    }
    return res.json();
  },

  listInventory: () => request<InventoryItem[]>('/api/inventory'),
  createInventoryItem: (input: NewInventoryInput) => request<InventoryItem>('/api/inventory', { method: 'POST', body: JSON.stringify(input) }),
  patchInventoryItem: (id: string, patch: Partial<NewInventoryInput>) => request<InventoryItem>(`/api/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteInventoryItem: (id: string) => request<{ ok: true }>(`/api/inventory/${id}`, { method: 'DELETE' }),

  listAccessories: () => request<Accessory[]>('/api/accessories'),
  createAccessory: (name: string) => request<Accessory>('/api/accessories', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteAccessory: (id: string) => request<{ ok: true }>(`/api/accessories/${id}`, { method: 'DELETE' }),

  getSales: () => request<SaleAuditRow[]>('/api/sales'),
  auditSale: (leadId: string, auditStatus: 'successful' | 'rejected', auditNote: string) =>
    request<Lead>(`/api/leads/${leadId}/sale-audit`, { method: 'PATCH', body: JSON.stringify({ auditStatus, auditNote }) }),

  setUserActive: (id: string, active: boolean) => request<User>(`/api/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  getAllocationStatus: () => request<AllocationStatus>('/api/allocation/status'),
  runPoolAllocation: () => request<{ count: number }>('/api/allocation/run-pool', { method: 'POST' }),
};

export const apiBaseUrl = BASE_URL;
