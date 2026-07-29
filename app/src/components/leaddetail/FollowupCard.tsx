import type { Lead } from '../../types';
import { NOW } from '../../data/constants';
import { formatDateTime, toDateTimeLocalValue } from '../../data/format';
import { useApp } from '../../store/AppStore';

export function FollowupCard({ lead }: { lead: Lead }) {
  const { state, updateFollowupDraft, saveFollowup } = useApp();
  const followupMax = toDateTimeLocalValue(NOW + 15 * 86400000);

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 22 }}>
      <h5 style={{ margin: '0 0 14px' }}>Next Follow-up</h5>
      <div style={{ fontSize: 13, marginBottom: 12 }}>
        Current: <strong>{lead.followupAt ? formatDateTime(lead.followupAt) : '—'}</strong>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            type="datetime-local"
            value={state.followupDraft}
            max={followupMax}
            onChange={(e) => updateFollowupDraft(e.target.value)}
            style={{ width: '100%', minHeight: 36, padding: '6px 10px', fontSize: 13, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
          />
          <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 5 }}>Can't be scheduled more than 15 days out.</div>
        </div>
        <button
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: '1px solid transparent', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          onClick={saveFollowup}
        >
          Save
        </button>
      </div>
    </div>
  );
}
