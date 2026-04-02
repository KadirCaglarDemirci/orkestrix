import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class EmailIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "email",
    name: "Email (SMTP)",
    description: "SMTP ile email gönder — Gmail, Yandex, Outlook veya özel SMTP",
    icon: "📧",
    category: "communication",
    authType: "credentials",
    credentialFields: [
      { key: "host", label: "SMTP Sunucu", type: "string", required: true, placeholder: "smtp.gmail.com" },
      { key: "port", label: "Port", type: "string", required: true, placeholder: "587" },
      { key: "user", label: "Kullanıcı Adı / Email", type: "string", required: true },
      { key: "pass", label: "Şifre / App Password", type: "password", required: true,
        helpText: "Gmail için: Google Hesabı → Güvenlik → Uygulama Şifreleri" },
      { key: "fromName", label: "Gönderen Adı", type: "string", required: false, placeholder: "Şirket Adınız" },
    ],
    operations: [
      {
        id: "sendEmail",
        name: "Email Gönder",
        description: "Tek bir alıcıya email gönder",
        parameters: [
          { key: "to", label: "Alıcı Email", type: "string", required: true },
          { key: "subject", label: "Konu", type: "string", required: true },
          { key: "body", label: "Mesaj İçeriği", type: "textarea", required: true },
          { key: "isHtml", label: "HTML Format", type: "boolean", required: false },
          { key: "attachmentUrl", label: "Ek Dosya URL", type: "string", required: false },
        ],
      },
      {
        id: "sendBulk",
        name: "Toplu Email Gönder",
        description: "Birden fazla firmaya kişiselleştirilmiş email gönder",
        parameters: [
          { key: "recipients", label: "Alıcı Listesi (JSON)", type: "json", required: true,
            placeholder: '[{"email":"a@b.com","businessName":"Firma A","siteUrl":"https://..."}]' },
          { key: "subject", label: "Email Konusu", type: "string", required: true },
          { key: "bodyTemplate", label: "Email Şablonu", type: "textarea", required: true,
            placeholder: "Sayın {{businessName}}, siteniz hazır: {{siteUrl}}" },
          { key: "delayMs", label: "Gönderiler Arası Bekleme (ms)", type: "number", required: false,
            placeholder: "2000" },
        ],
      },
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    if (operationId === "sendEmail") {
      return this.sendEmail(context);
    }
    if (operationId === "sendBulk") {
      return this.sendBulk(context);
    }
    throw new Error(`Bilinmeyen operasyon: ${operationId}`);
  }

  private async sendEmail(context: ExecuteContext): Promise<unknown> {
    const nodemailer = await this.getNodemailer();
    const { host, port, user, pass, fromName } = context.credentials;
    const p = context.parameters;

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port ?? "587", 10),
      secure: parseInt(port ?? "587", 10) === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    const from = fromName ? `"${fromName}" <${user}>` : user;
    const isHtml = Boolean(p.isHtml);

    const mailOptions: any = {
      from,
      to: String(p.to),
      subject: String(p.subject),
      [isHtml ? "html" : "text"]: String(p.body),
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      messageId: info.messageId,
      to: p.to,
      subject: p.subject,
      sentAt: new Date().toISOString(),
      accepted: info.accepted,
    };
  }

  private async sendBulk(context: ExecuteContext): Promise<unknown> {
    const nodemailer = await this.getNodemailer();
    const { host, port, user, pass, fromName } = context.credentials;
    const p = context.parameters;

    const recipients = typeof p.recipients === "string"
      ? JSON.parse(p.recipients)
      : p.recipients as any[];

    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("recipients boş veya geçersiz");
    }

    const delayMs = Number(p.delayMs ?? 2000);
    const template = String(p.bodyTemplate ?? "");
    const subject = String(p.subject ?? "");

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port ?? "587", 10),
      secure: parseInt(port ?? "587", 10) === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    const from = fromName ? `"${fromName}" <${user}>` : user;
    const results: any[] = [];

    for (const recipient of recipients) {
      if (!recipient.email) { results.push({ ...recipient, status: "skip", reason: "email yok" }); continue; }

      // Şablonu kişiselleştir
      const personalizedBody = Object.entries(recipient).reduce(
        (body, [key, val]) => body.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(val ?? "")),
        template
      );

      try {
        const info = await transporter.sendMail({
          from,
          to: recipient.email,
          subject: subject.replace(/\{\{businessName\}\}/g, recipient.businessName ?? ""),
          text: personalizedBody,
        });

        results.push({ email: recipient.email, businessName: recipient.businessName, status: "sent", messageId: info.messageId });
      } catch (err: any) {
        results.push({ email: recipient.email, businessName: recipient.businessName, status: "failed", error: err.message });
      }

      if (delayMs > 0 && recipients.indexOf(recipient) < recipients.length - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return {
      total: recipients.length,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
      results,
    };
  }

  private async getNodemailer() {
    try {
      return (await import("nodemailer")).default;
    } catch {
      throw new Error("nodemailer paketi kurulu değil. API sunucusunda: pnpm --filter api add nodemailer");
    }
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const nodemailer = await this.getNodemailer();
      const transporter = nodemailer.createTransport({
        host: credentials.host,
        port: parseInt(credentials.port ?? "587", 10),
        secure: parseInt(credentials.port ?? "587", 10) === 465,
        auth: { user: credentials.user, pass: credentials.pass },
        tls: { rejectUnauthorized: false },
      });
      await transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
