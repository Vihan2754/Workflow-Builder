import { useEffect } from 'react';

/**
 * Observe size changes of an element.
 *
 * @param {React.RefObject<HTMLElement>} ref
 * @param {() => void} onResize
 */
export function useResizeObserver(ref, onResize) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => onResize());
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, onResize]);
}
