export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface StageInfo {
  label: string;
  bg: string;
  color: string;
  dot: string;
}

export interface SubDisposition {
  id: string;
  label: string;
}

export interface Disposition {
  id: string;
  label: string;
  connected: boolean;
  subDispositions: SubDisposition[];
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
  state: string;
  city: string;
  dealerId: string;
  dealerName: string;
  dealerPhone: string;
  dealerAddress: string;
}

export type SaleSource = 'D2C' | 'Ecom' | 'Dealer';
export type AuditStatus = 'pending' | 'successful' | 'rejected';

export interface Sale {
  invoiceNo: string;
  amount: string;
  modelRange: string;
  modelSku: string;
  modelColour: string;
  saleDate: number | null;
  quantity: number;
  saleSource: SaleSource;
  sourceName: string;
  accessories: string[];
  fileName: string;
  fileUrl?: string;
  auditStatus: AuditStatus;
  auditNote?: string;
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
  disposition: string;
  subDisposition: string;
}

export type FollowupTag = 'overdue' | 'today' | 'upcoming' | null;

export interface CallForm {
  open: boolean;
  dispositionId: string;
  subDispositionId: string;
  duration: string;
  remarks: string;
}

export interface TestRideForm {
  open: boolean;
  date: string;
  state: string;
  city: string;
  dealerId: string;
}

export interface SaleForm {
  open: boolean;
  docs: 'yes' | 'no';
  invoiceNo: string;
  amount: string;
  inventoryId: string;
  saleDate: string;
  quantity: string;
  saleSource: SaleSource;
  sourceName: string;
  accessories: string[];
  fileName: string;
  fileUrl: string;
  uploading: boolean;
}

export interface ContactEditForm {
  open: boolean;
  name: string;
  phone: string;
  email: string;
  pin: string;
}

export type FilterKey = 'stage' | 'source' | 'city' | 'owner' | 'created' | 'followup' | 'task';

export type View = 'dashboard' | 'leads' | 'detail' | 'users' | 'integrations' | 'audit-log' | 'dealers' | 'inventory' | 'accessories' | 'sales-audit' | 'dispositions' | 'import-leads';

export type Role = 'Admin' | 'Manager' | 'Agent';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  createdOn: number;
  active: boolean;
  lastLoginDate: string;
}

export interface AllocationStatus {
  poolCount: number;
  activeUserCount: number;
  withinAllocationWindow: boolean;
  istHour: number;
}

export interface LeadImportResult {
  created: number;
  errors: { row: number; reason: string }[];
}

export interface UserForm {
  open: boolean;
  editingId: string | null;
  name: string;
  email: string;
  phone: string;
  role: Role;
}

export interface Dealer {
  id: string;
  name: string;
  city: string;
  state: string;
  pin: string;
  address: string;
  phone: string;
  status: string;
  franchiseCode: string;
}

export interface InventoryItem {
  id: string;
  modelRange: string;
  modelSku: string;
  modelColour: string;
  createdOn: number;
}

export interface Accessory {
  id: string;
  name: string;
  createdOn: number;
}

export interface AuditLogEntry {
  id: string;
  ts: number;
  actorId: string | null;
  actorName: string;
  action: string;
  targetId: string | null;
  targetName: string | null;
  details: Record<string, unknown>;
}

export interface SaleAuditRow {
  leadId: string;
  leadName: string | null;
  leadPhone: string;
  owner: string;
  sale: Sale;
}
