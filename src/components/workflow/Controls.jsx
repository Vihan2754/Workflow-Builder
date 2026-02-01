import styles from './Controls.module.css';

/**
 * @param {{
 *  canUndo: boolean,
 *  canRedo: boolean,
 *  onUndo: () => void,
 *  onRedo: () => void,
 *  onSave: () => void
 * }} props
 */
export default function Controls({ canUndo, canRedo, onUndo, onRedo, onSave }) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <button className={styles.btn} type="button" onClick={onSave}>
          Save (log JSON)
        </button>
      </div>

      <div className={styles.right}>
        <button className={styles.btn} type="button" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button className={styles.btn} type="button" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
      </div>
    </div>
  );
}
