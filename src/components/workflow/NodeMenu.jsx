import styles from './NodeMenu.module.css';

/**
 * Small popup menu used to add a node.
 *
 * @param {{
 *  open: boolean,
 *  x: number,
 *  y: number,
 *  onClose: () => void,
 *  onPickType: (nodeType: 'action'|'branch'|'end') => void
 * }} props
 */
export default function NodeMenu({ open, x, y, onClose, onPickType }) {
  if (!open) return null;

  return (
    <div
      className={styles.menu}
      style={{ left: x, top: y }}
      role="dialog"
      aria-label="Add node menu"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={styles.header}>
        <div className={styles.title}>Add node</div>
        <button className={styles.close} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className={styles.actions}>
        <button className={styles.item} type="button" onClick={() => onPickType('action')}>
          Action
        </button>
        <button className={styles.item} type="button" onClick={() => onPickType('branch')}>
          Branch (True/False)
        </button>
        <button className={styles.item} type="button" onClick={() => onPickType('end')}>
          End
        </button>
      </div>
    </div>
  );
}
