import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class AnthropicIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "anthropic",
    name: "Anthropic",
    description: "Anthropic Claude AI modelleri ile konuşma ve metin üretimi",
    icon: "bot",
    color: "#D97757",
    category: "ai",
    authType: "api_key",
    credentialFields: [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        required: true,
        placeholder: "sk-ant-...",
        helpText: "Anthropic Console'dan API key alın",
      },
    ],
    operations: [
      {
        id: "chat",
        name: "Chat",
        description: "Claude ile mesajlaşma",
        resource: "messages",
        action: "create",
        inputSchema: [
          {
            key: "model",
            label: "Model",
            type: "select",
            required: true,
            options: [
              { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
              { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
              { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
            ],
          },
          { key: "systemPrompt", label: "System Prompt", type: "string", required: false },
          { key: "userMessage", label: "User Message", type: "string", required: true },
          { key: "maxTokens", label: "Max Tokens", type: "number", required: false, placeholder: "1024" },
        ],
        outputSchema: {
          type: "object",
          properties: {
            content: { type: "string" },
            inputTokens: { type: "number" },
            outputTokens: { type: "number" },
          },
        },
      },
      {
        id: "agentChat",
        name: "Agent Chat (Tools)",
        description: "AI Agent olarak araçlar ile konuşma — WorkflowExecutor tarafından yönetilir",
        resource: "messages",
        action: "createWithTools",
        inputSchema: [
          {
            key: "model",
            label: "Model",
            type: "select",
            required: true,
            options: [
              { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
              { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
            ],
          },
          { key: "systemPrompt", label: "System Prompt", type: "string", required: false },
          { key: "userMessage", label: "User Message / Task", type: "string", required: true },
          { key: "maxIterations", label: "Max Iterations", type: "number", required: false, placeholder: "10" },
        ],
      },
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    const { credentials, parameters } = context;

    if (operationId === "chat") {
      const messages: any[] = [];
      if (parameters.userMessage) {
        messages.push({ role: "user", content: String(parameters.userMessage) });
      }

      const body: Record<string, unknown> = {
        model: parameters.model ?? "claude-sonnet-4-6",
        max_tokens: parameters.maxTokens ?? 1024,
        messages,
      };
      if (parameters.systemPrompt) body.system = parameters.systemPrompt;

      const result = await this.httpRequest({
        method: "POST",
        url: "https://api.anthropic.com/v1/messages",
        headers: {
          "x-api-key": credentials.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body,
      }) as any;

      return {
        content: result.content?.[0]?.text ?? "",
        inputTokens: result.usage?.input_tokens,
        outputTokens: result.usage?.output_tokens,
      };
    }

    if (operationId === "agentChat") {
      throw new Error("agentChat WorkflowExecutor tarafından LangChain üzerinden çalıştırılır.");
    }

    throw new Error(`Anthropic: bilinmeyen operasyon '${operationId}'`);
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      await this.httpRequest({
        method: "POST",
        url: "https://api.anthropic.com/v1/messages",
        headers: {
          "x-api-key": credentials.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: {
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
