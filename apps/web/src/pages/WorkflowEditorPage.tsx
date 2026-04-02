import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Play, ChevronLeft, History, Settings } from "lucide-react";
import { WorkflowEditor } from "../components/editor/WorkflowEditor";
import { NodeToolbar } from "../components/editor/NodeToolbar";
import { NodeConfigPanel } from "../components/panels/NodeConfigPanel";
import { ExecutionPanel } from "../components/panels/ExecutionPanel";
import { useWorkflowStore } from "../stores/workflowStore";
import { useWorkflowSave } from "../hooks/useWorkflowSave";
import { getWorkflow, executeWorkflow } from "../services/api";

export function WorkflowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rightPanel, setRightPanel] = useState<"config" | "executions">("config");

  const { setWorkflow, loadGraph, workflowName, setWorkflowName, isDirty, isSaving, selectedNodeId } =
    useWorkflowStore();

  const { save } = useWorkflowSave();

  const { data: workflow } = useQuery({
    queryKey: ["workflow", id],
    queryFn: () => getWorkflow(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (workflow) {
      setWorkflow(workflow.id, workflow.name, workflow.active);
      const nodes = (workflow.nodes ?? []).map((n: any) => ({
        id: n.id,
        type: (n.type as string).toLowerCase().replace("_", "-"),
        position: n.position ?? { x: 100, y: 100 },
        data: n.data ?? { label: n.name, nodeType: n.type },
      }));
      const edges = (workflow.edges ?? []).map((e: any) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        sourceHandle: e.sourceHandle,
        animated: true,
        style: { stroke: "#4F6EF7", strokeWidth: 2 },
      }));
      loadGraph(nodes, edges);
    }
  }, [workflow]);

  const executeMutation = useMutation({
    mutationFn: () => executeWorkflow(id!),
    onSuccess: () => {
      setRightPanel("executions");
      qc.invalidateQueries({ queryKey: ["executions", id] });
    },
  });

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 bg-gray-900 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          className="bg-transparent text-sm font-semibold text-gray-100 focus:outline-none border-b border-transparent focus:border-gray-600 px-1 py-0.5 min-w-0 w-48"
        />

        {isDirty && <span className="text-xs text-gray-500 italic">kaydedilmemiş</span>}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setRightPanel(rightPanel === "executions" ? "config" : "executions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              rightPanel === "executions"
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            <History size={13} />
            Geçmiş
          </button>

          <button
            onClick={save}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-200 hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            <Save size={13} />
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </button>

          <button
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50 transition-colors"
          >
            <Play size={13} fill="white" />
            {executeMutation.isPending ? "Çalışıyor..." : "Çalıştır"}
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        <NodeToolbar />

        <div className="flex-1 relative">
          <WorkflowEditor />
        </div>

        {rightPanel === "config" && selectedNodeId ? (
          <NodeConfigPanel />
        ) : rightPanel === "executions" && id ? (
          <div className="w-80 bg-gray-900 border-l border-gray-800 overflow-y-auto">
            <ExecutionPanel workflowId={id} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
