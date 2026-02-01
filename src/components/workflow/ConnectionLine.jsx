import styles from './ConnectionLine.module.css';

/**
 * Draw a simple bezier connection between two DOM elements.
 * We compute coordinates relative to the `containerEl`.
 *
 * @param {{fromEl: HTMLElement|null, toEl: HTMLElement|null, containerEl: HTMLElement|null}} props
 */
export default function ConnectionLine({ fromEl, toEl, containerEl }) {
  if (!fromEl || !toEl || !containerEl) return null;

  const c = containerEl.getBoundingClientRect();
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();

  // Connect from bottom-center of parent to top-center of child.
  const x1 = a.left - c.left + a.width / 2;
  const y1 = a.top - c.top + a.height;
  const x2 = b.left - c.left + b.width / 2;
  const y2 = b.top - c.top;

  // Workflow-style elbow connector:
  // down a bit -> across -> down/up into target.
  const dx = x2 - x1;
  const sign = dx === 0 ? 1 : Math.sign(dx);
  const r = Math.min(14, Math.max(8, Math.abs(dx) * 0.08));
  const gutter = 26;
  const midY = y1 + gutter;

  // When nodes are almost vertically aligned, use a clean straight line.
  if (Math.abs(dx) < 18) {
    const dStraight = `M ${x1} ${y1} L ${x2} ${y2}`;
    return <path className={styles.path} d={dStraight} markerEnd="url(#wf-conn-arrow)" />;
  }

  const x1Corner = x1 + r * sign;
  const x2Corner = x2 - r * sign;

  // Rounded corners using quadratic curves.
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
