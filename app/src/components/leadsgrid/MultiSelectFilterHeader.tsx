import type { FilterKey } from '../../types';
import { filterHeaderBg } from '../../data/format';
import { useApp } from '../../store/AppStore';

interface Option {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}

interface Props {
  label: string;
  filterKey: FilterKey;
  options: Option[];
  activeLabel: string;
  hasActive: boolean;
  onClear: () => void;
  width?: number;
}

export function MultiSelectFilterHeader({ label, filterKey, options, activeLabel, hasActive, onClear, width = 220 }: Props) {
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
          {activeLabel}
        </div>
      )}
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 10, marginTop: 4, zIndex: 40, background: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', padding: 12, textTransform: 'none', letterSpacing: 'normal', fontSize: 12, fontWeight: 400, width, maxHeight: 260, overflowY: 'auto' }}>
          {options.map((opt) => (
            <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 2px', cursor: 'pointer' }}>
              <input type="checkbox" checked={opt.checked} onChange={opt.onToggle} style={{ width: 14, height: 14, accentColor: 'var(--color-accent)' }} />
              {opt.label}
            </label>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, borderTop: '1px solid var(--color-divider)', paddingTop: 8 }}>
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
