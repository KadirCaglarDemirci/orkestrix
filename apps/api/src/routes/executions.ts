import { FastifyInstance } from "fastify";
import { prisma } from "../prisma/client";

export async function executionRoutes(app: FastifyInstance) {
  // Execution detayı
  app.get("/:id", async (req) => {
    const { id } = req.params as { id: string };
    return prisma.execution.findUniqueOrThrow({
      where: { id },
      include: {
        workflow: { select: { id: true, name: true } },
      },
    });
  });

  // Execution logları (node bazlı)
  app.get("/:id/logs", async (req) => {
    const { id } = req.params as { id: string };
    return prisma.executionLog.findMany({
      where: { executionId: id },
      include: {
        node: { select: { rfId: true, label: true, type: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  });

  // SSE — real-time execution log stream
  app.get("/:id/stream", async (req, reply) => {
    const { id } = req.params as { id: string };

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    const send = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // İlk durum
    const execution = await prisma.execution.findUnique({ where: { id } });
    if (execution) send("status", { status: execution.status });

    // Poll every 800ms until done
    const interval = setInterval(async () => {
      try {
        const [exec, logs] = await Promise.all([
          prisma.execution.findUnique({ where: { id } }),
          prisma.executionLog.findMany({
            where: { executionId: id },
            include: { node: { select: { rfId: true, label: true, type: true } } },
            orderBy: { createdAt: "asc" },
          }),
        ]);

        if (!exec) { clearInterval(interval); reply.raw.end(); return; }

        send("update", { status: exec.status, logs });

        if (exec.status === "SUCCESS" || exec.status === "FAILED") {
          send("done", { status: exec.status, errorMessage: exec.errorMessage });
          clearInterval(interval);
          reply.raw.end();
        }
      } catch {
        clearInterval(interval);
        reply.raw.end();
      }
    }, 800);

    req.raw.on("close", () => clearInterval(interval));
  });

  // Execution sil
  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.execution.delete({ where: { id } });
    reply.code(204);
  });
}
