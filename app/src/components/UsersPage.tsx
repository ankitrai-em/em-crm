import { useEffect, useState, type CSSProperties } from 'react';
import { useApp } from '../store/AppStore';
import { api } from '../lib/api';
import type { AllocationStatus, Role } from '../types';

export function UsersPage() {
  const { state, showToast, openAddUser, openEditUser, setUserRole, toggleUserActive, removeUser, openResetPassword, ROLE_LIST, ROLE_PERMISSIONS } = useApp();
  const isAdmin = state.currentUser?.role === 'Admin';
  const canToggleActive = isAdmin || state.currentUser?.role === 'Manager';
  const [allocation, setAllocation] = useState<AllocationStatus | null>(null);

  const loadAllocation = () => {
    if (!canToggleActive) return;
    api.getAllocationStatus().then(setAllocation).catch(() => {});
  };
  useEffect(loadAllocation, [canToggleActive, state.users]);

  const runPoolNow = async () => {
    try {
      const { count } = await api.runPoolAllocation();
      showToast(`Allocated ${count} lead(s) from the pool`);
      loadAllocation();
    } catch (err) {
      showToast('Could not run allocation: ' + (err as Error).message);
    }
  };

  return (
    <div style={{ padding: '12px 48px 40px' }} data-screen-label="Users">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Users</h2>
        {isAdmin && (
          <button
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={openAddUser}
          >
            + Add User
          </button>
        )}
      </div>

      {!isAdmin && !canToggleActive && (
        <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginTop: -8 }}>Only Admins can add, edit, or reset passwords for other users.</p>
      )}

      {canToggleActive && allocation && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', padding: '12px 18px', marginBottom: 20, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontSize: 13 }}>
          <span>
            <strong>{allocation.poolCount}</strong> lead{allocation.poolCount === 1 ? '' : 's'} in the pool
          </span>
          <span>
            <strong>{allocation.activeUserCount}</strong> active user{allocation.activeUserCount === 1 ? '' : 's'}
          </span>
          <span style={{ color: allocation.withinAllocationWindow ? 'var(--color-accent-700)' : 'var(--color-neutral-600)' }}>
            {allocation.withinAllocationWindow ? 'Within allocation window (11 AM – 7 PM IST)' : 'Outside allocation window — new leads go to the pool'}
          </span>
          {isAdmin && allocation.poolCount > 0 && (
            <button
              style={{ background: 'transparent', color: 'var(--color-accent-700)', border: '1px solid var(--color-accent)', borderRadius: 'var(--radius-md)', padding: '6px 12px', fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}
              onClick={runPoolNow}
            >
              Run Pool Allocation Now
            </button>
          )}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 36 }}>
        <thead>
          <tr>
            {['Name', 'Email', 'Phone', 'Role', 'Active', ''].map((h) => (
              <th key={h} style={headStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.users.map((u) => (
            <tr key={u.id}>
              <td style={cellStyle}>{u.name}</td>
              <td style={cellStyle}>{u.email || '—'}</td>
              <td style={cellStyle}>{u.phone || <span style={{ color: 'var(--color-accent-2-700)' }}>No phone on file</span>}</td>
              <td style={cellStyle}>
                {isAdmin ? (
                  <select
                    value={u.role}
                    onChange={(e) => setUserRole(u.id, e.target.value as Role)}
                    style={{ padding: '5px 8px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
                  >
                    {ROLE_LIST.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  u.role
                )}
              </td>
              <td style={cellStyle}>
                {canToggleActive ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={u.active} onChange={(e) => toggleUserActive(u.id, e.target.checked)} />
                    <span style={{ color: u.active ? 'var(--color-accent-700)' : 'var(--color-neutral-600)', fontWeight: u.active ? 600 : 400 }}>{u.active ? 'Active' : 'Inactive'}</span>
                  </label>
                ) : (
                  <span style={{ color: u.active ? 'var(--color-accent-700)' : 'var(--color-neutral-600)', fontWeight: u.active ? 600 : 400 }}>{u.active ? 'Active' : 'Inactive'}</span>
                )}
              </td>
              <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                {isAdmin && (
                  <>
                    <button style={linkBtn} onClick={() => openEditUser(u.id)}>
                      Edit
                    </button>
                    <button style={{ ...linkBtn, marginLeft: 14 }} onClick={() => openResetPassword(u.id)}>
                      Reset Password
                    </button>
                    <button style={{ ...linkBtn, color: 'var(--color-accent-2-700)', marginLeft: 14 }} onClick={() => removeUser(u.id)}>
                      Remove
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {state.users.length === 0 && (
            <tr>
              <td style={cellStyle} colSpan={6}>
                No users yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h3 style={{ marginBottom: 12 }}>Roles &amp; Permissions</h3>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {ROLE_LIST.map((role) => (
          <div key={role} style={{ flex: '1 1 220px', padding: 18, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>{role}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ROLE_PERMISSIONS[role].map((perm) => (
                <span key={perm} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'var(--color-accent-100)', color: 'var(--color-accent-800)', width: 'fit-content' }}>
                  {perm}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const headStyle: CSSProperties = {
  textAlign: 'left',
  fontSize: 11,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: 'color-mix(in srgb, var(--color-text) 60%, transparent)',
  padding: 10,
  borderBottom: '1px solid var(--color-divider)',
};

const cellStyle: CSSProperties = { padding: '12px 10px', borderBottom: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)' };

const linkBtn: CSSProperties = { background: 'none', border: 'none', color: 'var(--color-accent-700)', fontSize: 13, cursor: 'pointer', padding: 0 };
