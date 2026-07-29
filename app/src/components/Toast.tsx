import { useApp } from '../store/AppStore';

export function Toast() {
  const { state } = useApp();
  if (!state.toast) return null;
  return (
    <div
      style={{
        position: 'fixed', top: 18, right: 48, zIndex: 60, background: 'var(--color-neutral-900)', color: 'var(--color-bg)',
        padding: '12px 20px', borderRadius: 'var(--radius-md)', fontSize: 13, boxShadow: 'var(--shadow-lg)',
      }}
    >
      {state.toast}
    </div>
  );
}
