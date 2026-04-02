import { useCallback } from "react";
import { useWorkflowStore } from "../stores/workflowStore";
import { saveWorkflowGraph, updateWorkflow } from "../services/api";
import type { FlowNode } from "../stores/workflowStore";
import type { Edge } from "reactflow";

function serializeNodes(nodes: FlowNode[]) {
  return nodes.map((n) => ({
    rfId: n.id,
    type: n.data.nodeType,
    integrationId: n.data.integrationId,
    operationId: n.data.operationId,
    label: n.data.label,
    positionX: n.position.x,
    positionY: n.position.y,
    config: {
      credentialId: n.data.credentialId,
      parameters: n.data.parameters ?? {},
      ...(n.data.triggerType ? { triggerType: n.data.triggerType } : {}),
      ...(n.data.webhookPath ? { webhookPath: n.data.webhookPath } : {}),
    },
  }));
}

function serializeEdges(edges: Edge[]) {
  return edges.map((e) => ({
    rfId: e.id,
    sourceNodeRfId: e.source,
    sourceHandle: e.sourceHandle ?? undefined,
    targetNodeRfId: e.target,
    targetHandle: e.targetHandle ?? undefined,
    label: typeof e.label === "string" ? e.label : undefined,
  }));
}

export function useWorkflowSave() {
  const { workflowId, workflowName, nodes, edges, setIsSaving, markClean } = useWorkflowStore();

  const save = useCallback(async () => {
    if (!workflowId) return;
    setIsSaving(true);
    try {
      await updateWorkflow(workflowId, { name: workflowName });
      await saveWorkflowGraph(workflowId, serializeNodes(nodes), serializeEdges(edges));
      markClean();
    } finally {
      setIsSaving(false);
    }
  }, [workflowId, workflowName, nodes, edges, setIsSaving, markClean]);

  return { save };
}
