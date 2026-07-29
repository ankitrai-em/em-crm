import type { Disposition, Role, StageId, StageInfo } from '../types';

export const CURRENT_AGENT = 'Aditya Narayan';

export const NOW = Date.now();

export const STAGES: Record<StageId, StageInfo> = {
  1: { label: 'Not Attempted', bg: 'var(--color-neutral-200)', color: 'var(--color-neutral-800)', dot: 'var(--color-neutral-500)' },
  2: { label: 'Attempted', bg: 'var(--color-neutral-200)', color: 'var(--color-neutral-800)', dot: 'var(--color-neutral-500)' },
  3: { label: 'Connected', bg: 'var(--color-accent-100)', color: 'var(--color-accent-800)', dot: 'var(--color-accent-500)' },
  4: { label: 'Connected & Pitched', bg: 'var(--color-accent-200)', color: 'var(--color-accent-800)', dot: 'var(--color-accent-600)' },
  5: { label: 'Attempted 3×, Not Connected', bg: 'var(--color-accent-2-100)', color: 'var(--color-accent-2-800)', dot: 'var(--color-accent-2-500)' },
  6: { label: 'Test Ride Booked', bg: 'var(--color-accent-300)', color: 'var(--color-accent-900)', dot: 'var(--color-accent-700)' },
  7: { label: 'Sale Completed (No Docs)', bg: 'var(--color-accent-2-200)', color: 'var(--color-accent-2-800)', dot: 'var(--color-accent-2-600)' },
  8: { label: 'Sale Completed (With Docs)', bg: 'var(--color-accent)', color: 'var(--color-bg)', dot: 'var(--color-accent-700)' },
};

export const STAGE_ORDER: StageId[] = [1, 2, 3, 4, 5, 6, 7, 8];

export const DISPOSITIONS: Disposition[] = [
  { id: 'not_reachable', label: 'Not Reachable', connected: false },
  { id: 'switched_off', label: 'Switched Off', connected: false },
  { id: 'busy', label: 'Busy', connected: false },
  { id: 'ringing_no_response', label: 'Ringing - No Response', connected: false },
  { id: 'wrong_number', label: 'Wrong Number', connected: false },
  { id: 'answered_interested', label: 'Answered - Interested', connected: true },
  { id: 'answered_callback', label: 'Answered - Call Back Later', connected: true },
  { id: 'answered_not_interested', label: 'Answered - Not Interested', connected: true },
];

export const SOURCE_LIST = ['Website', 'Facebook Ads', 'Instagram Ads', 'WhatsApp', 'Test Ride Page', 'Inbound Call', 'Referral', 'ExitIntentLeads'];
export const CITY_LIST = ['Chennai', 'Bengaluru', 'Ludhiana', 'Noida', 'Ernakulam', 'Mumbai', 'Pune', 'Hyderabad', 'Jaipur', 'Delhi', 'Ahmedabad', 'Nagpur'];

export const ROLE_LIST: Role[] = ['Admin', 'Manager', 'Agent'];

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  Admin: ['Manage users', 'Manage all leads', 'Reassign leads', 'View reports'],
  Manager: ['Manage all leads', 'Reassign leads', 'View reports'],
  Agent: ['Manage own leads'],
};

export function getStage(id: number): StageInfo {
  return STAGES[id as StageId] || STAGES[1];
}

export function getDisposition(id: string): Disposition {
  return DISPOSITIONS.find((d) => d.id === id) || DISPOSITIONS[0];
}
