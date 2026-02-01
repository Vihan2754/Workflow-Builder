import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACTIONS } from '../../state/workflowActions.js';
import { useWorkflowState } from '../../state/useWorkflowState.js';
import { NODE_TYPES, getOutgoingChildId } from '../../domain/workflowModel.js';
import { useEventListener } from '../../utils/hooks/useEventListener.js';
import { useResizeObserver } from '../../utils/hooks/useResizeObserver.js';
import { usePortRegistry } from '../../utils/hooks/usePortRegistry.js';

import Node from './Node.jsx';
import ConnectionLine from './ConnectionLine.jsx';
import BranchConnector from './BranchConnector.jsx';
import NodeMenu from './NodeMenu.jsx';
import Controls from './Controls.jsx';

import styles from './WorkflowCanvas.module.css';

/**
 * Renders a vertical tree layout + SVG connections.
 * Owns transient UI state like NodeMenu positioning.
 */
export default function WorkflowCanvas() {
  const { workflow, dispatch, canUndo, canRedo, undo, redo } = useWorkflowState();

  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const treeRef = useRef(null);
  const ports = usePortRegistry();

  const [menu, setMenu] = useState(
    /** @type {{open: boolean, x: number, y: number, parentId: string|null, slot: null|'true'|'false'}} */
    ({ open: false, x: 0, y: 0, parentId: null, slot: null })
  );

  const closeMenu = useCallback(() => {
    setMenu((m) => ({ ...m, open: false, parentId: null }));
  }, []);

  const openMenuAtEvent = useCallback((event, parentId, slot) => {
    event.preventDefault();
    event.stopPropagation();

    // Menu is positioned in *unscaled stage coordinates*.
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    const x = event.clientX - stageRect.left;
    const y = event.clientY - stageRect.top;

    setMenu({ open: true, x, y, parentId, slot });
  }, []);

  const onAddNode = useCallback(
    (nodeType) => {
      if (!menu.parentId) return;
      dispatch({
        type: ACTIONS.ADD_NODE,
        payload: {
          parentId: menu.parentId,
          slot: menu.slot,
          nodeType
        }
      });
      closeMenu();
    },
    [dispatch, menu.parentId, menu.slot, closeMenu]
  );

  const onDeleteNode = useCallback(
    (nodeId) => {
      dispatch({ type: ACTIONS.DELETE_NODE, payload: { nodeId } });
    },
    [dispatch]
  );

  const onUpdateLabel = useCallback(
    (nodeId, label) => {
      dispatch({ type: ACTIONS.UPDATE_NODE_LABEL, payload: { nodeId, label } });
    },
    [dispatch]
  );

  const onSave = useCallback(() => {
    // Production apps would POST this to an API.
    // For the assignment requirement, log JSON to console.
    // eslint-disable-next-line no-console
    console.log('Workflow JSON:', workflow);
  }, [workflow]);

  // Close menu on escape and outside click.
  useEventListener(window, 'keydown', (e) => {
    if (!menu.open) return;
    if (e.key === 'Escape') closeMenu();

    // Undo/redo shortcuts.
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;

    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        if (canRedo) redo();
      } else {
        if (canUndo) undo();
      }
    }

    if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      if (canRedo) redo();
    }
  });

  useEventListener(window, 'pointerdown', () => {
    if (menu.open) closeMenu();
  });

  // Compact centered tree layout
  const renderTree = useCallback(
    (nodeId, depth) => {
      const node = workflow.nodes[nodeId];
      if (!node) return null;

      const childTrueId = node.type === NODE_TYPES.branch ? node.exits?.true ?? null : null;
      const childFalseId = node.type === NODE_TYPES.branch ? node.exits?.false ?? null : null;
      const singleChildId = node.type !== NODE_TYPES.branch ? getOutgoingChildId(node, null) : null;

      return (
        <div key={nodeId} className={styles.treeRow}>
          <Node
            node={node}
            rootId={workflow.rootId}
            registerPort={ports.register}
            onOpenMenu={(e, slot) => openMenuAtEvent(e, nodeId, slot)}
            onDelete={() => onDeleteNode(nodeId)}
            onLabelChange={(label) => onUpdateLabel(nodeId, label)}
          />

          {node.type === NODE_TYPES.branch ? (
            <div className={styles.branchContainer}>
              <div className={styles.branchPath}>
                <span className={styles.branchLabel}>True</span>
                {childTrueId ? renderTree(childTrueId, depth + 1) : null}
              </div>
              <div className={styles.branchPath}>
                <span className={styles.branchLabel}>False</span>
                {childFalseId ? renderTree(childFalseId, depth + 1) : null}
              </div>
            </div>
          ) : (
            singleChildId && <div className={styles.singleChild}>{renderTree(singleChildId, depth + 1)}</div>
          )}
        </div>
      );
    },
    [workflow.nodes, workflow.rootId, ports.register, openMenuAtEvent, onDeleteNode, onUpdateLabel]
  );

  const edges = useMemo(() => {
    /** @type {{sequence: {fromKey: string, toKey: string}[], branches: {fromKey: string, toTrueKey: string|null, toFalseKey: string|null}[]}} */
    const out = { sequence: [], branches: [] };

    for (const node of Object.values(workflow.nodes)) {
      if (node.type === NODE_TYPES.branch) {
        const t = node.exits?.true ?? null;
        const f = node.exits?.false ?? null;
        out.branches.push({
          fromKey: `node:${node.id}`,
          toTrueKey: t ? `node:${t}` : null,
          toFalseKey: f ? `node:${f}` : null
        });
      } else {
        const c = node.children[0] ?? null;
        if (c) out.sequence.push({ fromKey: `node:${node.id}`, toKey: `node:${c}` });
      }
    }

    return out;
  }, [workflow.nodes]);

  const [overlayTick, setOverlayTick] = useState(0);
  const recomputeOverlay = useCallback(() => setOverlayTick((v) => v + 1), []);
  useResizeObserver(canvasRef, recomputeOverlay);

  // When nodes resize (label edits, branch layout changes), keep connectors in sync.
  useResizeObserver(treeRef, recomputeOverlay);

  // Recompute lines when ports mount/unmount.
  // (Avoid doing this inside the registry to prevent update-depth loops.)
  useEffect(() => {
    ports.setOnChange(recomputeOverlay);
  }, [ports, recomputeOverlay]);

  useEffect(() => {
    // Wait a frame so DOM has laid out.
    requestAnimationFrame(() => {
      recomputeOverlay();
    });
  }, [workflow.nodes, recomputeOverlay]);

  return (
    <div className={styles.canvasShell}>
      <Controls
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSave={onSave}
      />

      <div ref={canvasRef} className={styles.canvas}>
        <div className={styles.canvasContent} onPointerDown={(e) => e.stopPropagation()}>
          <div
            ref={stageRef}
            className={styles.stage}
          >
            <svg className={styles.svgOverlay} aria-hidden="true">
            <defs>
              <marker
                id="wf-conn-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#9CA3AF" />
              </marker>
            </defs>

            {edges.sequence.map((edge, idx) => (
              <ConnectionLine
                // overlayTick forces re-render when ResizeObserver/scroll triggers
                key={`seq:${edge.fromKey}->${edge.toKey}:${idx}:${overlayTick}`}
                fromEl={ports.get(edge.fromKey)}
                toEl={ports.get(edge.toKey)}
                containerEl={stageRef.current}
              />
            ))}

            {edges.branches.map((edge, idx) => (
              <BranchConnector
                key={`br:${edge.fromKey}:${idx}:${overlayTick}`}
                fromEl={ports.get(edge.fromKey)}
                toTrueEl={edge.toTrueKey ? ports.get(edge.toTrueKey) : null}
                toFalseEl={edge.toFalseKey ? ports.get(edge.toFalseKey) : null}
                containerEl={stageRef.current}
              />
            ))}
          </svg>

            <div ref={treeRef} className={styles.tree}>
              {renderTree(workflow.rootId, 0)}
            </div>

            <NodeMenu
              open={menu.open}
              x={menu.x}
              y={menu.y}
              onClose={closeMenu}
              onPickType={onAddNode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
