const BASE_URL = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) return res.json();
  return res.text() as unknown as T;
}

// Auth
export const login = (email: string, password: string) =>
  request<{ token: string; user: any }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const register = (email: string, password: string, name: string) =>
  request<{ token: string; user: any }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });

// Workflows
export const getWorkflows = () => request<any[]>("/api/workflows");
export const getWorkflow = (id: string) => request<any>(`/api/workflows/${id}`);
export const createWorkflow = (data: any) =>
  request<any>("/api/workflows", { method: "POST", body: JSON.stringify(data) });
export const updateWorkflow = (id: string, data: any) =>
  request<any>(`/api/workflows/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteWorkflow = (id: string) =>
  request<void>(`/api/workflows/${id}`, { method: "DELETE" });
export const saveWorkflowGraph = (id: string, nodes: any[], edges: any[]) =>
  request<any>(`/api/workflows/${id}/graph`, {
    method: "PUT",
    body: JSON.stringify({ nodes, edges }),
  });
export const executeWorkflow = (id: string, inputData?: any) =>
  request<any>(`/api/workflows/${id}/execute`, {
    method: "POST",
    body: JSON.stringify({ inputData }),
  });

// Executions
export const getExecutions = (workflowId: string) =>
  request<any[]>(`/api/workflows/${workflowId}/executions`);
export const getExecutionLogs = (executionId: string) =>
  request<any[]>(`/api/executions/${executionId}/logs`);

// Credentials
export const getCredentials = () => request<any[]>("/api/credentials");
export const createCredential = (data: any) =>
  request<any>("/api/credentials", { method: "POST", body: JSON.stringify(data) });
export const deleteCredential = (id: string) =>
  request<void>(`/api/credentials/${id}`, { method: "DELETE" });
export const testCredential = (id: string) =>
  request<any>(`/api/credentials/${id}/test`, { method: "POST" });

// Stats
export const getWorkflowStats = () => request<any>("/api/workflows/stats");

// Import/Export
export const importWorkflow = (data: any) =>
  request<any>("/api/workflows/import", { method: "POST", body: JSON.stringify(data) });
export const getWorkflowGraph = (id: string) =>
  request<any>(`/api/workflows/${id}/graph`);

// Integrations
export const getIntegrations = () => request<any[]>("/api/integrations");
