import { FastifyInstance } from "fastify";
import { prisma } from "../prisma/client";
import { enqueueExecution } from "../queue/executionQueue";

export async function formRoutes(app: FastifyInstance) {
  // Public form submission endpoint
  app.post("/:formId/submit", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    const body = req.body as Record<string, unknown>;

    const trigger = await prisma.workflowTrigger.findFirst({
      where: { type: "FORM_SUBMISSION", isActive: true, config: { path: ["formId"], equals: formId } },
      include: { workflow: { select: { id: true, isActive: true } } },
    });

    if (!trigger || !trigger.workflow.isActive) {
      reply.code(404);
      return { error: "Form bulunamadı veya aktif değil" };
    }

    const execution = await prisma.execution.create({
      data: {
        workflowId: trigger.workflowId,
        status: "PENDING",
        mode: "TRIGGER",
        inputData: { formData: body, formId, submittedAt: new Date().toISOString() },
      },
    });

    await enqueueExecution(execution.id);
    reply.code(202);
    return { executionId: execution.id, message: "Form gönderildi, işleniyor" };
  });
}
