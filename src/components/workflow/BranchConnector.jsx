import styles from './ConnectionLine.module.css';

/**
 * Branch connector: draws a shared trunk down from the branch node,
 * a horizontal split line, and two vertical drops into the children.
 *
 * @param {{
 *  fromEl: HTMLElement|null,
 *  toTrueEl: HTMLElement|null,
 *  toFalseEl: HTMLElement|null,
 *  containerEl: HTMLElement|null,
 *  scale?: number
 * }} props
 */
export default function BranchConnector({ fromEl, toTrueEl, toFalseEl, containerEl, scale = 1 }) {
  if (!fromEl || !containerEl) return null;

  // If only one child exists, fall back to a single connection.
  if (!toTrueEl && !toFalseEl) return null;

  const c = containerEl.getBoundingClientRect();
  const a = fromEl.getBoundingClientRect();
  const s = scale || 1;

  const toLocal = (rect) => {
    const left = (rect.left - c.left) / s;
    const top = (rect.top - c.top) / s;
    const width = rect.width / s;
    const height = rect.height / s;
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height
    };
  };

  const A = toLocal(a);

  const snap = (v) => Math.round(v * 2) / 2;

  const parent = {
    cx: snap(A.left + A.width / 2),
    bottom: snap(A.bottom)
  };

  const tRect = toTrueEl ? toTrueEl.getBoundingClientRect() : null;
  const fRect = toFalseEl ? toFalseEl.getBoundingClientRect() : null;

  const T = tRect ? toLocal(tRect) : null;
  const F = fRect ? toLocal(fRect) : null;

  const trueAnchor = T
    ? {
        x: snap(T.left + T.width / 2),
        y: snap(T.top)
      }
    : null;

  const falseAnchor = F
    ? {
        x: snap(F.left + F.width / 2),
        y: snap(F.top)
      }
    : null;

  const anchors = [trueAnchor, falseAnchor].filter(Boolean);
  if (anchors.length === 1) {
    const only = anchors[0];
    const d = `M ${parent.cx} ${parent.bottom} L ${only.x} ${only.y}`;
    return <path className={styles.path} d={d} markerEnd="url(#wf-conn-arrow)" />;
  }

  const minChildY = Math.min(trueAnchor.y, falseAnchor.y);
  let junctionY = snap((parent.bottom + minChildY) / 2);

  // Ensure the junction is not too close to either end.
  const gap = minChildY - parent.bottom;
  if (gap < 80) junctionY = snap(parent.bottom + 28);

  const minX = Math.min(trueAnchor.x, falseAnchor.x);
  const maxX = Math.max(trueAnchor.x, falseAnchor.x);

  const trunk = `M ${parent.cx} ${parent.bottom} L ${parent.cx} ${junctionY}`;
  const split = `M ${minX} ${junctionY} L ${maxX} ${junctionY}`;
  const dropTrue = `M ${trueAnchor.x} ${junctionY} L ${trueAnchor.x} ${trueAnchor.y}`;
  const dropFalse = `M ${falseAnchor.x} ${junctionY} L ${falseAnchor.x} ${falseAnchor.y}`;

  return (
    <>
      <path className={styles.path} d={trunk} />
      <path className={styles.path} d={split} />
      <path className={styles.path} d={dropTrue} markerEnd="url(#wf-conn-arrow)" />
      <path className={styles.path} d={dropFalse} markerEnd="url(#wf-conn-arrow)" />
    </>
  );
}
