import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

const DEFAULT_EMAIL_TEMPLATE = `Sayın {{businessName}} Yetkilisi,

Firmanızı Google Haritalar üzerinden inceledik ve dijital varlığınızı güçlendirmek amacıyla
özel olarak hazırladığımız premium web sitenizi sizinle paylaşmak istedik.

🌐 Web Siteniz: {{siteUrl}}

Siteniz, firmanızın kimliğini ve hizmetlerini yansıtacak şekilde profesyonelce hazırlanmıştır.

Özellikler:
✅ Mobil uyumlu tasarım
✅ Hızlı yükleme süresi
✅ SEO optimizasyonu
✅ Modern ve şık görünüm

Siteyi incelemenizi ve geri bildirimlerinizi bizimle paylaşmanızı bekliyoruz.

Saygılarımızla,
{{senderName}}
{{senderEmail}}
{{senderPhone}}`;

export class WebsiteBuilderIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "website-builder",
    name: "AI Website Builder",
    description: "Firma bilgileri ve görselleri kullanarak Anthropic AI ile premium HTML site üret",
    icon: "🏗️",
    category: "ai",
    authType: "apiKey",
    credentialFields: [
      {
        key: "apiKey",
        label: "Anthropic API Key",
        type: "password",
        required: true,
        helpText: "console.anthropic.com → API Keys",
      },
    ],
    operations: [
      {
        id: "buildWebsite",
        name: "Web Sitesi Oluştur",
        description: "Firma verileri ile AI destekli premium HTML/CSS site üret",
        parameters: [
          { key: "businessName", label: "Firma Adı", type: "string", required: true },
          { key: "businessData", label: "Firma Verisi (JSON)", type: "json", required: false },
          { key: "scrapedData", label: "Kazınan Site Verisi (JSON)", type: "json", required: false },
          { key: "screenshotUrl", label: "Ekran Görüntüsü (base64/URL)", type: "string", required: false },
          { key: "style", label: "Stil", type: "select", required: false,
            options: ["modern", "minimal", "corporate", "creative", "luxury"],
          },
          { key: "language", label: "Dil", type: "select", required: false,
            options: ["tr", "en"],
          },
        ],
      },
      {
        id: "generateEmailContent",
        name: "Email İçeriği Oluştur",
        description: "Firma için kişiselleştirilmiş satış emaili yaz",
        parameters: [
          { key: "businessName", label: "Firma Adı", type: "string", required: true },
          { key: "siteUrl", label: "Yayınlanan Site URL", type: "string", required: true },
          { key: "senderName", label: "Gönderen Ad", type: "string", required: false },
          { key: "senderEmail", label: "Gönderen Email", type: "string", required: false },
          { key: "senderPhone", label: "Gönderen Telefon", type: "string", required: false },
          { key: "customTemplate", label: "Özel Şablon", type: "textarea", required: false,
            placeholder: DEFAULT_EMAIL_TEMPLATE },
        ],
      },
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    if (operationId === "buildWebsite") {
      return this.buildWebsite(context);
    }
    if (operationId === "generateEmailContent") {
      return this.generateEmailContent(context);
    }
    throw new Error(`Bilinmeyen operasyon: ${operationId}`);
  }

  private async buildWebsite(context: ExecuteContext): Promise<unknown> {
    const { apiKey } = context.credentials;
    const p = context.parameters;

    const businessName = String(p.businessName ?? "");
    const style = String(p.style ?? "modern");
    const language = String(p.language ?? "tr");

    let businessInfo = "";
    if (p.businessData) {
      const bd = typeof p.businessData === "string" ? JSON.parse(p.businessData) : p.businessData as any;
      businessInfo += `\nFirma: ${bd.name ?? businessName}`;
      if (bd.address) businessInfo += `\nAdres: ${bd.address}`;
      if (bd.phone) businessInfo += `\nTelefon: ${bd.phone}`;
      if (bd.website) businessInfo += `\nMevcut Site: ${bd.website}`;
      if (bd.rating) businessInfo += `\nGoogle Puanı: ${bd.rating} (${bd.reviewCount ?? 0} yorum)`;
      if (bd.types?.length) businessInfo += `\nSektör: ${bd.types.slice(0, 3).join(", ")}`;
      if (bd.photoUrls?.length) businessInfo += `\nFirma Fotoğrafları: ${bd.photoUrls.slice(0, 3).join(", ")}`;
    }

    let siteContent = "";
    if (p.scrapedData) {
      const sd = typeof p.scrapedData === "string" ? JSON.parse(p.scrapedData) : p.scrapedData as any;
      if (sd.title) siteContent += `\nMevcut Site Başlığı: ${sd.title}`;
      if (sd.description) siteContent += `\nMeta Açıklama: ${sd.description}`;
      if (sd.bodyText) siteContent += `\nSite İçeriği: ${sd.bodyText.slice(0, 2000)}`;
      if (sd.headings?.length) siteContent += `\nBaşlıklar: ${sd.headings.map((h: any) => h.text).join(" | ")}`;
    }

    const prompt = `Sen premium web tasarımcısısın. Aşağıdaki firma için tek dosyalık, yayına hazır, ${language === "tr" ? "Türkçe" : "İngilizce"} bir HTML/CSS/JS web sitesi oluştur.

FİRMA BİLGİLERİ:
${businessInfo || `Firma Adı: ${businessName}`}

MEVCUT SİTE İÇERİĞİ:
${siteContent || "Bilgi yok"}

TASARIM İSTEKLERİ:
- Stil: ${style}
- Dil: ${language === "tr" ? "Türkçe" : "İngilizce"}
- Tek HTML dosyası (inline CSS ve JS)
- Mobile-first, responsive tasarım
- Hero section (firma adı, slogan, CTA butonu)
- Hizmetler/Ürünler bölümü
- Hakkımızda bölümü
- İletişim bölümü (telefon, adres, Google Maps embed)
- Modern renk paleti
- Google Fonts kullan
- Tailwind CDN kullan
- Animasyonlar (scroll reveal, hover effects)
- SEO meta tagları
- Favicon
${style === "luxury" ? "- Altın/koyu renk paleti, serif fontlar" : ""}
${style === "minimal" ? "- Beyaz ağırlıklı, bol boşluk, sans-serif" : ""}
${style === "corporate" ? "- Mavi/gri, profesyonel, güven veren" : ""}
${style === "creative" ? "- Renkli gradientler, bold tipografi" : ""}

ÖNEMLI: Sadece HTML kodu döndür, başka açıklama yazma. <!DOCTYPE html> ile başla, </html> ile bitir.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API hatası: ${err}`);
    }

    const result = await response.json() as any;
    const htmlContent = result.content?.[0]?.text ?? "";

    // HTML'i temizle (bazen ```html ... ``` ile sarıyor)
    const cleanHtml = htmlContent
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return {
      businessName,
      html: cleanHtml,
      htmlSize: cleanHtml.length,
      style,
      generatedAt: new Date().toISOString(),
    };
  }

  private async generateEmailContent(context: ExecuteContext): Promise<unknown> {
    const p = context.parameters;
    const template = String(p.customTemplate ?? DEFAULT_EMAIL_TEMPLATE);

    const filled = template
      .replace(/\{\{businessName\}\}/g, String(p.businessName ?? ""))
      .replace(/\{\{siteUrl\}\}/g, String(p.siteUrl ?? ""))
      .replace(/\{\{senderName\}\}/g, String(p.senderName ?? ""))
      .replace(/\{\{senderEmail\}\}/g, String(p.senderEmail ?? ""))
      .replace(/\{\{senderPhone\}\}/g, String(p.senderPhone ?? ""));

    const subject = `${p.businessName} — Web Siteniz Hazır! 🚀`;

    return {
      to: null, // email entegrasyonu dolduracak
      subject,
      body: filled,
      businessName: p.businessName,
    };
  }
}
