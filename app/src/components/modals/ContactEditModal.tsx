import { useApp } from '../../store/AppStore';

export function ContactEditModal() {
  const { state, updateContactForm, closeContactForm, saveContactEdit } = useApp();
  const form = state.contactForm;
  if (!form.open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, background: 'color-mix(in srgb, var(--color-neutral-900) 50%, transparent)', zIndex: 50 }}>
      <div style={{ width: 'min(400px, 100%)', display: 'flex', flexDirection: 'column', gap: 16, padding: 26, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
        <h4 style={{ margin: 0 }}>Edit Contact Info</h4>
        <Field label="Name" value={form.name} onChange={(v) => updateContactForm({ name: v })} />
        <Field label="Phone number" value={form.phone} onChange={(v) => updateContactForm({ phone: v })} />
        <Field label="Secondary phone number" value={form.secondaryPhone} onChange={(v) => updateContactForm({ secondaryPhone: v })} />
        <Field label="Email" value={form.email} onChange={(v) => updateContactForm({ email: v })} />
        <Field label="Pincode" value={form.pin} onChange={(v) => updateContactForm({ pin: v })} />
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-600)' }}>Changes are recorded in this lead's Activity feed with the old and new values.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }} onClick={closeContactForm}>
            Cancel
          </button>
          <button
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={saveContactEdit}
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
