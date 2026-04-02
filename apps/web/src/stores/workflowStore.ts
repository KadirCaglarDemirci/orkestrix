import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "reactflow";

export interface FlowNode extends Node {
  data: {
    label: string;
    nodeType: "TRIGGER" | "ACTION" | "CONDITION" | "AI_AGENT" | "AI_MODEL" | "AI_MEMORY" | "AI_TOOL";
    integrationId?: string;
    operationId?: string;
    parameters?: Record<string, unknown>;
    credentialId?: string;
    triggerType?: string;
    // AI Agent specific
    modelNodeId?: string;
    memoryNodeId?: string;
    toolNodeIds?: string[];
  };
}

interface WorkflowStore {
  // Current workflow metadata
  workflowId: string | null;
  workflowName: string;
  workflowActive: boolean;

  // ReactFlow state
  nodes: FlowNode[];
  edges: Edge[];

  // UI state
  selectedNodeId: string | null;
  isDirty: boolean;
  isSaving: boolean;

  // Actions
  setWorkflow: (id: string, name: string, active: boolean) => void;
  setWorkflowName: (name: string) => void;
  loadGraph: (nodes: FlowNode[], edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: FlowNode) => void;
  updateNodeData: (nodeId: string, data: Partial<FlowNode["data"]>) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  setIsSaving: (v: boolean) => void;
  markClean: () => void;
  reset: () => void;
}

const initialState = {
  workflowId: null,
  workflowName: "Yeni Workflow",
  workflowActive: false,
  nodes: [] as FlowNode[],
  edges: [] as Edge[],
  selectedNodeId: null,
  isDirty: false,
  isSaving: false,
};

export const useWorkflowStore = create<WorkflowStore>()(
  immer((set) => ({
    ...initialState,

    setWorkflow: (id, name, active) =>
      set((s) => {
        s.workflowId = id;
        s.workflowName = name;
        s.workflowActive = active;
      }),

    setWorkflowName: (name) =>
      set((s) => {
        s.workflowName = name;
        s.isDirty = true;
      }),

    loadGraph: (nodes, edges) =>
      set((s) => {
        s.nodes = nodes as any;
        s.edges = edges;
        s.isDirty = false;
      }),

    onNodesChange: (changes) =>
      set((s) => {
        s.nodes = applyNodeChanges(changes, s.nodes as Node[]) as FlowNode[];
        if (changes.some((c) => c.type !== "select" && c.type !== "dimensions")) {
          s.isDirty = true;
        }
      }),

    onEdgesChange: (changes) =>
      set((s) => {
        s.edges = applyEdgeChanges(changes, s.edges);
        s.isDirty = true;
      }),

    onConnect: (connection) =>
      set((s) => {
        s.edges = addEdge(
          {
            ...connection,
            id: `e-${connection.source}-${connection.target}-${Date.now()}`,
            animated: true,
            style: { stroke: "#4F6EF7", strokeWidth: 2 },
            label: connection.sourceHandle === "true" ? "true" : connection.sourceHandle === "false" ? "false" : undefined,
            labelStyle: { fill: "#fff", fontWeight: 600, fontSize: 11 },
            labelBgStyle: { fill: connection.sourceHandle === "true" ? "#22c55e" : connection.sourceHandle === "false" ? "#ef4444" : "#4F6EF7", rx: 4, ry: 4 },
          },
          s.edges
        );
        s.isDirty = true;
      }),

    addNode: (node) =>
      set((s) => {
        s.nodes.push(node as any);
        s.isDirty = true;
      }),

    updateNodeData: (nodeId, data) =>
      set((s) => {
        const node = s.nodes.find((n) => n.id === nodeId);
        if (node) {
          Object.assign(node.data, data);
          s.isDirty = true;
        }
      }),

    deleteNode: (nodeId) =>
      set((s) => {
        s.nodes = s.nodes.filter((n) => n.id !== nodeId);
        s.edges = s.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        );
        if (s.selectedNodeId === nodeId) s.selectedNodeId = null;
        s.isDirty = true;
      }),

    selectNode: (nodeId) =>
      set((s) => {
        s.selectedNodeId = nodeId;
      }),

    setIsSaving: (v) =>
      set((s) => {
        s.isSaving = v;
      }),

    markClean: () =>
      set((s) => {
        s.isDirty = false;
      }),

    reset: () => set(() => ({ ...initialState })),
  }))
);
