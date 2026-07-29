import type { FilterKey } from '../../types';
import { filterHeaderBg } from '../../data/format';
import { useApp } from '../../store/AppStore';

interface Props {
  label: string;
  filterKey: FilterKey;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  caption: string;
  hasActive: boolean;
  onClear: () => void;
}

export function DateRangeFilterHeader({ label, filterKey, from, to, onFromChange, onToChange, caption, hasActive, onClear }: Props) {
  const { state, toggleFilterPopover } = useApp();
  const isOpen = state.openFilter === filterKey;

  return (
    <th style={{ textAlign: 'left', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'color-mix(in srgb, var(--color-text) 60%, transparent)', padding: 10, borderBottom: '1px solid var(--color-divider)', position: 'relative' }}>
      <span
        style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-block', padding: '2px 6px', borderRadius: 3, background: filterHeaderBg(hasActive) }}
        onClick={() => toggleFilterPopover(filterKey)}
      >
        {label} ▾
      </span>
      {hasActive && (
        <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--color-neutral-700)', marginTop: 3, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'none', letterSpacing: 'normal' }}>
          {caption}
        </div>
      )}
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 10, marginTop: 4, zIndex: 40, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', padding: 14, textTransform: 'none', letterSpacing: 'normal', fontSize: 12, fontWeight: 400, width: 230 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <input
              type="date"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              style={{ width: 100, minHeight: 32, padding: '5px 6px', fontSize: 12, background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            />
            <span style={{ color: 'var(--color-neutral-500)' }}>–</span>
            <input
              type="date"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              style={{ width: 100, minHeight: 32, padding: '5px 6px', fontSize: 12, background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginTop: 8 }}>{caption}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <button style={{ background: 'transparent', color: 'var(--color-accent)', border: 'none', padding: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={onClear}>
              Clear
            </button>
            <button style={{ background: 'var(--color-accent)', color: 'var(--color-bg)', border: 'none', borderRadius: 'var(--radius-md)', padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} onClick={() => toggleFilterPopover(filterKey)}>
              Done
            </button>
          </div>
        </div>
      )}
    </th>
  );
}
