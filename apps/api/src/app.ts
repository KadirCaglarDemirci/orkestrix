import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env";
import { authRoutes } from "./routes/auth";
import { workflowRoutes } from "./routes/workflows";
import { credentialRoutes } from "./routes/credentials";
import { integrationRoutes } from "./routes/integrations";
import { executionRoutes } from "./routes/executions";
import { webhookRoutes } from "./routes/webhooks";
import { formRoutes } from "./routes/forms";
import { nodeRoutes } from "./routes/nodes";

export async function buildApp() {
  const app = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    },
  });

  // Plugins
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(jwt, { secret: env.JWT_SECRET });

  // JWT authenticate decorator
  app.decorate("authenticate", async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Yetkisiz erişim" });
    }
  });

  // Auth routes (public)
  await app.register(authRoutes, { prefix: "/api/auth" });

  // Webhook routes (public)
  await app.register(webhookRoutes, { prefix: "/webhooks" });

  // Form submission routes (public)
  await app.register(formRoutes, { prefix: "/api/forms" });

  // Protected routes
  const protectedRoutes = async (fastify: typeof app) => {
    fastify.addHook("preHandler", fastify.authenticate);
    await fastify.register(workflowRoutes, { prefix: "/workflows" });
    await fastify.register(credentialRoutes, { prefix: "/credentials" });
    await fastify.register(integrationRoutes, { prefix: "/integrations" });
    await fastify.register(executionRoutes, { prefix: "/executions" });
    await fastify.register(nodeRoutes, { prefix: "/nodes" });
  };
  await app.register(protectedRoutes, { prefix: "/api" });

  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  return app;
}
