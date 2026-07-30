import { useApp } from '../store/AppStore';

export function AccessoriesPage() {
  const { state, updateAccessoryForm, submitAccessoryForm, removeAccessory } = useApp();
  const isAdmin = state.currentUser?.role === 'Admin';

  return (
    <div style={{ padding: '12px 48px 40px' }} data-screen-label="Accessories">
      <h2 style={{ margin: '0 0 20px' }}>Accessories</h2>

      {!isAdmin && <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>Only Admins can add or remove accessories.</p>}

      {isAdmin && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Accessory name…"
            value={state.accessoryForm.name}
            onChange={(e) => updateAccessoryForm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitAccessoryForm()}
            style={{ fontSize: 14, padding: '8px 12px', background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', flex: 1, maxWidth: 280 }}
          />
          <button
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={submitAccessoryForm}
          >
            + Add
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {state.accessories.map((a) => (
          <span key={a.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '6px 14px', borderRadius: 999, background: 'var(--color-accent-100)', color: 'var(--color-accent-800)' }}>
            {a.name}
            {isAdmin && (
              <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 15, lineHeight: 1 }} onClick={() => removeAccessory(a.id)}>
                ×
              </button>
            )}
          </span>
        ))}
        {state.accessories.length === 0 && <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>No accessories yet.</p>}
      </div>
    </div>
  );
}
