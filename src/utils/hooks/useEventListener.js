import { useEffect, useRef } from 'react';

/**
 * Subscribe to a DOM event with a stable handler.
 *
 * @template {keyof WindowEventMap} K
 * @param {Window | Document | HTMLElement | null} target
 * @param {K} type
 * @param {(event: WindowEventMap[K]) => void} handler
 * @param {AddEventListenerOptions | boolean=} options
 */
export function useEventListener(target, type, handler, options) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!target) return;

    /** @param {any} event */
    const listener = (event) => handlerRef.current(event);

    target.addEventListener(type, listener, options);
    return () => target.removeEventListener(type, listener, options);
  }, [target, type, options]);
}
