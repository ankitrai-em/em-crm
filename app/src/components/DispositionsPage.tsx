import { useEffect, useState } from 'react';
import { useApp } from '../store/AppStore';
import type { Disposition } from '../types';

function newId(prefix: string) {
  return prefix + '_' + Math.random().toString(36).slice(2, 8);
}

export function DispositionsPage() {
  const { state, saveDispositions } = useApp();
  const [draft, setDraft] = useState<Disposition[]>(state.dispositions);
  const [subInputs, setSubInputs] = useState<Record<string, string>>({});

  useEffect(() => setDraft(state.dispositions), [state.dispositions]);

  if (state.currentUser?.role !== 'Admin') {
    return (
      <div style={{ padding: '12px 48px 40px' }}>
        <p style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>Only Admins can edit dispositions.</p>
      </div>
    );
  }

  const addDisposition = () => setDraft((d) => [...d, { id: newId('disp'), label: 'New Disposition', connected: false, subDispositions: [] }]);
  const removeDisposition = (id: string) => setDraft((d) => d.filter((x) => x.id !== id));
  const updateDisposition = (id: string, patch: Partial<Disposition>) => setDraft((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addSub = (dispositionId: string) => {
    const label = subInputs[dispositionId]?.trim();
    if (!label) return;
    setDraft((d) => d.map((x) => (x.id === dispositionId ? { ...x, subDispositions: [...x.subDispositions, { id: newId('sub'), label }] } : x)));
    setSubInputs((s) => ({ ...s, [dispositionId]: '' }));
  };
  const removeSub = (dispositionId: string, subId: string) =>
    setDraft((d) => d.map((x) => (x.id === dispositionId ? { ...x, subDispositions: x.subDispositions.filter((s) => s.id !== subId) } : x)));

  return (
    <div style={{ padding: '12px 48px 40px' }} data-screen-label="Dispositions">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Dispositions &amp; Sub-dispositions</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}
            onClick={addDisposition}
          >
            + Add Disposition
          </button>
          <button
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
            onClick={() => saveDispositions(draft)}
          >
            Save
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {draft.map((d) => (
          <div key={d.id} style={{ padding: 18, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={d.label}
                onChange={(e) => updateDisposition(d.id, { label: e.target.value })}
                style={{ fontSize: 15, fontWeight: 600, padding: '6px 10px', background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input type="checkbox" checked={d.connected} onChange={(e) => updateDisposition(d.id, { connected: e.target.checked })} />
                Counts as connected
              </label>
              <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-accent-2-700)', fontSize: 13, cursor: 'pointer' }} onClick={() => removeDisposition(d.id)}>
                Remove
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {d.subDispositions.map((sd) => (
                <span key={sd.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'var(--color-accent-100)', color: 'var(--color-accent-800)' }}>
                  {sd.label}
                  <button style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }} onClick={() => removeSub(d.id, sd.id)}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Add sub-disposition…"
                value={subInputs[d.id] || ''}
                onChange={(e) => setSubInputs((s) => ({ ...s, [d.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addSub(d.id)}
                style={{ fontSize: 13, padding: '6px 10px', background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', flex: 1, maxWidth: 240 }}
              />
              <button
                style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}
                onClick={() => addSub(d.id)}
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
