import {
  NODE_TYPES,
  createInitialWorkflow,
  createNode,
  getOutgoingChildId,
  setOutgoingChildId
} from '../domain/workflowModel.js';
import { ACTIONS } from './workflowActions.js';

/**
 * @typedef {import('../domain/workflowModel.js').Workflow} Workflow
 * @typedef {import('../domain/workflowModel.js').Node} Node
 * @typedef {import('../domain/workflowModel.js').ConnectionSlot} ConnectionSlot
 */

/**
 * @typedef {Object} HistoryState
 * @property {Workflow[]} past
 * @property {Workflow} present
 * @property {Workflow[]} future
 */

/**
 * @returns {HistoryState}
 */
export function createInitialHistoryState() {
  return {
    past: [],
    present: createInitialWorkflow(),
    future: []
  };
}

/**
 * @param {Workflow} workflow
 * @param {string} rootId
 * @returns {string[]}
 */
function collectSubtreeIds(workflow, rootId) {
  const visited = new Set();
  const stack = [rootId];

  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || visited.has(id)) continue;

    visited.add(id);
    const node = workflow.nodes[id];
    if (!node) continue;

    for (const childId of node.children) {
      if (childId) stack.push(childId);
    }
  }

  return Array.from(visited);
}

/**
 * Find which slot in `parent` points at `childId`.
 *
 * @param {Node} parent
 * @param {string} childId
 * @returns {ConnectionSlot}
 */
function findSlotForChild(parent, childId) {
  if (parent.type === NODE_TYPES.branch) {
    if (parent.exits?.true === childId) return 'true';
    if (parent.exits?.false === childId) return 'false';
    return 'true';
  }
  return null;
}

/**
 * Pure workflow reducer (no history).
 *
 * @param {Workflow} workflow
 * @param {any} action
 * @returns {Workflow}
 */
export function workflowReducer(workflow, action) {
  switch (action.type) {
    case ACTIONS.ADD_NODE: {
      const parentId = action.payload?.parentId;
      /** @type {ConnectionSlot} */
      const slot = action.payload?.slot ?? null;
      const newType = action.payload?.nodeType;
      const label = action.payload?.label;

      if (!parentId || !newType) return workflow;
      const parent = workflow.nodes[parentId];
      if (!parent) return workflow;

      // END nodes cannot have outgoing children.
      if (parent.type === NODE_TYPES.end) return workflow;

      const existingChildId = getOutgoingChildId(parent, slot);

      // Create node and insert it between parent and existing child.
      const inserted = createNode({ type: newType, parentId, label });
      let insertedUpdated = inserted;

      // Preserve the existing chain by attaching it to the inserted node.
      if (existingChildId) {
        if (inserted.type === NODE_TYPES.branch) {
          insertedUpdated = setOutgoingChildId(insertedUpdated, 'true', existingChildId);
        } else if (inserted.type !== NODE_TYPES.end) {
          insertedUpdated = setOutgoingChildId(insertedUpdated, null, existingChildId);
        }
      }

      const updatedParent = setOutgoingChildId(parent, slot, insertedUpdated.id);

      const nextNodes = {
        ...workflow.nodes,
        [updatedParent.id]: updatedParent,
        [insertedUpdated.id]: insertedUpdated
      };

      if (existingChildId) {
        const existingChild = nextNodes[existingChildId];
        if (existingChild) {
          nextNodes[existingChildId] = {
            ...existingChild,
            parentId: insertedUpdated.id
          };
        }
      }

      return {
        ...workflow,
        nodes: nextNodes
      };
    }

    case ACTIONS.UPDATE_NODE_LABEL: {
      const nodeId = action.payload?.nodeId;
      const label = String(action.payload?.label ?? '').trim();
      if (!nodeId) return workflow;

      const node = workflow.nodes[nodeId];
      if (!node) return workflow;

      return {
        ...workflow,
        nodes: {
          ...workflow.nodes,
          [nodeId]: {
            ...node,
            label: label.length ? label : node.label
          }
        }
      };
    }

    case ACTIONS.DELETE_NODE: {
      const nodeId = action.payload?.nodeId;
      if (!nodeId) return workflow;

      const node = workflow.nodes[nodeId];
      if (!node) return workflow;

      // START cannot be deleted.
      if (nodeId === workflow.rootId || node.type === NODE_TYPES.start) return workflow;
      if (!node.parentId) return workflow;

      const parent = workflow.nodes[node.parentId];
      if (!parent) return workflow;

      const parentSlot = findSlotForChild(parent, nodeId);

      // Choose which child to reconnect to keep the structure a tree.
      const preferredReconnectChildId = (() => {
        if (node.type === NODE_TYPES.branch) {
          return node.exits?.true || node.exits?.false || null;
        }
        return node.children[0] ?? null;
      })();

      const updatedParent = setOutgoingChildId(parent, parentSlot, preferredReconnectChildId);

      const nextNodes = {
        ...workflow.nodes,
        [updatedParent.id]: updatedParent
      };

      // Re-parent the reconnected child (if any).
      if (preferredReconnectChildId) {
        const child = nextNodes[preferredReconnectChildId];
        if (child) {
          nextNodes[preferredReconnectChildId] = {
            ...child,
            parentId: updatedParent.id
          };
        }
      }

      // Determine which subtrees become orphaned and must be removed.
      // For non-branch nodes, removing the node while reconnecting its single child keeps everything.
      // For branch nodes with both exits, we keep only the preferred path to preserve a tree.
      const orphanRoots = [];
      if (node.type === NODE_TYPES.branch) {
        const trueId = node.exits?.true ?? null;
        const falseId = node.exits?.false ?? null;

        if (preferredReconnectChildId === trueId && falseId) orphanRoots.push(falseId);
        if (preferredReconnectChildId === falseId && trueId) orphanRoots.push(trueId);
      }

      const idsToDelete = new Set([nodeId]);
      for (const orphanRootId of orphanRoots) {
        for (const id of collectSubtreeIds(workflow, orphanRootId)) {
          idsToDelete.add(id);
        }
      }

      // Delete node and any orphaned subtree nodes.
      for (const id of idsToDelete) {
        delete nextNodes[id];
      }

      return {
        ...workflow,
        nodes: nextNodes
      };
    }

    default:
      return workflow;
  }
}

/**
 * History reducer wrapper.
 *
 * @param {HistoryState} state
 * @param {any} action
 * @returns {HistoryState}
 */
export function workflowHistoryReducer(state, action) {
  switch (action.type) {
    case ACTIONS.UNDO: {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future]
      };
    }
    case ACTIONS.REDO: {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture
      };
    }

    case ACTIONS.ADD_NODE:
    case ACTIONS.DELETE_NODE:
    case ACTIONS.UPDATE_NODE_LABEL: {
      const nextPresent = workflowReducer(state.present, action);
      if (nextPresent === state.present) return state;
      return {
        past: [...state.past, state.present],
        present: nextPresent,
        future: []
      };
    }

    default:
      return state;
  }
}
