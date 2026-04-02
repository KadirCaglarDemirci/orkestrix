import { Handle, Position, type NodeProps } from "reactflow";
import { Zap } from "lucide-react";
import { useWorkflowStore } from "../../stores/workflowStore";

const TRIGGER_LABELS: Record<string, string> = {
  WEBHOOK: "Webhook",
  SCHEDULE: "Schedule",
  FORM_SUBMISSION: "Form Submit",
  MANUAL: "Manual Trigger",
};

export function TriggerNode({ id, data, selected }: NodeProps) {
  const selectNode = useWorkflowStore((s) => s.selectNode);

  return (
    <div
      onClick={() => selectNode(id)}
      className={`min-w-[180px] rounded-xl border-2 cursor-pointer transition-all shadow-lg ${
        selected
          ? "border-brand-500 shadow-brand-500/30"
          : "border-orange-500/60 hover:border-orange-400"
      } bg-gray-900`}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 rounded-t-xl border-b border-orange-500/30">
        <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center">
          <Zap size={12} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-orange-300 uppercase tracking-wide">Trigger</span>
      </div>
      <div className="px-3 py-2.5">
        <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
        {data.triggerType && (
          <div className="text-xs text-gray-500 mt-0.5">
            {TRIGGER_LABELS[data.triggerType] ?? data.triggerType}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-gray-900"
      />
    </div>
  );
}
