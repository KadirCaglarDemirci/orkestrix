import { Handle, Position, type NodeProps } from "reactflow";
import { Play } from "lucide-react";
import { useWorkflowStore } from "../../stores/workflowStore";

const INTEGRATION_COLORS: Record<string, string> = {
  slack: "#4A154B",
  jira: "#0052CC",
  "microsoft-entra": "#0078D4",
  postgresql: "#336791",
  anthropic: "#D97757",
  webhook: "#6366F1",
};

export function ActionNode({ id, data, selected }: NodeProps) {
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const color = data.integrationId ? INTEGRATION_COLORS[data.integrationId] ?? "#4F6EF7" : "#4F6EF7";

  return (
    <div
      onClick={() => selectNode(id)}
      className={`min-w-[180px] rounded-xl border-2 cursor-pointer transition-all shadow-lg ${
        selected ? "border-brand-500 shadow-brand-500/30" : "border-gray-600 hover:border-gray-400"
      } bg-gray-900`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-900"
      />
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-xl border-b border-gray-700"
        style={{ backgroundColor: `${color}20` }}
      >
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <Play size={10} className="text-white" fill="white" />
        </div>
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
          {data.integrationId ?? "Action"}
        </span>
      </div>
      <div className="px-3 py-2.5">
        <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
        {data.operationId && (
          <div className="text-xs text-gray-500 mt-0.5 truncate">{data.operationId}</div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-900"
      />
    </div>
  );
}
