import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export class PdfGeneratorIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "pdf-generator",
    name: "PDF Generator",
    description: "HTML'den PDF oluştur — teklifler, faturalar, raporlar",
    icon: "📄",
    category: "tools",
    authType: "none",
    credentialFields: [],
    operations: [
      { id: "htmlToPdf", name: "HTML → PDF", description: "HTML içeriğini PDF'e dönüştür",
        parameters: [
          { key: "html", label: "HTML İçeriği", type: "textarea", required: true },
          { key: "filename", label: "Dosya Adı", type: "string", required: false, placeholder: "teklif.pdf" },
          { key: "format", label: "Sayfa Boyutu", type: "select", required: false,
            options: ["A4", "A3", "Letter", "Legal"] },
          { key: "landscape", label: "Yatay", type: "boolean", required: false },
        ]},
      { id: "generateProposal", name: "Teklif PDF Oluştur", description: "Firma bilgileriyle profesyonel teklif oluştur",
        parameters: [
          { key: "businessName", label: "Firma Adı", type: "string", required: true },
          { key: "siteUrl", label: "Site URL", type: "string", required: false },
          { key: "senderName", label: "Gönderen Ad", type: "string", required: false },
          { key: "senderCompany", label: "Gönderen Şirket", type: "string", required: false },
          { key: "price", label: "Teklif Fiyatı", type: "string", required: false, placeholder: "2.500 TL" },
          { key: "notes", label: "Ek Notlar", type: "textarea", required: false },
        ]},
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    if (operationId === "htmlToPdf") return this.htmlToPdf(context);
    if (operationId === "generateProposal") return this.generateProposal(context);
    throw new Error(`Bilinmeyen operasyon: ${operationId}`);
  }

  private async htmlToPdf(context: ExecuteContext): Promise<unknown> {
    let puppeteer: any;
    try { puppeteer = await import("puppeteer"); }
    catch { throw new Error("puppeteer kurulu değil."); }

    const p = context.parameters;
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(String(p.html), { waitUntil: "domcontentloaded" });
      const pdfBuffer = await page.pdf({
        format: String(p.format ?? "A4") as any,
        landscape: Boolean(p.landscape),
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      });

      const filename = String(p.filename ?? `document-${Date.now()}.pdf`);
      const tmpPath = path.join(os.tmpdir(), filename);
      await fs.writeFile(tmpPath, pdfBuffer);

      return {
        filename,
        path: tmpPath,
        sizeBytes: pdfBuffer.length,
        base64: Buffer.from(pdfBuffer).toString("base64"),
        generatedAt: new Date().toISOString(),
      };
    } finally {
      await browser.close();
    }
  }

  private async generateProposal(context: ExecuteContext): Promise<unknown> {
    const p = context.parameters;
    const date = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; }
  .header h1 { font-size: 28px; font-weight: 700; }
  .header p { opacity: 0.85; margin-top: 6px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-top: 10px; }
  .content { padding: 40px; }
  .section { margin-bottom: 30px; }
  .section h2 { font-size: 16px; font-weight: 700; color: #667eea; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #f0f0f8; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .info-item { background: #f8f8ff; padding: 16px; border-radius: 8px; border-left: 3px solid #667eea; }
  .info-item .label { font-size: 11px; color: #888; text-transform: uppercase; }
  .info-item .value { font-size: 15px; font-weight: 600; margin-top: 4px; }
  .price-box { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 20px 0; }
  .price-box .amount { font-size: 36px; font-weight: 800; }
  .price-box .label { font-size: 13px; opacity: 0.85; margin-top: 4px; }
  .features { list-style: none; }
  .features li { padding: 8px 0; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #f0f0f8; font-size: 14px; }
  .features li::before { content: "✅"; }
  .footer { background: #f8f8ff; padding: 24px 40px; border-top: 1px solid #e8e8f0; display: flex; justify-content: space-between; align-items: center; }
  .footer .sender { font-weight: 600; font-size: 14px; }
  .footer .date { color: #888; font-size: 13px; }
</style>
</head>
<body>
<div class="header">
  <h1>Web Sitesi Teklifi</h1>
  <p>${p.businessName} için hazırlanmıştır</p>
  <div class="badge">📅 ${date}</div>
</div>
<div class="content">
  <div class="section">
    <h2>Firma Bilgileri</h2>
    <div class="info-grid">
      <div class="info-item"><div class="label">Firma</div><div class="value">${p.businessName}</div></div>
      ${p.siteUrl ? `<div class="info-item"><div class="label">Web Sitesi</div><div class="value">${p.siteUrl}</div></div>` : ""}
    </div>
  </div>
  ${p.price ? `
  <div class="section">
    <h2>Teklif Tutarı</h2>
    <div class="price-box">
      <div class="amount">${p.price}</div>
      <div class="label">Tek Seferlik Kurulum Ücreti</div>
    </div>
  </div>` : ""}
  <div class="section">
    <h2>Hizmet Kapsamı</h2>
    <ul class="features">
      <li>Profesyonel, mobil uyumlu web sitesi tasarımı</li>
      <li>SEO optimizasyonu ve hızlı yükleme süresi</li>
      <li>1 yıl ücretsiz hosting (Netlify)</li>
      <li>Özel domain bağlama desteği</li>
      <li>Google Analytics entegrasyonu</li>
      <li>30 gün ücretsiz teknik destek</li>
    </ul>
  </div>
  ${p.notes ? `<div class="section"><h2>Notlar</h2><p style="font-size:14px;line-height:1.7;color:#555">${p.notes}</p></div>` : ""}
</div>
<div class="footer">
  <div>
    <div class="sender">${p.senderName ?? ""}${p.senderCompany ? ` — ${p.senderCompany}` : ""}</div>
  </div>
  <div class="date">${date} tarihinde hazırlandı</div>
</div>
</body>
</html>`;

    const pdfCtx: ExecuteContext = { ...context, parameters: { html, filename: `teklif-${p.businessName}.pdf` } };
    return this.htmlToPdf(pdfCtx);
  }
}
