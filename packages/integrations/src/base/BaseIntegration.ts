import type { IntegrationDefinition } from "@flowmatic/types";

export interface ExecuteContext {
  credentials: Record<string, string>;
  parameters: Record<string, unknown>;
  inputData?: unknown;
  executionId: string;
}

export abstract class BaseIntegration {
  abstract readonly definition: IntegrationDefinition;

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    return true;
  }

  abstract execute(operationId: string, context: ExecuteContext): Promise<unknown>;

  async loadOptions?(
    methodName: string,
    credentials: Record<string, string>
  ): Promise<Array<{ value: string; label: string }>>;

  protected async httpRequest(config: {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    params?: Record<string, string>;
  }): Promise<unknown> {
    const url = new URL(config.url);
    if (config.params) {
      Object.entries(config.params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const response = await fetch(url.toString(), {
      method: config.method,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      body: config.body ? JSON.stringify(config.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }
}
