import { buildApp } from "./app";
import { env } from "./config/env";
import { executionWorker } from "./queue/executionQueue";
import { startScheduler } from "./services/SchedulerService";

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
    console.log(`Automiq API çalışıyor: http://${env.API_HOST}:${env.API_PORT}`);
    startScheduler();
  } catch (err) {
    app.log.error(err);
    await executionWorker.close();
    process.exit(1);
  }

  process.on("SIGTERM", async () => {
    await executionWorker.close();
    await app.close();
    process.exit(0);
  });
}

main();
