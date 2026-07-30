import { useEffect, useState, type CSSProperties } from 'react';
import { useApp } from '../store/AppStore';
import { api } from '../lib/api';
import type { AuditLogEntry } from '../types';
import { formatDateTime } from '../data/format';

const ACTION_LABEL: Record<string, string> = {
  'user.created': 'User created',
  'user.updated': 'User updated',
  'user.password_reset': 'Password reset',
  'user.deleted': 'User deleted',
  'dealers.imported': 'Dealers imported',
};

export function AuditLogPage() {
  const { state } = useApp();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state.currentUser?.role !== 'Admin') return;
    api.getAuditLog().then(setEntries).finally(() => setLoading(false));
  }, [state.currentUser]);

  if (state.currentUser?.role !== 'Admin') {
    return (
      <div style={{ padding: '12px 48px 40px' }}>
        <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>Only Admins can view the audit log.</p>
      </div>
    );
  }

  if (loading) return null;

  return (
    <div style={{ padding: '12px 48px 40px' }} data-screen-label="Audit Log">
      <h2 style={{ margin: '0 0 20px' }}>Audit Log</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {['When', 'Actor', 'Action', 'Target', 'Details'].map((h) => (
              <th key={h} style={headStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td style={cellStyle}>{formatDateTime(e.ts)}</td>
              <td style={cellStyle}>{e.actorName}</td>
              <td style={cellStyle}>{ACTION_LABEL[e.action] || e.action}</td>
              <td style={cellStyle}>{e.targetName || '—'}</td>
              <td style={{ ...cellStyle, fontSize: 12, color: 'var(--color-neutral-600)' }}>{Object.keys(e.details).length ? JSON.stringify(e.details) : '—'}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td style={cellStyle} colSpan={5}>
                No activity logged yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const headStyle: CSSProperties = {
  textAlign: 'left', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
  color: 'color-mix(in srgb, var(--color-text) 60%, transparent)', padding: 10, borderBottom: '1px solid var(--color-divider)',
};

const cellStyle: CSSProperties = { padding: '12px 10px', borderBottom: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)' };
