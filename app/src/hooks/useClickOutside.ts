import { useEffect, useRef } from 'react';

// Closes an open dropdown/popover on any click outside its DOM subtree. `enabled` should be
// the popover's own open state, so the listener is only attached while it's actually open.
export function useClickOutside<T extends HTMLElement>(onOutside: () => void, enabled: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [enabled, onOutside]);
  return ref;
}
