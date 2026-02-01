import { useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Registry for DOM elements keyed by string. Used to measure node/port positions
 * without any diagramming libraries.
 */
export function usePortRegistry() {
  const elementsRef = useRef(/** @type {Map<string, HTMLElement>} */ (new Map()));
  const onChangeRef = useRef(/** @type {null | (() => void)} */ (null));

  // Optional listener set by consumer (WorkflowCanvas) to recompute overlays.
  useEffect(() => {
    // noop by default
  }, []);

  const register = useCallback((key, el) => {
    if (!key) return;

    const prev = elementsRef.current.get(key) || null;

    if (el) {
      if (prev !== el) elementsRef.current.set(key, el);
      else return;
    } else {
      if (prev) elementsRef.current.delete(key);
      else return;
    }

    // Notify consumer (if any) without forcing state updates here.
    // Use rAF to batch multiple ref mounts in a single frame.
    if (onChangeRef.current) {
      requestAnimationFrame(() => onChangeRef.current && onChangeRef.current());
    }
  }, []);

  const api = useMemo(() => {
    return {
      register,
      get: (key) => elementsRef.current.get(key) || null,
      keys: () => Array.from(elementsRef.current.keys()),
      setOnChange: (fn) => {
        onChangeRef.current = fn;
      }
    };
  }, [register]);

  return api;
}
