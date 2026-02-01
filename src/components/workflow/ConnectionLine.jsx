import styles from './ConnectionLine.module.css';

/**
 * Draw an orthogonal connection between two DOM elements.
 * We compute coordinates relative to the `containerEl`.
 *
 * @param {{fromEl: HTMLElement|null, toEl: HTMLElement|null, containerEl: HTMLElement|null, mode?: 'sequence'|'branch', scale?: number}} props
 */
export default function ConnectionLine({ fromEl, toEl, containerEl, mode = 'sequence', scale = 1 }) {
  if (!fromEl || !toEl || !containerEl) return null;

  const s = scale || 1;
  const c = containerEl.getBoundingClientRect();
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();

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
  const B = toLocal(b);

  const snap = (v) => Math.round(v * 2) / 2;

  // For sequence flow we join blocks from the middle of the bottom/top edges
  // (matches the reference where the line runs down the center).
  if (mode === 'sequence') {
    const x1 = snap(A.left + A.width / 2);
    const y1 = snap(A.bottom);
    const x2 = snap(B.left + B.width / 2);
    const y2 = snap(B.top);

    const dx = x2 - x1;
    const dy = y2 - y1;

    // If almost aligned, keep it straight.
    if (Math.abs(dx) < 10) {
      const dStraight = `M ${x1} ${y1} L ${x2} ${y2}`;
      return <path className={styles.path} d={dStraight} markerEnd="url(#wf-conn-arrow)" />;
    }

    let midY = snap((y1 + y2) / 2);
    if (Math.abs(dy) < 60) midY = y1 + (dy >= 0 ? 28 : -28);
    midY = snap(midY);

    const r = 12;
    const sign = Math.sign(dx) || 1;
    const x1Corner = snap(x1 + r * sign);
    const x2Corner = snap(x2 - r * sign);

    const d = [
      `M ${x1} ${y1}`,
      `L ${x1} ${midY - r}`,
      `Q ${x1} ${midY} ${x1Corner} ${midY}`,
      `L ${x2Corner} ${midY}`,
      `Q ${x2} ${midY} ${x2} ${midY + r}`,
      `L ${x2} ${y2}`
    ].join(' ');

    return <path className={styles.path} d={d} markerEnd="url(#wf-conn-arrow)" />;
  }

  // Branch mode: use the middle of the most relevant facing edges.
  // If the child is mostly below the parent, connect bottom->top.
  // If the child is mostly to the side, connect side->side.
  const from = {
    left: A.left,
    right: A.right,
    top: A.top,
    bottom: A.bottom,
    cx: A.left + A.width / 2,
    cy: A.top + A.height / 2
  };

  const to = {
    left: B.left,
    right: B.right,
    top: B.top,
    bottom: B.bottom,
    cx: B.left + B.width / 2,
    cy: B.top + B.height / 2
  };

  /** @type {'vertical' | 'horizontal'} */
  let orientation = 'vertical';

  /** @type {number} */
  let x1;
  /** @type {number} */
  let y1;
  /** @type {number} */
  let x2;
  /** @type {number} */
  let y2;

  if (to.top >= from.bottom) {
    // Downward
    orientation = 'vertical';
    x1 = from.cx;
    y1 = from.bottom;
    x2 = to.cx;
    y2 = to.top;
  } else if (to.bottom <= from.top) {
    // Upward
    orientation = 'vertical';
    x1 = from.cx;
    y1 = from.top;
    x2 = to.cx;
    y2 = to.bottom;
  } else if (to.left >= from.right) {
    // Rightward
    orientation = 'horizontal';
    x1 = from.right;
    y1 = from.cy;
    x2 = to.left;
    y2 = to.cy;
  } else if (to.right <= from.left) {
    // Leftward
    orientation = 'horizontal';
    x1 = from.left;
    y1 = from.cy;
    x2 = to.right;
    y2 = to.cy;
  } else {
    // Overlapping in both axes: fall back to center-to-center.
    orientation = 'vertical';
    x1 = from.cx;
    y1 = from.cy;
    x2 = to.cx;
    y2 = to.cy;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;

  // Rounded elbow routing.
  const r = 12;

  if (orientation === 'vertical') {
    // Horizontal segment in the middle.
    let midY = snap((y1 + y2) / 2);
    if (Math.abs(dy) < 50) midY = y1 + (dy >= 0 ? 24 : -24);
    midY = snap(midY);

    // If almost aligned, straight line.
    if (Math.abs(dx) < 10) {
      const dStraight = `M ${x1} ${y1} L ${x2} ${y2}`;
      return <path className={styles.path} d={dStraight} markerEnd="url(#wf-conn-arrow)" />;
    }

    const sign = Math.sign(dx) || 1;
    const x1Corner = snap(x1 + r * sign);
    const x2Corner = snap(x2 - r * sign);

    const d = [
      `M ${x1} ${y1}`,
      `L ${x1} ${midY - r}`,
      `Q ${x1} ${midY} ${x1Corner} ${midY}`,
      `L ${x2Corner} ${midY}`,
      `Q ${x2} ${midY} ${x2} ${midY + r}`,
      `L ${x2} ${y2}`
    ].join(' ');

    return <path className={styles.path} d={d} markerEnd="url(#wf-conn-arrow)" />;
  }

  // Horizontal orientation: vertical segment in the middle.
  let midX = snap((x1 + x2) / 2);
  if (Math.abs(dx) < 90) midX = x1 + (dx >= 0 ? 32 : -32);
  midX = snap(midX);

  if (Math.abs(dy) < 10) {
    const dStraight = `M ${x1} ${y1} L ${x2} ${y2}`;
    return <path className={styles.path} d={dStraight} markerEnd="url(#wf-conn-arrow)" />;
  }

  const signY = Math.sign(dy) || 1;
  const y1Corner = snap(y1 + r * signY);
  const y2Corner = snap(y2 - r * signY);

  const d = [
    `M ${x1} ${y1}`,
    `L ${midX - r} ${y1}`,
    `Q ${midX} ${y1} ${midX} ${y1Corner}`,
    `L ${midX} ${y2Corner}`,
    `Q ${midX} ${y2} ${midX + r} ${y2}`,
    `L ${x2} ${y2}`
  ].join(' ');

  return <path className={styles.path} d={d} markerEnd="url(#wf-conn-arrow)" />;
}
