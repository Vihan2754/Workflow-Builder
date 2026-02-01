import { useEffect, useRef, useState } from 'react';
import styles from './NodeEditor.module.css';

/**
 * Inline label editor.
 * Double click to edit; Enter commits; Escape cancels; blur commits.
 *
 * @param {{ value: string, onCommit: (next: string) => void }} props
 */
export default function NodeEditor({ value, onCommit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    if (next.length && next !== value) onCommit(next);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className={styles.labelButton}
        onDoubleClick={() => setEditing(true)}
        title="Double click to edit"
      >
        {value}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      className={styles.input}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') cancel();
      }}
      aria-label="Edit node label"
    />
  );
}
