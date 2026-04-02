// ─── Entegrasyon Kategorisi ────────────────────────────────────────────────────
export type IntegrationCategory =
  | "communication"
  | "project-management"
  | "ai-ml"
  | "database"
  | "identity"
  | "trigger"
  | "utility";

export type AuthType =
  | "oauth2"
  | "api_key"
  | "bearer_token"
  | "basic_auth"
  | "none";

// ─── Credential Alanları ──────────────────────────────────────────────────────
export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "select";
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
}

// ─── Parametre Şeması ─────────────────────────────────────────────────────────
export interface ParameterSchema {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "json" | "select" | "multiselect" | "expression";
  required: boolean;
  default?: unknown;
  placeholder?: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  loadOptionsMethod?: string;
}

export interface OutputSchema {
  type: "object" | "array";
  properties: Record<string, { type: string; description: string }>;
}

// ─── Operasyon Tanımı ─────────────────────────────────────────────────────────
export interface OperationDefinition {
  id: string;
  name: string;
  description: string;
  resource?: string;
  action?: string;
  inputSchema: ParameterSchema[];
  outputSchema?: OutputSchema;
}

// ─── Trigger Tanımı ───────────────────────────────────────────────────────────
export interface TriggerDefinition {
  id: string;
  name: string;
  description: string;
  webhookSupport: boolean;
  pollInterval?: number;
  inputSchema: ParameterSchema[];
}

// ─── Entegrasyon Tanımı ───────────────────────────────────────────────────────
export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: IntegrationCategory;
  authType: AuthType;
  credentialFields: CredentialField[];
  operations: OperationDefinition[];
  triggers?: TriggerDefinition[];
}

// ─── Credential ───────────────────────────────────────────────────────────────
export interface CredentialSummary {
  id: string;
  name: string;
  integrationId: string;
  createdAt: string;
  updatedAt: string;
}
