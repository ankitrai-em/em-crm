import { useApp } from '../store/AppStore';

export function LoginPage() {
  const { state, updateLoginField, login } = useApp();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
      <form
        onSubmit={onSubmit}
        style={{ width: 'min(360px, 90vw)', display: 'flex', flexDirection: 'column', gap: 16, padding: 32, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div>
          <h3 style={{ margin: '0 0 4px', fontFamily: 'var(--font-heading)' }}>EM Leads</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-neutral-600)' }}>Sign in to continue</p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Email</label>
          <input
            type="email"
            value={state.loginEmail}
            onChange={(e) => updateLoginField('loginEmail', e.target.value)}
            style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 14, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            autoFocus
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Password</label>
          <input
            type="password"
            value={state.loginPassword}
            onChange={(e) => updateLoginField('loginPassword', e.target.value)}
            style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 14, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
          />
        </div>

        {state.loginError && <div style={{ fontSize: 13, color: 'var(--color-accent-2-700)' }}>{state.loginError}</div>}

        <button
          type="submit"
          disabled={state.loginBusy}
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '10px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: state.loginBusy ? 'default' : 'pointer', opacity: state.loginBusy ? 0.7 : 1 }}
        >
          {state.loginBusy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
