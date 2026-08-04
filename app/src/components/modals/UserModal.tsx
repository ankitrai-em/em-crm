import { useApp } from '../../store/AppStore';
import type { Role } from '../../types';

export function UserModal() {
  const { state, updateUserForm, closeUserForm, submitUserForm, ROLE_LIST } = useApp();
  const form = state.userForm;
  if (!form.open) return null;

  const managerOptions = state.users.filter((u) => u.id !== form.editingId && (u.role === 'Manager' || u.role === 'Admin'));

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, background: 'color-mix(in srgb, var(--color-neutral-900) 50%, transparent)', zIndex: 50 }}>
      <div style={{ width: 'min(420px, 100%)', display: 'flex', flexDirection: 'column', gap: 16, padding: 26, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h4 style={{ margin: 0 }}>{form.editingId ? 'Edit User' : 'Add User'}</h4>
        <Field label="Name" value={form.name} onChange={(v) => updateUserForm({ name: v })} />
        <Field label="Email" value={form.email} onChange={(v) => updateUserForm({ email: v })} />
        <Field label="Phone number (used as agent number for calls)" value={form.phone} onChange={(v) => updateUserForm({ phone: v })} />
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Role</label>
          <select
            value={form.role}
            onChange={(e) => updateUserForm({ role: e.target.value as Role })}
            style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 14, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
          >
            {ROLE_LIST.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Manager</label>
          <select
            value={form.managerId}
            onChange={(e) => updateUserForm({ managerId: e.target.value })}
            style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 14, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
          >
            <option value="">No manager</option>
            {managerOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={form.hierarchyEnabled} onChange={(e) => updateUserForm({ hierarchyEnabled: e.target.checked })} style={{ marginTop: 2 }} />
          <span>
            Hierarchy — restrict this person to only see their own leads, plus (if they manage anyone) the leads of everyone below them in the reporting tree.
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={form.inPool} onChange={(e) => updateUserForm({ inPool: e.target.checked })} style={{ marginTop: 2 }} />
          <span>In lead pool — eligible to receive round-robin leads when Active. Uncheck for roles that shouldn't get leads (e.g. most Managers).</span>
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <button style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }} onClick={closeUserForm}>
            Cancel
          </button>
          <button
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={submitUserForm}
          >
            {form.editingId ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 14, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
      />
    </div>
  );
}
