import { useCallback } from 'react';
import NodeEditor from './NodeEditor.jsx';
import styles from './Node.module.css';
import { NODE_TYPES } from '../../domain/workflowModel.js';

/**
 * @param {{
 *  node: import('../../domain/workflowModel.js').Node,
 *  rootId: string,
 *  registerPort: (key: string, el: HTMLElement|null) => void,
 *  onOpenMenu: (event: PointerEvent | MouseEvent, slot: null|'true'|'false') => void,
 *  onDelete: () => void,
 *  onLabelChange: (label: string) => void
 * }} props
 */
export default function Node({ node, rootId, registerPort, onOpenMenu, onDelete, onLabelChange }) {
  const isRoot = node.id === rootId || node.type === NODE_TYPES.start;
  const isDeletable = !isRoot;

  const setNodeRef = useCallback((el) => registerPort(`node:${node.id}`, el), [registerPort, node.id]);
  const setInPortRef = useCallback((el) => registerPort(`port:${node.id}:in`, el), [registerPort, node.id]);
  const setOutPortRef = useCallback((el) => registerPort(`port:${node.id}:out`, el), [registerPort, node.id]);

  return (
    <div className={styles.nodeWrap}>
      <div
        ref={setNodeRef}
        className={styles.nodeCard}
        data-type={node.type}
      >
        <div className={styles.nodeHeader}>
          <div className={styles.badge}>{node.type.toUpperCase()}</div>

          <div className={styles.titleArea}>
            <NodeEditor value={node.label} onCommit={onLabelChange} />
          </div>

          {isDeletable ? (
            <button className={styles.deleteBtn} type="button" onClick={onDelete} title="Delete node">
              Delete
            </button>
          ) : (
            <span className={styles.lockedHint} title="Start node cannot be deleted">
              Locked
            </span>
          )}
        </div>

        <div className={styles.portsRow}>
          <div ref={setInPortRef} className={styles.portIn} title="Incoming" />

          <div className={styles.outPorts}>
            {node.type === NODE_TYPES.branch ? (
              <>
                <button
                  ref={setOutPortRef}
                  className={styles.portOut}
                  type="button"
                  onPointerDown={(e) => onOpenMenu(e, 'true')}
                  title="Add node on True path"
                  data-branch="true"
                >
                  + True
                </button>
                <button
                  ref={(el) => registerPort(`port:${node.id}:out:false`, el)}
                  className={styles.portOut}
                  type="button"
                  onPointerDown={(e) => onOpenMenu(e, 'false')}
                  title="Add node on False path"
                  data-branch="false"
                >
                  + False
                </button>
              </>
            ) : node.type === NODE_TYPES.end ? (
              <span className={styles.endHint}>No exits</span>
            ) : (
              <button
                ref={setOutPortRef}
                className={styles.portOut}
                type="button"
                onPointerDown={(e) => onOpenMenu(e, null)}
                title="Add next node"
              >
                + Add
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
