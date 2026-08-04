import { useApp } from '../../store/AppStore';
import type { BuyingFor } from '../../types';

const BUYING_FOR_OPTIONS: BuyingFor[] = ['', 'Self', 'Child', 'Wife', 'Parent', 'Friend'];

export function CustomerProfileModal() {
  const { state, updateCustomerProfileForm, closeCustomerProfileForm, saveCustomerProfile } = useApp();
  const form = state.customerProfileForm;
  if (!form.open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, background: 'color-mix(in srgb, var(--color-neutral-900) 50%, transparent)', zIndex: 50 }}>
      <div style={{ width: 'min(400px, 100%)', display: 'flex', flexDirection: 'column', gap: 16, padding: 26, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
        <h4 style={{ margin: 0 }}>Customer Profile</h4>
        <div>
          <label style={fieldLabel}>Buying for</label>
          <select
            value={form.buyingFor}
            onChange={(e) => updateCustomerProfileForm({ buyingFor: e.target.value as BuyingFor })}
            style={fieldInput}
          >
            {BUYING_FOR_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt || 'Select…'}
              </option>
            ))}
          </select>
        </div>
        <Field label="Cyclist weight (kg)" value={form.cyclistWeight} onChange={(v) => updateCustomerProfileForm({ cyclistWeight: v })} />
        <Field label="Cyclist height (cm)" value={form.cyclistHeight} onChange={(v) => updateCustomerProfileForm({ cyclistHeight: v })} />
        <Field label="Budget (₹)" value={form.budget} onChange={(v) => updateCustomerProfileForm({ budget: v })} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }} onClick={closeCustomerProfileForm}>
            Cancel
          </button>
          <button
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={saveCustomerProfile}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={fieldLabel}>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={fieldInput} />
    </div>
  );
}

const fieldLabel = { display: 'block', fontSize: 12, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' } as const;
const fieldInput = { width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 14, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' } as const;
