import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class WebScraperIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "web-scraper",
    name: "Web Scraper & Screenshot",
    description: "Web sitesini ziyaret et, içeriği çek, ekran görüntüsü al ve görselleri indir",
    icon: "📸",
    category: "tools",
    authType: "none",
    credentialFields: [],
    operations: [
      {
        id: "scrapeWebsite",
        name: "Web Sitesini Tara",
        description: "URL'yi ziyaret et, metin içeriğini ve meta bilgilerini çek",
        parameters: [
          { key: "url", label: "Web Sitesi URL", type: "string", required: true },
          { key: "extractImages", label: "Görselleri Çıkar", type: "boolean", required: false },
        ],
      },
      {
        id: "takeScreenshot",
        name: "Ekran Görüntüsü Al",
        description: "Web sitesinin tam sayfa ekran görüntüsünü al (base64)",
        parameters: [
          { key: "url", label: "Web Sitesi URL", type: "string", required: true },
          { key: "fullPage", label: "Tam Sayfa", type: "boolean", required: false },
          { key: "width", label: "Genişlik (px)", type: "number", required: false, placeholder: "1280" },
          { key: "height", label: "Yükseklik (px)", type: "number", required: false, placeholder: "800" },
        ],
      },
      {
        id: "scrapeAndScreenshot",
        name: "Tara ve Fotoğraf Al",
        description: "Web sitesini hem tara hem ekran görüntüsü al (tam analiz)",
        parameters: [
          { key: "url", label: "Web Sitesi URL", type: "string", required: true },
        ],
      },
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    const p = context.parameters;
    const url = String(p.url ?? "");

    if (!url.startsWith("http")) {
      throw new Error("Geçerli bir URL girin (http:// veya https:// ile başlamalı)");
    }

    if (operationId === "scrapeWebsite") {
      return this.scrapeWebsite(url, Boolean(p.extractImages));
    }
    if (operationId === "takeScreenshot") {
      return this.takeScreenshot(url, {
        fullPage: Boolean(p.fullPage ?? true),
        width: Number(p.width ?? 1280),
        height: Number(p.height ?? 800),
      });
    }
    if (operationId === "scrapeAndScreenshot") {
      const [scraped, screenshot] = await Promise.allSettled([
        this.scrapeWebsite(url, true),
        this.takeScreenshot(url, { fullPage: true, width: 1280, height: 800 }),
      ]);
      return {
        scraped: scraped.status === "fulfilled" ? scraped.value : { error: (scraped as any).reason?.message },
        screenshot: screenshot.status === "fulfilled" ? screenshot.value : { error: (screenshot as any).reason?.message },
      };
    }

    throw new Error(`Bilinmeyen operasyon: ${operationId}`);
  }

  private async scrapeWebsite(url: string, extractImages: boolean) {
    // Puppeteer dynamic import — opsiyonel bağımlılık
    let puppeteer: any;
    try {
      puppeteer = await import("puppeteer");
    } catch {
      throw new Error("puppeteer paketi kurulu değil. API sunucusunda: pnpm --filter api add puppeteer");
    }

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      const data = await page.evaluate((extractImgs: boolean) => {
        const title = document.title;
        const description = (document.querySelector('meta[name="description"]') as any)?.content ?? "";
        const keywords = (document.querySelector('meta[name="keywords"]') as any)?.content ?? "";

        // Ana metin içeriği
        const bodyText = document.body?.innerText
          ?.replace(/\s+/g, " ")
          ?.trim()
          ?.slice(0, 5000) ?? "";

        // Başlıklar
        const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
          .map((el) => ({ tag: el.tagName, text: el.textContent?.trim() ?? "" }))
          .slice(0, 20);

        // İletişim bilgisi arama
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const phoneRegex = /(\+?[\d\s\-().]{7,15})/g;
        const emails = [...new Set(bodyText.match(emailRegex) ?? [])].slice(0, 5);

        // Görseller
        const images = extractImgs
          ? Array.from(document.querySelectorAll("img"))
              .map((img) => ({ src: img.src, alt: img.alt }))
              .filter((img) => img.src && img.src.startsWith("http"))
              .slice(0, 20)
          : [];

        // Renkler (CSS variables veya bg renkleri)
        const bodyStyle = window.getComputedStyle(document.body);
        const primaryColor = bodyStyle.backgroundColor;

        return { title, description, keywords, bodyText, headings, emails, images, primaryColor };
      }, extractImages);

      return {
        url,
        ...data,
        scrapedAt: new Date().toISOString(),
      };
    } finally {
      await browser.close();
    }
  }

  private async takeScreenshot(url: string, options: { fullPage: boolean; width: number; height: number }) {
    let puppeteer: any;
    try {
      puppeteer = await import("puppeteer");
    } catch {
      throw new Error("puppeteer paketi kurulu değil.");
    }

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: options.width, height: options.height });
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      const screenshot = await page.screenshot({
        fullPage: options.fullPage,
        type: "jpeg",
        quality: 85,
        encoding: "base64",
      });

      return {
        url,
        screenshot: `data:image/jpeg;base64,${screenshot}`,
        width: options.width,
        height: options.height,
        takenAt: new Date().toISOString(),
      };
    } finally {
      await browser.close();
    }
  }
}
