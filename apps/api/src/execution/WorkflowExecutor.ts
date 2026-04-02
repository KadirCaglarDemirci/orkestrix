import { PrismaClient, WorkflowNode, WorkflowEdge } from "@prisma/client";
import { integrationRegistry } from "@flowmatic/integrations";
import { CredentialService } from "../services/CredentialService";
import type { ExecutionContext, NodeOutput } from "@flowmatic/types";
import { ChatAnthropic } from "@langchain/anthropic";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { DynamicTool } from "@langchain/core/tools";
import { pull } from "langchain/hub";
import { BufferMemory } from "langchain/memory";
import { resolveParameters, type ResolverContext } from "./ExpressionResolver";

type WorkflowWithGraph = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export class WorkflowExecutor {
  constructor(
    private prisma: PrismaClient,
    private credentialService: CredentialService
  ) {}

  async execute(executionId: string): Promise<void> {
    const execution = await this.prisma.execution.findUniqueOrThrow({
      where: { id: executionId },
      include: {
        workflow: {
          include: { nodes: true, edges: true },
        },
      },
    });

    await this.prisma.execution.update({
      where: { id: executionId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    const context: ExecutionContext = {
      executionId,
      workflowId: execution.workflowId,
      inputData: (execution.inputData as Record<string, unknown>) ?? {},
      nodeOutputs: new Map(),
      nodeOutputsByLabel: new Map(),
      userId: execution.userId ?? undefined,
    };

    try {
      const { nodes, edges } = execution.workflow as unknown as WorkflowWithGraph;

      // AI_MODEL, AI_MEMORY, AI_TOOL sub-node'larını filtrele — bunlar Agent içinde çalışır
      const mainNodes = nodes.filter((n) => !n.parentNodeId);

      const triggerNode = mainNodes.find((n) => n.type === "TRIGGER");
      if (!triggerNode) throw new Error("Workflow'da TRIGGER düğümü bulunamadı");

      await this.executeFromNode(triggerNode, mainNodes, edges, context);

      const lastOutput = Array.from(context.nodeOutputs.values()).pop();
      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: "SUCCESS",
          finishedAt: new Date(),
          outputData: (lastOutput?.data ?? null) as any,
        },
      });
    } catch (error) {
      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage: (error as Error).message,
        },
      });
      throw error;
    }
  }

  private async executeFromNode(
    node: WorkflowNode,
    allNodes: WorkflowNode[],
    allEdges: WorkflowEdge[],
    context: ExecutionContext
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const outputData = await this.runNode(node, context);
      const durationMs = Date.now() - startTime;

      const nodeOutput: NodeOutput = {
        nodeId: node.rfId,
        status: "success",
        data: outputData,
        durationMs,
      };
      context.nodeOutputs.set(node.rfId, nodeOutput);
      context.nodeOutputsByLabel?.set(node.label, nodeOutput);

      await this.saveNodeLog(context.executionId, node.id, nodeOutput);

      // Sonraki düğümleri belirle
      const nextEdges = allEdges.filter((e) => e.sourceNodeRfId === node.rfId);

      for (const edge of nextEdges) {
        // Condition branch kontrolü
        if (node.type === "CONDITION") {
          const conditionResult = (outputData as { result: boolean }).result;
          if (String(conditionResult) !== edge.sourceHandle) continue;
        }

        const nextNode = allNodes.find((n) => n.rfId === edge.targetNodeRfId);
        if (!nextNode) continue;

        // Loop: "loop" handle → her eleman için çalıştır
        if (node.type === "LOOP" && edge.sourceHandle === "loop") {
          const loopData = outputData as { items: unknown[]; arrayField: string };
          for (let i = 0; i < loopData.items.length; i++) {
            const item = loopData.items[i];
            // Her iterasyon için geçici context kopyası
            const loopContext: ExecutionContext = {
              ...context,
              nodeOutputs: new Map(context.nodeOutputs),
              nodeOutputsByLabel: new Map(context.nodeOutputsByLabel),
              inputData: {
                ...context.inputData,
                $item: item,
                $index: i,
                $total: loopData.items.length,
              },
            };
            // Önceki çıktıyı loop item olarak set et
            loopContext.nodeOutputs.set(node.rfId, { ...nodeOutput, data: item });
            loopContext.nodeOutputsByLabel?.set(node.label, { ...nodeOutput, data: item });
            await this.executeFromNode(nextNode, allNodes, allEdges, loopContext);
          }
          continue;
        }

        await this.executeFromNode(nextNode, allNodes, allEdges, context);
      }
    } catch (error) {
      const config = node.config as any;
      const nodeOutput: NodeOutput = {
        nodeId: node.rfId,
        status: "failed",
        data: null,
        error: (error as Error).message,
        durationMs: Date.now() - startTime,
      };

      context.nodeOutputs.set(node.rfId, nodeOutput);
      context.nodeOutputsByLabel?.set(node.label, nodeOutput);
      await this.saveNodeLog(context.executionId, node.id, nodeOutput);

      if (!config?.continueOnFail) throw error;
    }
  }

  private async runNode(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<unknown> {
    const config = node.config as any;

    switch (node.type) {
      case "TRIGGER":
        return context.inputData;

      case "CONDITION":
        return this.evaluateCondition(node, context);

      case "LOOP":
        return this.prepareLoop(node, context);

      case "AI_AGENT":
        return this.runAIAgent(node, context);

      case "ACTION":
      case "AI_TOOL": {
        if (!node.integrationId || !node.operation) {
          throw new Error(`Düğüm ${node.rfId}: integrationId ve operation zorunlu`);
        }
        const integration = integrationRegistry.get(node.integrationId);
        const credentials = config.credentialId
          ? await this.credentialService.getDecrypted(config.credentialId)
          : {};

        const previousOutput = this.getPreviousOutput(context);

        // Expression resolver: {{ $prev.field }}, {{ input.field }}, {{ $node["Label"].field }}
        const resolverCtx: ResolverContext = {
          inputData: context.inputData,
          nodeOutputs: context.nodeOutputs,
          nodeOutputsByLabel: context.nodeOutputsByLabel ?? new Map(),
          previousOutput,
        };
        const resolvedParameters = resolveParameters(config.parameters ?? {}, resolverCtx);

        return integration.execute(node.operation, {
          credentials,
          parameters: resolvedParameters,
          inputData: previousOutput,
          executionId: context.executionId,
        });
      }

      default:
        throw new Error(`Bilinmeyen node tipi: ${node.type}`);
    }
  }

  private prepareLoop(node: WorkflowNode, context: ExecutionContext): { items: unknown[]; arrayField: string } {
    const config = node.config as any;
    const arrayField = config?.parameters?.arrayField ?? "";
    const previousOutput = this.getPreviousOutput(context) as any;

    let items: unknown[] = [];

    if (arrayField) {
      // Noktalı yol ile alan al: "businesses" veya "results.0.items"
      const val = arrayField.split(".").reduce((acc: any, k: string) => acc?.[k], previousOutput);
      if (Array.isArray(val)) items = val;
      else if (val !== undefined && val !== null) items = [val];
    } else if (Array.isArray(previousOutput)) {
      items = previousOutput;
    } else if (previousOutput && typeof previousOutput === "object") {
      // İlk dizi alanını bul
      const firstArr = Object.values(previousOutput).find(Array.isArray) as unknown[] | undefined;
      items = firstArr ?? [previousOutput];
    }

    const maxItems = Number(config?.parameters?.maxItems ?? 100);
    return { items: items.slice(0, maxItems), arrayField };
  }

  private evaluateCondition(
    node: WorkflowNode,
    context: ExecutionContext
  ): { result: boolean } {
    const config = node.config as any;
    const { field, operator, value } = config.parameters ?? {};

    const previousOutput = this.getPreviousOutput(context) as any;
    const actualValue = field
      ? String(field).split(".").reduce((acc: any, key: string) => acc?.[key], previousOutput)
      : previousOutput;

    let result = false;
    switch (operator) {
      case "equals":      result = actualValue === value; break;
      case "notEquals":   result = actualValue !== value; break;
      case "contains":    result = String(actualValue).includes(String(value)); break;
      case "greaterThan": result = Number(actualValue) > Number(value); break;
      case "lessThan":    result = Number(actualValue) < Number(value); break;
      case "exists":      result = actualValue !== undefined && actualValue !== null; break;
      case "isTrue":      result = Boolean(actualValue) === true; break;
      case "isFalse":     result = Boolean(actualValue) === false; break;
    }

    return { result };
  }

  private async runAIAgent(
    agentNode: WorkflowNode,
    context: ExecutionContext
  ): Promise<unknown> {
    const config = agentNode.config as any;
    const previousOutput = this.getPreviousOutput(context);

    // Modeli bul (parentNodeId = agentNode.id olan AI_MODEL node)
    const allNodes = await this.prisma.workflowNode.findMany({
      where: { workflowId: agentNode.workflowId },
    });

    const modelNode = allNodes.find(
      (n) => n.parentNodeId === agentNode.id && n.type === "AI_MODEL"
    );
    const modelConfig = (modelNode?.config as any) ?? {};
    const modelCredentials = modelConfig.credentialId
      ? await this.credentialService.getDecrypted(modelConfig.credentialId)
      : {};

    const llm = new ChatAnthropic({
      apiKey: modelCredentials.apiKey,
      model: modelConfig.parameters?.model ?? "claude-sonnet-4-6",
      maxTokens: modelConfig.parameters?.maxTokens ?? 2048,
    });

    // Tool node'larını bul ve DynamicTool'a çevir
    const toolNodes = allNodes.filter(
      (n) => n.parentNodeId === agentNode.id && n.type === "AI_TOOL"
    );

    const tools = toolNodes.map((toolNode) => {
      const toolConf = toolNode.config as any;
      return new DynamicTool({
        name: toolNode.label.replace(/\s+/g, "_").toLowerCase(),
        description: toolConf.description ?? `${toolNode.label} aracı`,
        func: async (input: string) => {
          let params: Record<string, unknown>;
          try { params = JSON.parse(input); } catch { params = { input }; }

          const creds = toolConf.credentialId
            ? await this.credentialService.getDecrypted(toolConf.credentialId)
            : {};

          const result = await integrationRegistry.get(toolNode.integrationId!).execute(
            toolNode.operation!,
            { credentials: creds, parameters: { ...toolConf.parameters, ...params }, executionId: context.executionId }
          );
          return typeof result === "string" ? result : JSON.stringify(result);
        },
      });
    });

    const userMessage = config.parameters?.userMessage
      ? String(config.parameters.userMessage)
      : `Girdi verisi: ${JSON.stringify(previousOutput)}`;

    // Araç yoksa direkt chat
    if (tools.length === 0) {
      const response = await llm.invoke([
        ...(config.parameters?.systemPrompt
          ? [{ role: "system", content: config.parameters.systemPrompt }]
          : []),
        { role: "user", content: userMessage },
      ]);
      return { response: response.content, model: modelConfig.parameters?.model };
    }

    // Tools Agent (ReAct)
    const prompt = await pull("hwchase17/react-chat-agent");
    const agent = await createReactAgent({ llm, tools, prompt });
    const executor = new AgentExecutor({
      agent,
      tools,
      maxIterations: config.parameters?.maxIterations ?? 10,
      verbose: false,
    });

    const result = await executor.invoke({
      input: userMessage,
      chat_history: [],
    });

    return {
      response: result.output,
      model: modelConfig.parameters?.model ?? "claude-sonnet-4-6",
      iterations: result.intermediateSteps?.length,
    };
  }

  private getPreviousOutput(context: ExecutionContext): unknown {
    const outputs = Array.from(context.nodeOutputs.values());
    return outputs.length > 0 ? outputs[outputs.length - 1].data : null;
  }

  private async saveNodeLog(
    executionId: string,
    nodeId: string,
    output: NodeOutput
  ): Promise<void> {
    await this.prisma.executionLog.create({
      data: {
        executionId,
        nodeId,
        status: output.status === "success" ? "SUCCESS" : "FAILED",
        outputData: output.data as any,
        errorMessage: output.error,
        duration: output.durationMs,
      },
    });
  }
}
