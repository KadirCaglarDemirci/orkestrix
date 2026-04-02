// ─── Node Tipleri ─────────────────────────────────────────────────────────────
export type NodeType =
  | "TRIGGER"
  | "ACTION"
  | "CONDITION"
  | "AI_AGENT"
  | "AI_MODEL"
  | "AI_MEMORY"
  | "AI_TOOL"
  | "LOOP";

export type TriggerType =
  | "WEBHOOK"
  | "SCHEDULE"
  | "FORM_SUBMISSION"
  | "MANUAL"
  | "EMAIL"
  | "POLLING";

export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED"
  | "WAITING";

export type ExecutionMode = "MANUAL" | "TRIGGER" | "RETRY" | "TEST";

// ─── Node Konfigürasyon ────────────────────────────────────────────────────────
export interface NodeConfig {
  credentialId?: string;
  parameters: Record<string, unknown>;
  retryOnFail?: boolean;
  maxRetries?: number;
  continueOnFail?: boolean;
  notes?: string;
  // AI Agent için
  systemPrompt?: string;
  temperature?: number;
}

// ─── ReactFlow ile uyumlu node verisi ─────────────────────────────────────────
export interface WorkflowNodeData {
  id: string;
  rfId: string;
  type: NodeType;
  integrationId?: string;
  operation?: string;
  label: string;
  config: NodeConfig;
  parentNodeId?: string;
  // Görsel
  color?: string;
  icon?: string;
}

// ─── Edge (bağlantı) ──────────────────────────────────────────────────────────
export interface WorkflowEdgeData {
  id: string;
  rfId: string;
  sourceNodeRfId: string;
  sourceHandle?: string;
  targetNodeRfId: string;
  targetHandle?: string;
  label?: string;
}

// ─── Workflow ─────────────────────────────────────────────────────────────────
export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  nodeCount: number;
  lastExecutionAt?: string;
  lastExecutionStatus?: ExecutionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
}

// ─── Execution ────────────────────────────────────────────────────────────────
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  inputData: Record<string, unknown>;
  nodeOutputs: Map<string, NodeOutput>;        // rfId → output
  nodeOutputsByLabel?: Map<string, NodeOutput>; // label → output (expression resolver için)
  userId?: string;
}

export interface NodeOutput {
  nodeId: string;
  status: "success" | "failed" | "skipped";
  data: unknown;
  error?: string;
  durationMs: number;
}

export interface ExecutionSummary {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  mode: ExecutionMode;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
  errorMessage?: string;
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  nodeId: string;
  nodeLabel?: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  inputData?: unknown;
  outputData?: unknown;
  errorMessage?: string;
  duration?: number;
  createdAt: string;
}
