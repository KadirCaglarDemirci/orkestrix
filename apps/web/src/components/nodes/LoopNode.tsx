import { Handle, Position, type NodeProps } from "reactflow";
import { Repeat } from "lucide-react";
import { useWorkflowStore } from "../../stores/workflowStore";

export function LoopNode({ id, data, selected }: NodeProps) {
  const selectNode = useWorkflowStore((s) => s.selectNode);

  return (
    <div
      onClick={() => selectNode(id)}
      className={`min-w-[180px] rounded-xl border-2 cursor-pointer transition-all shadow-lg ${
        selected
          ? "border-brand-500 shadow-brand-500/30"
          : "border-cyan-500/60 hover:border-cyan-400"
      } bg-gray-900`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-gray-900"
      />

      <div className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 rounded-t-xl border-b border-cyan-500/30">
        <div className="w-6 h-6 rounded-md bg-cyan-500 flex items-center justify-center">
          <Repeat size={12} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">Loop</span>
      </div>

      <div className="px-3 py-2.5">
        <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {data.parameters?.arrayField
            ? `{{ ${data.parameters.arrayField} }}`
            : "Dizi alanı seçilmedi"}
        </div>
      </div>

      {/* Loop body çıkışı */}
      <Handle
        id="loop"
        type="source"
        position={Position.Right}
        style={{ top: "40%" }}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-gray-900"
      />
      <div className="absolute right-4 text-[9px] text-cyan-600" style={{ top: "36%" }}>her eleman→</div>

      {/* Done çıkışı */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-gray-900"
      />
    </div>
  );
}
