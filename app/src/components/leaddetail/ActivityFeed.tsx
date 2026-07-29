import type { Lead } from '../../types';
import { formatDateTime, formatDuration } from '../../data/format';
import { PhoneIcon } from '../icons/Icons';

export function ActivityFeed({ lead }: { lead: Lead }) {
  const sorted = lead.activity.slice().sort((a, b) => b.ts - a.ts);

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 22 }}>
      <h5 style={{ margin: '0 0 14px' }}>Activity</h5>
      {sorted.map((a, i) => {
        const iconColor = a.kind === 'call' ? (a.connected ? 'var(--color-accent-700)' : 'var(--color-accent-2-700)') : 'var(--color-neutral-600)';
        return (
          <div key={i} style={{ padding: '11px 0', borderBottom: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)', fontSize: 13 }}>
            {a.kind === 'call' ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 'none', marginTop: 2 }}>
                  <PhoneIcon size={15} color={iconColor} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--color-accent-700)', fontWeight: 600 }}>{a.text}</div>
                  {a.duration != null && <div style={{ color: 'var(--color-neutral-600)', fontSize: 12, marginTop: 2 }}>Duration: {formatDuration(a.duration)}</div>}
                  {!a.connected && <div style={{ color: 'var(--color-neutral-500)', fontSize: 12, marginTop: 4 }}>No recording available</div>}
                  {a.connected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', padding: '6px 10px', maxWidth: 240, fontSize: 11, color: 'var(--color-neutral-600)' }}>
                      <span>▶</span>
                      <div style={{ flex: 1, height: 3, background: 'var(--color-divider)', borderRadius: 2 }} />
                    </div>
                  )}
                  {!!a.remarks && <div style={{ color: 'var(--color-neutral-700)', fontSize: 12, marginTop: 5, fontStyle: 'italic' }}>"{a.remarks}"</div>}
                  <div style={{ color: 'var(--color-neutral-500)', fontSize: 11, marginTop: 5 }}>{formatDateTime(a.ts)}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ color: 'var(--color-neutral-600)', whiteSpace: 'nowrap', minWidth: 110 }}>{formatDateTime(a.ts)}</div>
                <div>{a.text}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
