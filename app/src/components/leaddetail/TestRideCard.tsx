import type { Lead } from '../../types';
import { formatDateTime } from '../../data/format';
import { useApp } from '../../store/AppStore';

const STORES = ['MG Road Experience Store', 'Whitefield Hub', 'Andheri West Showroom', 'Salt Lake Studio', 'Anna Nagar Store'];

export function TestRideCard({ lead }: { lead: Lead }) {
  const { state, openTestRideForm, cancelTestRideForm, updateTestRideForm, saveTestRide } = useApp();
  const form = state.testRideForm;

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 22 }}>
      <h5 style={{ margin: '0 0 14px' }}>Test Ride</h5>
      {lead.testRide && (
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>Store:</span> {lead.testRide.store}
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>When:</span> {formatDateTime(lead.testRide.date)}
          </div>
          <div>
            <span style={{ color: 'var(--color-neutral-600)' }}>Dealer:</span> {lead.testRide.dealer}
          </div>
        </div>
      )}
      {!form.open && (
        <button
          style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onClick={openTestRideForm}
        >
          {lead.testRide ? 'Update Test Ride' : 'Book Test Ride'}
        </button>
      )}
      {form.open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Date &amp; time</label>
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => updateTestRideForm({ date: e.target.value })}
              style={{ width: '100%', maxWidth: 260, minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Store / Location</label>
            <select
              value={form.store}
              onChange={(e) => updateTestRideForm({ store: e.target.value })}
              style={{ width: '100%', maxWidth: 280, minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            >
              <option value="">Select store…</option>
              {STORES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, marginBottom: 5, color: 'color-mix(in srgb, var(--color-text) 70%, transparent)' }}>Dealer / Rep name</label>
            <input
              type="text"
              value={form.dealer}
              onChange={(e) => updateTestRideForm({ dealer: e.target.value })}
              style={{ width: '100%', maxWidth: 280, minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              onClick={saveTestRide}
            >
              Save
            </button>
            <button
              style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}
              onClick={cancelTestRideForm}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
