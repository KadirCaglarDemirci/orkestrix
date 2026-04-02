import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class WebhookIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "webhook",
    name: "Webhook",
    description: "HTTP webhook trigger ve HTTP istek gönderme",
    icon: "webhook",
    color: "#6366F1",
    category: "core",
    authType: "none",
    credentialFields: [],
    operations: [
      {
        id: "trigger",
        name: "Webhook Trigger",
        description: "Gelen HTTP isteğini tetikleyici olarak kullan",
        resource: "webhook",
        action: "receive",
        inputSchema: [
          { key: "path", label: "Webhook Path", type: "string", required: true, placeholder: "my-webhook" },
          {
            key: "method",
            label: "HTTP Method",
            type: "select",
            required: true,
            options: [
              { value: "POST", label: "POST" },
              { value: "GET", label: "GET" },
              { value: "PUT", label: "PUT" },
            ],
          },
          { key: "respondImmediately", label: "Respond Immediately", type: "boolean", required: false },
        ],
        outputSchema: {
          type: "object",
          properties: {
            body: { type: "object" },
            headers: { type: "object" },
            query: { type: "object" },
          },
        },
      },
      {
        id: "httpRequest",
        name: "HTTP Request",
        description: "Dış URL'ye HTTP isteği gönder",
        resource: "http",
        action: "request",
        inputSchema: [
          { key: "url", label: "URL", type: "string", required: true },
          {
            key: "method",
            label: "Method",
            type: "select",
            required: true,
            options: [
              { value: "GET", label: "GET" },
              { value: "POST", label: "POST" },
              { value: "PUT", label: "PUT" },
              { value: "DELETE", label: "DELETE" },
              { value: "PATCH", label: "PATCH" },
            ],
          },
          { key: "headers", label: "Headers (JSON)", type: "json", required: false },
          { key: "body", label: "Body (JSON)", type: "json", required: false },
          { key: "queryParams", label: "Query Params (JSON)", type: "json", required: false },
        ],
        outputSchema: {
          type: "object",
          properties: {
            statusCode: { type: "number" },
            body: { type: "object" },
            headers: { type: "object" },
          },
        },
      },
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    const { parameters } = context;

    if (operationId === "trigger") {
      // Trigger node'u inputData'yı doğrudan geçirir; bu execute çağrılmaz
      return context.inputData;
    }

    if (operationId === "httpRequest") {
      const url = new URL(String(parameters.url));
      if (parameters.queryParams && typeof parameters.queryParams === "object") {
        Object.entries(parameters.queryParams as Record<string, string>).forEach(([k, v]) =>
          url.searchParams.set(k, v)
        );
      }

      const response = await fetch(url.toString(), {
        method: String(parameters.method ?? "GET"),
        headers: {
          "Content-Type": "application/json",
          ...(parameters.headers as Record<string, string> ?? {}),
        },
        body:
          parameters.method !== "GET" && parameters.body
            ? JSON.stringify(parameters.body)
            : undefined,
      });

      const contentType = response.headers.get("content-type");
      const body = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();

      return { statusCode: response.status, body, headers: Object.fromEntries(response.headers) };
    }

    throw new Error(`Webhook: bilinmeyen operasyon '${operationId}'`);
  }
}
