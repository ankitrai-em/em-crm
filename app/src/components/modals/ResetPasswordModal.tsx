import { useApp } from '../../store/AppStore';

export function ResetPasswordModal() {
  const { state, updateResetPasswordValue, closeResetPassword, submitResetPassword } = useApp();
  if (!state.resetPwUserId) return null;
  const user = state.users.find((u) => u.id === state.resetPwUserId);

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, background: 'color-mix(in srgb, var(--color-neutral-900) 50%, transparent)', zIndex: 50 }}>
      <div style={{ width: 'min(360px, 100%)', display: 'flex', flexDirection: 'column', gap: 16, padding: 26, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
        <h4 style={{ margin: 0 }}>Reset Password{user ? ` — ${user.name}` : ''}</h4>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>New password</label>
          <input
            type="text"
            value={state.resetPwValue}
            placeholder="12345678"
            onChange={(e) => updateResetPasswordValue(e.target.value)}
            style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 14, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
          />
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-neutral-600)' }}>Leave blank to reset to the default password (12345678).</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }} onClick={closeResetPassword}>
            Cancel
          </button>
          <button
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={submitResetPassword}
          >
            Reset Password
          </button>
        </div>
      </div>
    </div>
  );
}
