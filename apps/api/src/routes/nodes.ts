import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { integrationRegistry } from "@flowmatic/integrations";
import { credentialService } from "../services/CredentialService";

const TestNodeSchema = z.object({
  parameters: z.record(z.unknown()).optional(),
  credentialId: z.string().optional(),
});

export async function nodeRoutes(app: FastifyInstance) {
  // Tek node'u izole test et
  app.post("/:id/test", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = TestNodeSchema.parse(req.body);

    const node = await prisma.workflowNode.findUniqueOrThrow({ where: { id } });

    if (node.type === "TRIGGER") {
      return { output: { message: "Trigger node test edilemez — workflow'u manuel çalıştır." } };
    }

    if (node.type === "CONDITION") {
      const config = node.config as any;
      const { field, operator, value } = config ?? {};
      const testData = (body.parameters as any) ?? {};
      let result = false;
      const actual = testData[field];
      if (operator === "equals") result = String(actual) === String(value);
      else if (operator === "not_equals") result = String(actual) !== String(value);
      else if (operator === "contains") result = String(actual).includes(String(value));
      else if (operator === "greater_than") result = Number(actual) > Number(value);
      else if (operator === "less_than") result = Number(actual) < Number(value);
      return { output: { result, field, operator, value, actual } };
    }

    if (node.type === "ACTION" || node.type === "AI_TOOL") {
      if (!node.integrationId || !node.operation) {
        reply.code(400);
        return { error: "Node'da integrationId veya operation eksik" };
      }
      const credId = body.credentialId ?? (node.config as any)?.credentialId;
      const credentials = credId ? await credentialService.getDecrypted(credId) : {};
      const config = node.config as any;
      const parameters = { ...(config?.parameters ?? {}), ...(body.parameters ?? {}) };

      const startedAt = Date.now();
      try {
        const output = await integrationRegistry.get(node.integrationId).execute(
          node.operation,
          { credentials, parameters, executionId: "test" }
        );
        return { output, durationMs: Date.now() - startedAt };
      } catch (err: any) {
        reply.code(500);
        return { error: err.message, durationMs: Date.now() - startedAt };
      }
    }

    reply.code(400);
    return { error: `${node.type} tipi test edilemiyor` };
  });
}
