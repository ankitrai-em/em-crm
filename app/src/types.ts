export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface StageInfo {
  label: string;
  bg: string;
  color: string;
  dot: string;
}

export interface Disposition {
  id: string;
  label: string;
  connected: boolean;
}

export interface ActivityEntry {
  ts: number;
  kind: 'note' | 'call';
  text: string;
  connected?: boolean;
  duration?: number | null;
  remarks?: string;
}

export interface TestRide {
  date: number;
  store: string;
  dealer: string;
}

export interface Sale {
  invoiceNo: string;
  amount: string;
  model: string;
  fileName: string;
  fileUrl?: string;
}

export interface Lead {
  id: string;
  name: string | null;
  phone: string;
  email: string;
  city: string;
  pin: string;
  source: string;
  campaign: string;
  createdOn: number;
  owner: string;
  stage: StageId;
  leadScore: number;
  followupAt: number | null;
  taskDate: number | null;
  reTriggered: boolean;
  attempts: number;
  activity: ActivityEntry[];
  testRide: TestRide | null;
  sale: Sale | null;
  meta: Record<string, string>;
}

export type FollowupTag = 'overdue' | 'today' | 'upcoming' | null;

export interface CallForm {
  open: boolean;
  disposition: string;
  duration: string;
  remarks: string;
}

export interface TestRideForm {
  open: boolean;
  date: string;
  store: string;
  dealer: string;
}

export interface SaleForm {
  open: boolean;
  docs: 'yes' | 'no';
  invoiceNo: string;
  amount: string;
  model: string;
  fileName: string;
  fileUrl: string;
  uploading: boolean;
}

export type FilterKey = 'stage' | 'source' | 'city' | 'owner' | 'created' | 'followup' | 'task';

export type View = 'dashboard' | 'leads' | 'detail' | 'users' | 'integrations';

export type Role = 'Admin' | 'Manager' | 'Agent';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  createdOn: number;
}

export interface UserForm {
  open: boolean;
  editingId: string | null;
  name: string;
  email: string;
  phone: string;
  role: Role;
}
