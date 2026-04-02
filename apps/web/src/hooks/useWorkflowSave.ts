import { useCallback } from "react";
import { useWorkflowStore } from "../stores/workflowStore";
import { saveWorkflowGraph, updateWorkflow } from "../services/api";

export function useWorkflowSave() {
  const { workflowId, workflowName, nodes, edges, setIsSaving, markClean } = useWorkflowStore();

  const save = useCallback(async () => {
    if (!workflowId) return;
    setIsSaving(true);
    try {
      await updateWorkflow(workflowId, { name: workflowName });
      await saveWorkflowGraph(workflowId, nodes, edges);
      markClean();
    } finally {
      setIsSaving(false);
    }
  }, [workflowId, workflowName, nodes, edges, setIsSaving, markClean]);

  return { save };
}
