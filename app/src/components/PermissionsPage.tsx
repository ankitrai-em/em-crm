import { useEffect } from 'react';
import { useApp } from '../store/AppStore';
import type { Role } from '../types';

const EDITABLE_ROLES: Role[] = ['Manager', 'Agent'];

export function PermissionsPage() {
  const { state, loadPermissions, togglePermission, savePermissions } = useApp();

  useEffect(() => {
    loadPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.currentUser?.role !== 'Admin') {
    return (
      <div style={{ padding: '12px 48px 40px' }}>
        <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>Only Admins can view or edit permissions.</p>
      </div>
    );
  }

  if (!state.rolePermissions || !state.permissionKeys.length) return null;

  return (
    <div style={{ padding: '12px 48px 40px' }} data-screen-label="Permissions">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Permissions</h2>
        <button
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onClick={savePermissions}
        >
          Save
        </button>
      </div>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--color-neutral-600)' }}>
        Admin always has every permission, regardless of what's set here. Use this to decide what Managers and Agents can do beyond their default access.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 560 }}>
          <thead>
            <tr>
              <th style={headStyle}>Permission</th>
              <th style={{ ...headStyle, textAlign: 'center' }}>Admin</th>
              {EDITABLE_ROLES.map((role) => (
                <th key={role} style={{ ...headStyle, textAlign: 'center' }}>
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.permissionKeys.map((p) => (
              <tr key={p.key}>
                <td style={cellStyle}>{p.label}</td>
                <td style={{ ...cellStyle, textAlign: 'center', color: 'var(--color-neutral-600)' }}>✓</td>
                {EDITABLE_ROLES.map((role) => (
                  <td key={role} style={{ ...cellStyle, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!state.rolePermissions?.[role]?.[p.key]}
                      onChange={() => togglePermission(role, p.key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const headStyle = {
  textAlign: 'left' as const, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' as const,
  color: 'color-mix(in srgb, var(--color-text) 60%, transparent)', padding: 10, borderBottom: '1px solid var(--color-divider)',
};

const cellStyle = { padding: '12px 10px', borderBottom: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)' };
