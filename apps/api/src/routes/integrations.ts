import { FastifyInstance } from "fastify";
import { z } from "zod";
import { integrationRegistry } from "@flowmatic/integrations";
import { prisma } from "../prisma/client";
import { credentialService } from "../services/CredentialService";

const LoadOptionsSchema = z.object({
  credentialId: z.string(),
  methodName: z.string(),
});

export async function integrationRoutes(app: FastifyInstance) {
  // Tüm entegrasyonları listele
  app.get("/", async () => {
    return integrationRegistry.getAll();
  });

  // Entegrasyon detayı
  app.get("/:id", async (req) => {
    const { id } = req.params as { id: string };
    const integration = integrationRegistry.get(id);
    return integration.definition;
  });

  // Dinamik dropdown seçeneklerini yükle
  app.post("/:id/options", async (req) => {
    const { id } = req.params as { id: string };
    const body = LoadOptionsSchema.parse(req.body);

    const integration = integrationRegistry.get(id);
    const credential = await prisma.credential.findUniqueOrThrow({
      where: { id: body.credentialId },
    });
    const decrypted = credentialService.decrypt(credential.encryptedData);

    if (!integration.loadOptions) {
      return [];
    }
    return integration.loadOptions(body.methodName, decrypted);
  });
}
