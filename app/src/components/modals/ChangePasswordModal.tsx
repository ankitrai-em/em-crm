import { useApp } from '../../store/AppStore';

export function ChangePasswordModal({ forced }: { forced?: boolean }) {
  const { state, updateChangePasswordField, submitChangePassword } = useApp();

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, background: 'color-mix(in srgb, var(--color-neutral-900) 50%, transparent)', zIndex: 60 }}>
      <div style={{ width: 'min(380px, 100%)', display: 'flex', flexDirection: 'column', gap: 16, padding: 26, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
        <div>
          <h4 style={{ margin: '0 0 4px' }}>{forced ? 'Set a new password' : 'Change password'}</h4>
          {forced && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-600)' }}>
              You're using a default or reset password. Set a new one to continue.
            </p>
          )}
        </div>
        <Field label="Current password" value={state.changePasswordCurrent} onChange={(v) => updateChangePasswordField('changePasswordCurrent', v)} />
        <Field label="New password (min 8 characters)" value={state.changePasswordNew} onChange={(v) => updateChangePasswordField('changePasswordNew', v)} />
        <Field label="Confirm new password" value={state.changePasswordConfirm} onChange={(v) => updateChangePasswordField('changePasswordConfirm', v)} />
        {state.changePasswordError && <div style={{ fontSize: 13, color: 'var(--color-accent-2-700)' }}>{state.changePasswordError}</div>}
        <button
          disabled={state.changePasswordBusy}
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: state.changePasswordBusy ? 'default' : 'pointer', opacity: state.changePasswordBusy ? 0.7 : 1 }}
          onClick={submitChangePassword}
        >
          {state.changePasswordBusy ? 'Saving…' : 'Set new password'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 14, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
      />
    </div>
  );
}
