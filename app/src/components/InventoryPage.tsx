import type { CSSProperties } from 'react';
import { useApp } from '../store/AppStore';

export function InventoryPage() {
  const { state, openAddInventory, openEditInventory, removeInventoryItem, closeInventoryForm, updateInventoryForm, submitInventoryForm } = useApp();
  const isAdmin = state.currentUser?.role === 'Admin';
  const form = state.inventoryForm;

  return (
    <div style={{ padding: '12px 48px 40px' }} data-screen-label="Inventory">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Inventory</h2>
        {isAdmin && (
          <button
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={openAddInventory}
          >
            + Add Item
          </button>
        )}
      </div>

      {!isAdmin && <p style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginTop: -8 }}>Only Admins can add, edit, or remove inventory items.</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            {['Model Range', 'Model SKU', 'Model Colour', ''].map((h) => (
              <th key={h} style={headStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.inventory.map((i) => (
            <tr key={i.id}>
              <td style={cellStyle}>{i.modelRange}</td>
              <td style={cellStyle}>{i.modelSku}</td>
              <td style={cellStyle}>{i.modelColour}</td>
              <td style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                {isAdmin && (
                  <>
                    <button style={linkBtn} onClick={() => openEditInventory(i.id)}>
                      Edit
                    </button>
                    <button style={{ ...linkBtn, color: 'var(--color-accent-2-700)', marginLeft: 14 }} onClick={() => removeInventoryItem(i.id)}>
                      Remove
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {state.inventory.length === 0 && (
            <tr>
              <td style={cellStyle} colSpan={4}>
                No inventory items yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {form.open && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 20, background: 'color-mix(in srgb, var(--color-neutral-900) 50%, transparent)', zIndex: 50 }}>
          <div style={{ width: 'min(380px, 100%)', display: 'flex', flexDirection: 'column', gap: 16, padding: 26, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
            <h4 style={{ margin: 0 }}>{form.editingId ? 'Edit Item' : 'Add Item'}</h4>
            <Field label="Model Range" value={form.modelRange} onChange={(v) => updateInventoryForm({ modelRange: v })} />
            <Field label="Model SKU" value={form.modelSku} onChange={(v) => updateInventoryForm({ modelSku: v })} />
            <Field label="Model Colour" value={form.modelColour} onChange={(v) => updateInventoryForm({ modelColour: v })} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }} onClick={closeInventoryForm}>
                Cancel
              </button>
              <button
                style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                onClick={submitInventoryForm}
              >
                {form.editingId ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
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

const headStyle: CSSProperties = {
  textAlign: 'left', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
  color: 'color-mix(in srgb, var(--color-text) 60%, transparent)', padding: 10, borderBottom: '1px solid var(--color-divider)',
};

const cellStyle: CSSProperties = { padding: '12px 10px', borderBottom: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)' };

const linkBtn: CSSProperties = { background: 'none', border: 'none', color: 'var(--color-accent-700)', fontSize: 13, cursor: 'pointer', padding: 0 };
