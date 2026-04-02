import { prisma } from "../prisma/client";
import { enqueueExecution } from "../queue/executionQueue";

// Basit cron: dakika bazlı kontrol
// Production'da node-cron veya BullMQ repeatable jobs kullanılabilir

function matchCron(cronExpr: string, date: Date): boolean {
  // "* * * * *" formatı: dakika saat gün ay haftaGünü
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [minute, hour, dom, month, dow] = parts;

  const match = (part: string, value: number) => {
    if (part === "*") return true;
    const num = parseInt(part, 10);
    return !isNaN(num) && num === value;
  };

  return (
    match(minute, date.getMinutes()) &&
    match(hour, date.getHours()) &&
    match(dom, date.getDate()) &&
    match(month, date.getMonth() + 1) &&
    match(dow, date.getDay())
  );
}

export function startScheduler(): NodeJS.Timeout {
  console.log("[Scheduler] Başlatıldı");

  return setInterval(async () => {
    const now = new Date();

    try {
      const triggers = await prisma.workflowTrigger.findMany({
        where: { type: "SCHEDULE", isActive: true },
        include: { workflow: { select: { id: true, isActive: true } } },
      });

      for (const trigger of triggers) {
        if (!trigger.workflow.isActive) continue;
        const config = trigger.config as any;
        if (!config?.cronExpression) continue;

        if (matchCron(config.cronExpression, now)) {
          const execution = await prisma.execution.create({
            data: {
              workflowId: trigger.workflowId,
              status: "PENDING",
              mode: "TRIGGER",
              inputData: { scheduledAt: now.toISOString(), triggerId: trigger.id },
            },
          });
          await enqueueExecution(execution.id);
          console.log(`[Scheduler] Workflow tetiklendi: ${trigger.workflowId}`);
        }
      }
    } catch (err) {
      console.error("[Scheduler] Hata:", err);
    }
  }, 60_000); // Her dakika kontrol
}
