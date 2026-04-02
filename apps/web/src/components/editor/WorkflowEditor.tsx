import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowStore } from "../../stores/workflowStore";
import { TriggerNode } from "../nodes/TriggerNode";
import { ActionNode } from "../nodes/ActionNode";
import { ConditionNode } from "../nodes/ConditionNode";
import { AIAgentNode } from "../nodes/AIAgentNode";
import { LoopNode } from "../nodes/LoopNode";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  "ai-agent": AIAgentNode,
  ai_agent: AIAgentNode,
  loop: LoopNode,
  LOOP: LoopNode,
};

export function WorkflowEditor() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, selectNode } =
    useWorkflowStore();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onPaneClick={() => selectNode(null)}
      nodeTypes={nodeTypes}
      fitView
      deleteKeyCode="Delete"
      className="bg-gray-950"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="#374151"
      />
      <Controls />
      <MiniMap
        nodeColor={(n) => {
          switch (n.data?.nodeType) {
            case "TRIGGER": return "#f97316";
            case "CONDITION": return "#eab308";
            case "AI_AGENT": return "#a855f7";
            default: return "#4F6EF7";
          }
        }}
        maskColor="rgba(3,7,18,0.7)"
      />
    </ReactFlow>
  );
}
