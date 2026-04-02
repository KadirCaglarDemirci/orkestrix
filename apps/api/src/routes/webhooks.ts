import { FastifyInstance } from "fastify";
import { prisma } from "../prisma/client";
import { enqueueExecution } from "../queue/executionQueue";

export async function webhookRoutes(app: FastifyInstance) {
  // Webhook tetikleyicisi (public - auth yok)
  app.post("/:path", async (req, reply) => {
    const { path } = req.params as { path: string };
    const body = req.body as Record<string, unknown>;
    const headers = req.headers as Record<string, string>;

    const trigger = await prisma.workflowTrigger.findUnique({
      where: { webhookPath: path, isActive: true },
      include: { workflow: { select: { id: true, isActive: true } } },
    });

    if (!trigger || !trigger.workflow.isActive) {
      reply.code(404);
      return { error: "Webhook bulunamadı veya aktif değil" };
    }

    const execution = await prisma.execution.create({
      data: {
        workflowId: trigger.workflowId,
        status: "PENDING",
        mode: "TRIGGER",
        inputData: { body, headers, path },
      },
    });

    await enqueueExecution(execution.id);

    return { executionId: execution.id, message: "Workflow tetiklendi" };
  });
}
