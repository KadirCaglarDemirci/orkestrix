import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { credentialService } from "../services/CredentialService";
import { integrationRegistry } from "@flowmatic/integrations";

const CreateCredentialSchema = z.object({
  name: z.string().min(1).max(100),
  integrationId: z.string(),
  data: z.record(z.string()),
});

export async function credentialRoutes(app: FastifyInstance) {
  // Listele
  app.get("/", async (req) => {
    const userId = (req.user as any).id;
    return prisma.credential.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        integrationId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });

  // Oluştur
  app.post("/", async (req, reply) => {
    const userId = (req.user as any).id;
    const body = CreateCredentialSchema.parse(req.body);

    const encryptedData = credentialService.encrypt(body.data);

    const credential = await prisma.credential.create({
      data: {
        name: body.name,
        integrationId: body.integrationId,
        encryptedData,
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        integrationId: true,
        createdAt: true,
      },
    });

    reply.code(201);
    return credential;
  });

  // Güncelle
  app.put("/:id", async (req) => {
    const { id } = req.params as { id: string };
    const body = CreateCredentialSchema.parse(req.body);

    const encryptedData = credentialService.encrypt(body.data);
    return prisma.credential.update({
      where: { id },
      data: { name: body.name, encryptedData },
      select: { id: true, name: true, integrationId: true, updatedAt: true },
    });
  });

  // Sil
  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.credential.delete({ where: { id } });
    reply.code(204);
  });

  // Test et
  app.post("/:id/test", async (req) => {
    const { id } = req.params as { id: string };
    const credential = await prisma.credential.findUniqueOrThrow({ where: { id } });
    const decrypted = credentialService.decrypt(credential.encryptedData);
    const integration = integrationRegistry.get(credential.integrationId);

    const isValid = await integration.validateCredentials(decrypted);
    return { valid: isValid };
  });
}
