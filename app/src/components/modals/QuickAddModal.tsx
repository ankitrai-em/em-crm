import { useApp } from '../../store/AppStore';

export function QuickAddModal() {
  const { state, updateQuickField, closeQuickAdd, submitQuickAdd } = useApp();
  if (!state.quickAddOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, background: 'color-mix(in srgb, var(--color-neutral-900) 50%, transparent)', zIndex: 50 }}>
      <div style={{ width: 'min(420px, 100%)', display: 'flex', flexDirection: 'column', gap: 16, padding: 26, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
        <h4 style={{ margin: 0 }}>Quick Add Lead</h4>
        <Field label="Customer name" value={state.quickName} onChange={(v) => updateQuickField('quickName', v)} />
        <Field label="Phone number" value={state.quickPhone} onChange={(v) => updateQuickField('quickPhone', v)} />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Field label="City" value={state.quickCity} onChange={(v) => updateQuickField('quickCity', v)} />
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Pin code" value={state.quickPin} onChange={(v) => updateQuickField('quickPin', v)} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
          <button style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }} onClick={closeQuickAdd}>
            Cancel
          </button>
          <button
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={submitQuickAdd}
          >
            Add Lead
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
