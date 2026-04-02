import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";
import { WorkflowExecutor } from "../execution/WorkflowExecutor";
import { prisma } from "../prisma/client";
import { credentialService } from "../services/CredentialService";

// BullMQ requires maxRetriesPerRequest: null
const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

connection.on("error", (err) => {
  // Redis bağlantı hatalarını sessizce logla — sunucuyu çökertme
  if ((err as any).code === "ECONNREFUSED") {
    console.warn("[Redis] Bağlantı kurulamadı, yeniden deneniyor...");
  }
});

export const executionQueue = new Queue("workflow-execution", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export const executionWorker = new Worker(
  "workflow-execution",
  async (job) => {
    const { executionId } = job.data as { executionId: string };
    const executor = new WorkflowExecutor(prisma, credentialService);
    await executor.execute(executionId);
  },
  {
    connection,
    concurrency: 10,
  }
);

executionWorker.on("failed", (job, err) => {
  console.error(`[Queue] Execution başarısız [${job?.data?.executionId}]:`, err.message);
});

executionWorker.on("completed", (job) => {
  console.log(`[Queue] Execution tamamlandı [${job?.data?.executionId}]`);
});

export async function enqueueExecution(executionId: string): Promise<void> {
  try {
    // Redis hazır mı kontrol et
    if (connection.status !== "ready") {
      console.warn("[Queue] Redis hazır değil, senkron mod ile çalıştırılıyor...");
      await runExecutionSync(executionId);
      return;
    }
    await executionQueue.add("execute", { executionId }, { jobId: executionId });
  } catch (err) {
    console.warn("[Queue] BullMQ hatası, senkron fallback:", (err as Error).message);
    await runExecutionSync(executionId);
  }
}

async function runExecutionSync(executionId: string): Promise<void> {
  const executor = new WorkflowExecutor(prisma, credentialService);
  await executor.execute(executionId);
}
