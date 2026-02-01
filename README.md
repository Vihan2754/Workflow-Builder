# Workflow Builder UI

A production-style React (JavaScript) single-page app demonstrating a **tree-based workflow editor** (visual workflow builder).

Constraints respected:
- React functional components + Hooks
- JavaScript
- No UI libraries
- No diagramming libraries
- No animation libraries (CSS transitions only)

## Goal
Build workflows as a vertical/tree structure of nodes connected by SVG lines. Nodes can be inserted after any existing node, branch into True/False paths, deleted with auto-reconnect, edited inline, and exported as JSON.

## Features
- **Normalized workflow state** (`nodes` map + `rootId`)
- **Node types**: Start (locked), Action (1 child), Branch (True/False exits), End (no children)
- **Interactions**: add node from a connection point, inline label edit, delete with reconnect
- **Undo/Redo** with history stacks
- **Save** logs workflow JSON to the browser console

## Data model (normalized)
Workflow shape:
```js
{
	nodes: {
		[id]: {
			id,
			type: 'start' | 'action' | 'branch' | 'end',
			label,
			parentId,
			children: [childId, ...],
			exits: { true: childId|null, false: childId|null } // branch only
		}
	},
	rootId
}
```

Branch nodes support labeled exits (`true` / `false`) and the reducer keeps `children` in sync.

## State management
The editor uses `useReducer` + a history wrapper.

Supported actions:
- `ADD_NODE` (inserts between parent and existing child)
- `DELETE_NODE` (removes node; reconnects parent to a chosen child; prunes orphaned branch subtree)
- `UPDATE_NODE_LABEL`
- `UNDO`, `REDO`

## Project structure
- `src/domain/` — workflow model helpers (IDs, node creation, branch exits)
- `src/state/` — reducer + history (`UNDO/REDO`) + state hook
- `src/components/workflow/` — `WorkflowCanvas`, `Node`, `NodeMenu`, `ConnectionLine`, `Controls`
- `src/utils/hooks/` — small hooks used by the canvas
- `src/styles/` — global styles

## Run

```bash
npm install
npm run dev
```

Production build:
```bash
npm run build
```

## What to try
- Click `+ Add` on a node to open the menu and insert nodes
- Double click a node title to edit its label
- Delete a node to auto-reconnect the tree
- Save logs the workflow JSON to the browser console
- Undo/Redo: buttons, `Ctrl+Z` / `Ctrl+Y` (or `Cmd+Z` on macOS)
