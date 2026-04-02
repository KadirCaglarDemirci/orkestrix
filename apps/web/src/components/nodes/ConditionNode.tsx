import { Handle, Position, type NodeProps } from "reactflow";
import { GitBranch } from "lucide-react";
import { useWorkflowStore } from "../../stores/workflowStore";

export function ConditionNode({ id, data, selected }: NodeProps) {
  const selectNode = useWorkflowStore((s) => s.selectNode);

  return (
    <div
      onClick={() => selectNode(id)}
      className={`min-w-[180px] rounded-xl border-2 cursor-pointer transition-all shadow-lg ${
        selected ? "border-brand-500 shadow-brand-500/30" : "border-yellow-500/60 hover:border-yellow-400"
      } bg-gray-900`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-gray-900"
      />
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 rounded-t-xl border-b border-yellow-500/30">
        <div className="w-6 h-6 rounded-md bg-yellow-500 flex items-center justify-center">
          <GitBranch size={12} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-yellow-300 uppercase tracking-wide">Condition</span>
      </div>
      <div className="px-3 py-2.5">
        <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      </div>
      {/* True/False handles */}
      <Handle
        id="true"
        type="source"
        position={Position.Bottom}
        style={{ left: "30%" }}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-gray-900"
      />
      <Handle
        id="false"
        type="source"
        position={Position.Bottom}
        style={{ left: "70%" }}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-gray-900"
      />
      <div className="flex justify-between px-4 pb-1 text-[10px] font-semibold">
        <span className="text-green-400">true</span>
        <span className="text-red-400">false</span>
      </div>
    </div>
  );
}
