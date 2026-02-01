import { useMemo, useReducer } from 'react';
import { ACTIONS } from './workflowActions.js';
import { createInitialHistoryState, workflowHistoryReducer } from './workflowReducer.js';

export function useWorkflowState() {
  const [state, dispatch] = useReducer(workflowHistoryReducer, undefined, createInitialHistoryState);

  const api = useMemo(() => {
    return {
      workflow: state.present,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      dispatch,
      undo: () => dispatch({ type: ACTIONS.UNDO }),
      redo: () => dispatch({ type: ACTIONS.REDO })
    };
  }, [state.present, state.past.length, state.future.length]);

  return api;
}
