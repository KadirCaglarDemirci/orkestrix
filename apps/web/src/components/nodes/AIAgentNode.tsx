import { Handle, Position, type NodeProps } from "reactflow";
import { Bot, ChevronDown, ChevronUp, Brain, Database, Wrench } from "lucide-react";
import { useState } from "react";
import { useWorkflowStore } from "../../stores/workflowStore";

export function AIAgentNode({ id, data, selected }: NodeProps) {
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const nodes = useWorkflowStore((s) => s.nodes);
  const [expanded, setExpanded] = useState(true);

  // Bu agent'a bağlı sub-node'ları bul (parentNodeId === id)
  const subNodes = nodes.filter((n: any) => n.data?.parentNodeId === id);
  const modelNode = subNodes.find((n: any) => n.data?.type === "AI_MODEL" || n.type === "ai_model");
  const memoryNode = subNodes.find((n: any) => n.data?.type === "AI_MEMORY" || n.type === "ai_memory");
  const toolNodes = subNodes.filter((n: any) => n.data?.type === "AI_TOOL" || n.type === "ai_tool");

  return (
    <div
      onClick={() => selectNode(id)}
      className={`min-w-[220px] rounded-xl border-2 cursor-pointer transition-all shadow-lg ${
        selected ? "border-brand-500 shadow-brand-500/30" : "border-purple-500/60 hover:border-purple-400"
      } bg-gray-900`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-gray-900"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-t-xl border-b border-purple-500/30">
        <div className="w-6 h-6 rounded-md bg-purple-500 flex items-center justify-center">
          <Bot size={12} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide flex-1">AI Agent</span>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="text-gray-500 hover:text-gray-300"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Label */}
      <div className="px-3 py-2">
        <div className="text-sm font-medium text-gray-100 truncate">{data.label}</div>
      </div>

      {/* Expanded: sub-node slots */}
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-gray-800 pt-2">
          {/* Model */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center shrink-0">
              <Brain size={9} className="text-blue-400" />
            </div>
            <span className="text-[10px] text-gray-500 flex-1">Model</span>
            {modelNode ? (
              <span className="text-[10px] text-blue-400 font-medium truncate max-w-[80px]">
                {modelNode.data?.label ?? "Bağlı"}
              </span>
            ) : (
              <span className="text-[10px] text-gray-700">bağlanmadı</span>
            )}
            <Handle
              id="model"
              type="target"
              position={Position.Left}
              style={{ top: "auto", position: "relative", transform: "none", left: "auto" }}
              className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-gray-900 !relative !inset-auto"
            />
          </div>

          {/* Memory */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-teal-500/20 flex items-center justify-center shrink-0">
              <Database size={9} className="text-teal-400" />
            </div>
            <span className="text-[10px] text-gray-500 flex-1">Memory</span>
            {memoryNode ? (
              <span className="text-[10px] text-teal-400 font-medium truncate max-w-[80px]">
                {memoryNode.data?.label ?? "Bağlı"}
              </span>
            ) : (
              <span className="text-[10px] text-gray-700">bağlanmadı</span>
            )}
            <Handle
              id="memory"
              type="target"
              position={Position.Left}
              style={{ top: "auto", position: "relative", transform: "none", left: "auto" }}
              className="!w-2.5 !h-2.5 !bg-teal-400 !border-2 !border-gray-900 !relative !inset-auto"
            />
          </div>

          {/* Tools */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-orange-500/20 flex items-center justify-center shrink-0">
              <Wrench size={9} className="text-orange-400" />
            </div>
            <span className="text-[10px] text-gray-500 flex-1">Tools</span>
            {toolNodes.length > 0 ? (
              <span className="text-[10px] text-orange-400 font-medium">
                {toolNodes.length} araç
              </span>
            ) : (
              <span className="text-[10px] text-gray-700">bağlanmadı</span>
            )}
            <Handle
              id="tools"
              type="target"
              position={Position.Left}
              style={{ top: "auto", position: "relative", transform: "none", left: "auto" }}
              className="!w-2.5 !h-2.5 !bg-orange-400 !border-2 !border-gray-900 !relative !inset-auto"
            />
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-gray-900"
      />
    </div>
  );
}
