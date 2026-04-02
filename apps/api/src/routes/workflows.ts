import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { enqueueExecution } from "../queue/executionQueue";

const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const SaveGraphSchema = z.object({
  nodes: z.array(
    z.object({
      rfId: z.string(),
      type: z.enum([
        "TRIGGER", "ACTION", "CONDITION",
        "AI_AGENT", "AI_MODEL", "AI_MEMORY", "AI_TOOL",
      ]),
      integrationId: z.string().optional(),
      operation: z.string().optional(),
      label: z.string(),
      positionX: z.number(),
      positionY: z.number(),
      config: z.record(z.unknown()).default({}),
      parentNodeId: z.string().optional(),
    })
  ),
  edges: z.array(
    z.object({
      rfId: z.string(),
      sourceNodeRfId: z.string(),
      sourceHandle: z.string().optional(),
      targetNodeRfId: z.string(),
      targetHandle: z.string().optional(),
      label: z.string().optional(),
    })
  ),
});

export async function workflowRoutes(app: FastifyInstance) {
  // Dashboard istatistikleri
  app.get("/stats", async (req) => {
    const userId = (req.user as any).id;

    const [workflows, executions] = await Promise.all([
      prisma.workflow.findMany({
        where: { ownerId: userId },
        select: { id: true, isActive: true },
      }),
      prisma.execution.findMany({
        where: { workflow: { ownerId: userId } },
        select: { status: true, startedAt: true, finishedAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const total = executions.length;
    const success = executions.filter((e) => e.status === "SUCCESS").length;
    const failed = executions.filter((e) => e.status === "FAILED").length;
    const running = executions.filter((e) => e.status === "RUNNING" || e.status === "PENDING").length;

    // Son 7 günlük günlük execution sayısı
    const daily: Record<string, { success: number; failed: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      daily[key] = { success: 0, failed: 0 };
    }
    executions.forEach((e) => {
      const key = new Date(e.createdAt).toISOString().slice(0, 10);
      if (daily[key]) {
        if (e.status === "SUCCESS") daily[key].success++;
        else if (e.status === "FAILED") daily[key].failed++;
      }
    });

    // Ortalama süre
    const durations = executions
      .filter((e) => e.startedAt && e.finishedAt)
      .map((e) => new Date(e.finishedAt!).getTime() - new Date(e.startedAt!).getTime());
    const avgDurationMs = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    return {
      workflows: { total: workflows.length, active: workflows.filter((w) => w.isActive).length },
      executions: { total, success, failed, running,
        successRate: total > 0 ? Math.round((success / total) * 100) : 0,
        avgDurationMs },
      daily: Object.entries(daily).map(([date, counts]) => ({ date, ...counts })),
      recentExecutions: executions.slice(0, 10),
    };
  });

  // Tüm workflow'ları listele
  app.get("/", async (req) => {
    const userId = (req.user as any).id;
    return prisma.workflow.findMany({
      where: { ownerId: userId },
      include: {
        _count: { select: { nodes: true, executions: true } },
        executions: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { status: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  });

  // Yeni workflow oluştur
  app.post("/", async (req, reply) => {
    const userId = (req.user as any).id;
    const body = CreateWorkflowSchema.parse(req.body);

    const workflow = await prisma.workflow.create({
      data: {
        name: body.name,
        description: body.description,
        ownerId: userId,
      },
    });

    reply.code(201);
    return workflow;
  });

  // Workflow detayı
  app.get("/:id", async (req) => {
    const { id } = req.params as { id: string };
    return prisma.workflow.findUniqueOrThrow({ where: { id } });
  });

  // Workflow güncelle
  app.put("/:id", async (req) => {
    const { id } = req.params as { id: string };
    const body = CreateWorkflowSchema.parse(req.body);
    return prisma.workflow.update({ where: { id }, data: body });
  });

  // Workflow sil
  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.workflow.delete({ where: { id } });
    reply.code(204);
  });

  // Workflow aktif/pasif et
  app.post("/:id/activate", async (req) => {
    const { id } = req.params as { id: string };
    return prisma.workflow.update({ where: { id }, data: { isActive: true } });
  });

  app.post("/:id/deactivate", async (req) => {
    const { id } = req.params as { id: string };
    return prisma.workflow.update({ where: { id }, data: { isActive: false } });
  });

  // Graph'ı kaydet (tüm nodes + edges bulk upsert)
  app.put("/:id/graph", async (req) => {
    const { id } = req.params as { id: string };
    const body = SaveGraphSchema.parse(req.body);

    return prisma.$transaction(async (tx) => {
      // Eski nodes ve edges'i sil
      await tx.workflowEdge.deleteMany({ where: { workflowId: id } });
      await tx.workflowNode.deleteMany({ where: { workflowId: id } });

      // Önce parentNodeId olmayan node'ları ekle
      const rootNodes = body.nodes.filter((n) => !n.parentNodeId);
      const childNodes = body.nodes.filter((n) => n.parentNodeId);

      await tx.workflowNode.createMany({
        data: rootNodes.map((n) => ({
          workflowId: id,
          rfId: n.rfId,
          type: n.type,
          integrationId: n.integrationId,
          operation: n.operation,
          label: n.label,
          positionX: n.positionX,
          positionY: n.positionY,
          config: n.config,
        })),
      });

      // Sonra child node'ları ekle (parent ID referansı için DB'deki ID'ye ihtiyaç var)
      for (const child of childNodes) {
        const parentNode = await tx.workflowNode.findUniqueOrThrow({
          where: { workflowId_rfId: { workflowId: id, rfId: child.parentNodeId! } },
        });
        await tx.workflowNode.create({
          data: {
            workflowId: id,
            rfId: child.rfId,
            type: child.type,
            integrationId: child.integrationId,
            operation: child.operation,
            label: child.label,
            positionX: child.positionX,
            positionY: child.positionY,
            config: child.config,
            parentNodeId: parentNode.id,
          },
        });
      }

      // Edge'leri ekle
      await tx.workflowEdge.createMany({
        data: body.edges.map((e) => ({
          workflowId: id,
          rfId: e.rfId,
          sourceNodeRfId: e.sourceNodeRfId,
          sourceHandle: e.sourceHandle,
          targetNodeRfId: e.targetNodeRfId,
          targetHandle: e.targetHandle,
          label: e.label,
        })),
      });

      // updatedAt güncelle
      await tx.workflow.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      return { success: true };
    });
  });

  // Graph'ı getir
  app.get("/:id/graph", async (req) => {
    const { id } = req.params as { id: string };
    const [nodes, edges] = await Promise.all([
      prisma.workflowNode.findMany({ where: { workflowId: id } }),
      prisma.workflowEdge.findMany({ where: { workflowId: id } }),
    ]);
    return { nodes, edges };
  });

  // Manuel execute
  app.post("/:id/execute", async (req, reply) => {
    const { id } = req.params as { id: string };
    const inputData = ((req.body as any)?.inputData ?? {}) as Record<string, unknown>;
    const userId = (req.user as any).id;

    const execution = await prisma.execution.create({
      data: {
        workflowId: id,
        userId,
        status: "PENDING",
        mode: "MANUAL",
        inputData,
      },
    });

    await enqueueExecution(execution.id);

    reply.code(202);
    return { executionId: execution.id };
  });

  // Workflow'u JSON olarak dışa aktar
  app.get("/:id/export", async (req) => {
    const { id } = req.params as { id: string };
    const [workflow, nodes, edges] = await Promise.all([
      prisma.workflow.findUniqueOrThrow({ where: { id } }),
      prisma.workflowNode.findMany({ where: { workflowId: id } }),
      prisma.workflowEdge.findMany({ where: { workflowId: id } }),
    ]);
    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      workflow: { name: workflow.name, description: workflow.description },
      nodes,
      edges,
    };
  });

  // JSON'dan workflow içe aktar
  app.post("/import", async (req, reply) => {
    const userId = (req.user as any).id;
    const body = req.body as any;

    const workflow = await prisma.workflow.create({
      data: {
        name: body.workflow?.name ?? "İçe Aktarılan Workflow",
        description: body.workflow?.description,
        ownerId: userId,
      },
    });

    if (Array.isArray(body.nodes) && body.nodes.length > 0) {
      const rootNodes = body.nodes.filter((n: any) => !n.parentNodeId);
      const childNodes = body.nodes.filter((n: any) => n.parentNodeId);

      await prisma.workflowNode.createMany({
        data: rootNodes.map((n: any) => ({
          workflowId: workflow.id,
          rfId: n.rfId,
          type: n.type,
          integrationId: n.integrationId,
          operation: n.operation,
          label: n.label,
          positionX: n.positionX ?? 0,
          positionY: n.positionY ?? 0,
          config: n.config ?? {},
        })),
      });

      for (const child of childNodes) {
        const parent = await prisma.workflowNode.findUnique({
          where: { workflowId_rfId: { workflowId: workflow.id, rfId: child.parentNodeId } },
        });
        if (!parent) continue;
        await prisma.workflowNode.create({
          data: {
            workflowId: workflow.id,
            rfId: child.rfId,
            type: child.type,
            integrationId: child.integrationId,
            operation: child.operation,
            label: child.label,
            positionX: child.positionX ?? 0,
            positionY: child.positionY ?? 0,
            config: child.config ?? {},
            parentNodeId: parent.id,
          },
        });
      }

      if (Array.isArray(body.edges)) {
        await prisma.workflowEdge.createMany({
          data: body.edges.map((e: any) => ({
            workflowId: workflow.id,
            rfId: e.rfId,
            sourceNodeRfId: e.sourceNodeRfId,
            sourceHandle: e.sourceHandle,
            targetNodeRfId: e.targetNodeRfId,
            targetHandle: e.targetHandle,
            label: e.label,
          })),
        });
      }
    }

    reply.code(201);
    return workflow;
  });

  // Execution listesi
  app.get("/:id/executions", async (req) => {
    const { id } = req.params as { id: string };
    return prisma.execution.findMany({
      where: { workflowId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        mode: true,
        startedAt: true,
        finishedAt: true,
        createdAt: true,
        errorMessage: true,
      },
    });
  });
}
