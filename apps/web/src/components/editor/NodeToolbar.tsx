import { Zap, Play, GitBranch, Bot, Repeat } from "lucide-react";
import { useWorkflowStore } from "../../stores/workflowStore";
import type { FlowNode } from "../../stores/workflowStore";

const nodeTemplates = [
  {
    type: "TRIGGER" as const,
    label: "Trigger",
    icon: Zap,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/40",
    defaultData: { label: "Trigger", nodeType: "TRIGGER" as const, triggerType: "MANUAL" },
  },
  {
    type: "ACTION" as const,
    label: "Action",
    icon: Play,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/40",
    defaultData: { label: "Action", nodeType: "ACTION" as const },
  },
  {
    type: "CONDITION" as const,
    label: "Condition",
    icon: GitBranch,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/40",
    defaultData: { label: "Condition", nodeType: "CONDITION" as const },
  },
  {
    type: "AI_AGENT" as const,
    label: "AI Agent",
    icon: Bot,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/40",
    defaultData: { label: "AI Agent", nodeType: "AI_AGENT" as const },
  },
  {
    type: "LOOP" as const,
    label: "Loop",
    icon: Repeat,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/40",
    defaultData: { label: "Loop", nodeType: "LOOP" as const, parameters: {} },
  },
];

export function NodeToolbar() {
  const addNode = useWorkflowStore((s) => s.addNode);

  const handleAdd = (template: (typeof nodeTemplates)[number]) => {
    const id = `node-${Date.now()}`;
    const node: FlowNode = {
      id,
      type: template.type.toLowerCase().replace("_", "-"),
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 100 },
      data: { ...template.defaultData },
    };
    addNode(node);
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-900 border-r border-gray-800 w-48">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-1">
        Düğümler
      </div>
      {nodeTemplates.map((t) => (
        <button
          key={t.type}
          onClick={() => handleAdd(t)}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${t.bg}`}
        >
          <t.icon size={15} className={t.color} />
          <span className="text-sm font-medium text-gray-200">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
