import { NOW } from './constants';
import type { FollowupTag, StageId } from '../types';

export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec == null) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? m + 'm ' + s + 's' : s + 's';
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
}

export function followupStatus(ts: number | null | undefined, stage: StageId): FollowupTag {
  if (!ts || stage >= 7) return null;
  if (ts < NOW) return 'overdue';
  if (isSameDay(ts, NOW)) return 'today';
  return 'upcoming';
}

export function parseDuration(str: string): number {
  if (!str) return 0;
  const m = String(str).match(/(\d+)\D+(\d+)/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const n = parseFloat(str);
  return isNaN(n) ? 0 : Math.round(n * 60);
}

export function rangeCaption(fromStr: string, toStr: string): string {
  if (!fromStr && !toStr) return 'All time';
  const f = fromStr ? formatDate(new Date(fromStr).getTime()) : '…';
  const t = toStr ? formatDate(new Date(toStr).getTime()) : '…';
  if (fromStr && toStr && fromStr === toStr) {
    return fromStr === toDateInputValue(NOW) ? 'Today, ' + f : f;
  }
  return f + ' – ' + t;
}

export function toDateTimeLocalValue(ts: number): string {
  const d = new Date(ts);
  return (
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') +
    'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  );
}

export function filterHeaderBg(active: boolean): string {
  return active ? 'color-mix(in srgb, var(--color-process-yellow) 45%, var(--color-bg))' : 'transparent';
}
