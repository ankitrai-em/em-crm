import { DISPOSITIONS, getDisposition } from '../../data/constants';
import { useApp } from '../../store/AppStore';

export function RemarksCard() {
  const { state, openCallForm, cancelCallForm, updateCallForm, saveCallOutcome } = useApp();
  const form = state.callForm;
  const isConnected = getDisposition(form.disposition).connected;

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 22 }}>
      <h5 style={{ margin: '0 0 14px' }}>Remarks</h5>
      {!form.open && (
        <button
          style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onClick={openCallForm}
        >
          + Log a Call
        </button>
      )}
      {form.open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ maxWidth: 280 }}>
            <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Disposition</label>
            <select
              value={form.disposition}
              onChange={(e) => updateCallForm({ disposition: e.target.value })}
              style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            >
              {DISPOSITIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          {isConnected && (
            <div style={{ maxWidth: 220 }}>
              <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Call duration (mm:ss)</label>
              <input
                type="text"
                placeholder="e.g. 2:30"
                value={form.duration}
                onChange={(e) => updateCallForm({ duration: e.target.value })}
                style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
              />
              <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 6 }}>Over 2 minutes moves this lead to "Connected &amp; Pitched".</div>
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Remarks</label>
            <textarea
              value={form.remarks}
              onChange={(e) => updateCallForm({ remarks: e.target.value })}
              placeholder="Add any notes from the call…"
              style={{ width: '100%', minHeight: 70, padding: '8px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              onClick={saveCallOutcome}
            >
              Save Remarks
            </button>
            <button
              style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}
              onClick={cancelCallForm}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
