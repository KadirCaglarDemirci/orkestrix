import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class NetlifyIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "netlify",
    name: "Netlify Deploy",
    description: "HTML siteyi Netlify'a yükle ve ücretsiz domain ile yayına al",
    icon: "🚀",
    category: "deployment",
    authType: "apiKey",
    credentialFields: [
      {
        key: "accessToken",
        label: "Netlify Personal Access Token",
        type: "password",
        required: true,
        helpText: "app.netlify.com → User Settings → Applications → Personal access tokens",
      },
    ],
    operations: [
      {
        id: "deploySite",
        name: "Siteyi Yayınla",
        description: "HTML içeriği Netlify'a yükle, benzersiz URL al",
        parameters: [
          { key: "html", label: "HTML İçeriği", type: "textarea", required: true },
          { key: "siteName", label: "Site Adı (subdomain)", type: "string", required: false,
            placeholder: "firma-adi (otomatik oluşturulur)" },
          { key: "businessName", label: "Firma Adı", type: "string", required: false },
        ],
      },
      {
        id: "updateSite",
        name: "Siteyi Güncelle",
        description: "Var olan Netlify sitesini yeni HTML ile güncelle",
        parameters: [
          { key: "siteId", label: "Site ID", type: "string", required: true },
          { key: "html", label: "Yeni HTML İçeriği", type: "textarea", required: true },
        ],
      },
      {
        id: "deleteSite",
        name: "Siteyi Sil",
        description: "Netlify sitesini sil",
        parameters: [
          { key: "siteId", label: "Site ID", type: "string", required: true },
        ],
      },
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    const { accessToken } = context.credentials;
    const p = context.parameters;

    if (operationId === "deploySite") {
      return this.deploySite(accessToken, p);
    }
    if (operationId === "updateSite") {
      return this.updateSite(accessToken, String(p.siteId), String(p.html));
    }
    if (operationId === "deleteSite") {
      return this.deleteSite(accessToken, String(p.siteId));
    }

    throw new Error(`Bilinmeyen operasyon: ${operationId}`);
  }

  private async deploySite(token: string, p: Record<string, unknown>) {
    const html = String(p.html ?? "");
    if (!html) throw new Error("HTML içeriği boş olamaz");

    // Benzersiz site adı oluştur
    const baseName = p.siteName
      ? String(p.siteName).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 30)
      : p.businessName
        ? String(p.businessName).toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 20) + "-" + Date.now().toString(36)
        : "automiq-site-" + Date.now().toString(36);

    // 1. Yeni site oluştur
    const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: baseName,
        custom_domain: null,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Netlify site oluşturma hatası: ${err}`);
    }

    const site = await createRes.json() as any;
    const siteId = site.id;

    // 2. HTML dosyasını deploy et (zip formatında)
    const zipBuffer = await this.createZip("index.html", html);

    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/zip",
      },
      body: zipBuffer,
    });

    if (!deployRes.ok) {
      const err = await deployRes.text();
      throw new Error(`Netlify deploy hatası: ${err}`);
    }

    const deploy = await deployRes.json() as any;

    // Deploy tamamlanana kadar bekle (max 30sn)
    const finalDeploy = await this.waitForDeploy(token, siteId, deploy.id);

    return {
      siteId,
      deployId: deploy.id,
      siteUrl: `https://${baseName}.netlify.app`,
      adminUrl: `https://app.netlify.com/sites/${siteId}`,
      status: finalDeploy.state,
      deployedAt: new Date().toISOString(),
    };
  }

  private async updateSite(token: string, siteId: string, html: string) {
    const zipBuffer = await this.createZip("index.html", html);

    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/zip",
      },
      body: zipBuffer,
    });

    if (!deployRes.ok) {
      const err = await deployRes.text();
      throw new Error(`Netlify güncelleme hatası: ${err}`);
    }

    const deploy = await deployRes.json() as any;
    return { siteId, deployId: deploy.id, status: deploy.state };
  }

  private async deleteSite(token: string, siteId: string) {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return { deleted: res.ok, siteId };
  }

  private async waitForDeploy(token: string, siteId: string, deployId: string, maxWaitMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const deploy = await res.json() as any;
      if (deploy.state === "ready" || deploy.state === "error") return deploy;
    }
    return { state: "timeout" };
  }

  // Minimal ZIP oluşturucu (fflate olmadan)
  private async createZip(filename: string, content: string): Promise<Buffer> {
    try {
      const fflate = await import("fflate");
      const encoder = new TextEncoder();
      const fileData = encoder.encode(content);
      const zipped = fflate.zipSync({ [filename]: fileData });
      return Buffer.from(zipped);
    } catch {
      throw new Error("fflate paketi kurulu değil. API sunucusunda: pnpm --filter api add fflate");
    }
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const res = await fetch("https://api.netlify.com/api/v1/user", {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
