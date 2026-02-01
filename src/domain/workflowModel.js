/**
 * Domain model for a tree-based workflow.
 *
 * The workflow is stored in a normalized form:
 * {
 *   nodes: { [id]: Node },
 *   rootId: string
 * }
 *
 * Each Node always has a `children` array.
 * Branch nodes additionally have an `exits` map with labeled edges.
 */

export const NODE_TYPES = /** @type {const} */ ({
  start: 'start',
  action: 'action',
  branch: 'branch',
  end: 'end'
});

export const BRANCH_EXIT_KEYS = /** @type {const} */ (['true', 'false']);

/**
 * @typedef {'start' | 'action' | 'branch' | 'end'} NodeType
 */

/**
 * Branch exits are labeled edges. Keys are strings: 'true' and 'false'.
 *
 * @typedef {{ true?: string|null, false?: string|null }} BranchExits
 */

/**
 * @typedef {Object} Node
 * @property {string} id
 * @property {NodeType} type
 * @property {string} label
 * @property {string|null} parentId
 * @property {string[]} children - Always maintained for all nodes.
 * @property {BranchExits=} exits - Only for type==='branch'.
 */

/**
 * @typedef {Object} Workflow
 * @property {{[id: string]: Node}} nodes
 * @property {string} rootId
 */

/**
 * @returns {string}
 */
export function createId() {
  // Prefer cryptographically strong IDs when available.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * @param {NodeType} type
 * @returns {boolean}
 */
export function isBranchType(type) {
  return type === NODE_TYPES.branch;
}

/**
 * @param {Node} node
 * @returns {node is Node & { exits: BranchExits }}
 */
export function isBranchNode(node) {
  return node.type === NODE_TYPES.branch;
}

/**
 * Keep `children` in sync with `exits` for branch nodes.
 *
 * @param {Node} node
 * @returns {Node}
 */
export function normalizeNode(node) {
  if (node.type !== NODE_TYPES.branch) {
    return {
      ...node,
      children: Array.isArray(node.children) ? node.children.slice(0, 1) : []
    };
  }

  const exits = {
    true: node.exits?.true ?? null,
    false: node.exits?.false ?? null
  };

  const children = BRANCH_EXIT_KEYS.map((k) => exits[k]).filter(Boolean);

  return {
    ...node,
    exits,
    children
  };
}

/**
 * Create a new node with safe defaults. Caller should attach it via reducer operations.
 *
 * @param {{type: NodeType, parentId: string|null, label?: string}} params
 * @returns {Node}
 */
export function createNode({ type, parentId, label }) {
  /** @type {Node} */
  const base = {
    id: createId(),
    type,
    label: label ?? defaultLabelForType(type),
    parentId,
    children: []
  };

  if (type === NODE_TYPES.branch) {
    base.exits = { true: null, false: null };
  }

  return normalizeNode(base);
}

/**
 * @param {NodeType} type
 */
export function defaultLabelForType(type) {
  switch (type) {
    case NODE_TYPES.start:
      return 'Start';
    case NODE_TYPES.action:
      return 'Action';
    case NODE_TYPES.branch:
      return 'Branch';
    case NODE_TYPES.end:
      return 'End';
    default:
      return 'Node';
  }
}

/**
 * @returns {Workflow}
 */
export function createInitialWorkflow() {
  const start = createNode({ type: NODE_TYPES.start, parentId: null, label: 'Start' });

  return {
    nodes: {
      [start.id]: start
    },
    rootId: start.id
  };
}

/**
 * For non-branch nodes, the child connection slot is always `null`.
 * For branch nodes, the slot is 'true' | 'false'.
 *
 * @typedef {null | 'true' | 'false'} ConnectionSlot
 */

/**
 * Read the outgoing child id for a given slot.
 *
 * @param {Node} node
 * @param {ConnectionSlot} slot
 * @returns {string|null}
 */
export function getOutgoingChildId(node, slot) {
  if (node.type !== NODE_TYPES.branch) {
    return node.children[0] ?? null;
  }
  const key = slot ?? 'true';
  return node.exits?.[key] ?? null;
}

/**
 * Set the outgoing child id for a given slot.
 *
 * @param {Node} node
 * @param {ConnectionSlot} slot
 * @param {string|null} childId
 * @returns {Node}
 */
export function setOutgoingChildId(node, slot, childId) {
  if (node.type !== NODE_TYPES.branch) {
    return normalizeNode({
      ...node,
      children: childId ? [childId] : []
    });
  }

  const key = slot ?? 'true';
  return normalizeNode({
    ...node,
    exits: {
      true: node.exits?.true ?? null,
      false: node.exits?.false ?? null,
      [key]: childId
    }
  });
}

/**
 * @param {Node} node
 * @returns {ConnectionSlot[]}
 */
export function getAvailableSlots(node) {
  if (node.type === NODE_TYPES.branch) {
    return /** @type {ConnectionSlot[]} */ (BRANCH_EXIT_KEYS.slice());
  }

  if (node.type === NODE_TYPES.end) return [];

  return [null];
}
