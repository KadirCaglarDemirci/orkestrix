import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class WhatsAppIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "whatsapp",
    name: "WhatsApp (Twilio)",
    description: "Twilio API ile WhatsApp mesajı gönder",
    icon: "💬",
    category: "communication",
    authType: "credentials",
    credentialFields: [
      { key: "accountSid", label: "Twilio Account SID", type: "string", required: true },
      { key: "authToken", label: "Twilio Auth Token", type: "password", required: true },
      { key: "fromNumber", label: "Twilio WhatsApp No", type: "string", required: true,
        placeholder: "whatsapp:+14155238886",
        helpText: "Twilio sandbox: whatsapp:+14155238886" },
    ],
    operations: [
      { id: "sendMessage", name: "Mesaj Gönder", description: "WhatsApp mesajı gönder",
        parameters: [
          { key: "to", label: "Alıcı Numara", type: "string", required: true,
            placeholder: "+905551234567" },
          { key: "message", label: "Mesaj", type: "textarea", required: true },
        ]},
      { id: "sendTemplate", name: "Şablon Mesajı Gönder", description: "Onaylı WhatsApp şablonu gönder",
        parameters: [
          { key: "to", label: "Alıcı Numara", type: "string", required: true },
          { key: "templateName", label: "Şablon Adı", type: "string", required: true },
          { key: "variables", label: "Değişkenler (JSON)", type: "json", required: false,
            placeholder: '{"1": "Firma Adı", "2": "https://site.netlify.app"}' },
        ]},
      { id: "sendBulk", name: "Toplu Mesaj Gönder", description: "Birden fazla numaraya mesaj gönder",
        parameters: [
          { key: "recipients", label: "Alıcı Listesi (JSON)", type: "json", required: true,
            placeholder: '[{"phone": "+905551234567", "name": "Ahmet"}]' },
          { key: "messageTemplate", label: "Mesaj Şablonu", type: "textarea", required: true,
            placeholder: "Merhaba {{name}}, siteniz hazır: {{siteUrl}}" },
          { key: "delayMs", label: "Gönderiler Arası Bekleme (ms)", type: "number", required: false,
            placeholder: "3000" },
        ]},
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    const { accountSid, authToken, fromNumber } = context.credentials;
    const p = context.parameters;
    const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    if (operationId === "sendMessage") {
      const to = String(p.to).startsWith("whatsapp:") ? String(p.to) : `whatsapp:${p.to}`;
      return this.sendSingle(url, authHeader, fromNumber, to, String(p.message));
    }

    if (operationId === "sendTemplate") {
      const to = String(p.to).startsWith("whatsapp:") ? String(p.to) : `whatsapp:${p.to}`;
      const vars = typeof p.variables === "string" ? JSON.parse(p.variables) : (p.variables ?? {});
      let message = String(p.templateName);
      Object.entries(vars).forEach(([k, v]) => {
        message = message.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      });
      return this.sendSingle(url, authHeader, fromNumber, to, message);
    }

    if (operationId === "sendBulk") {
      const recipients = typeof p.recipients === "string"
        ? JSON.parse(p.recipients) : p.recipients as any[];
      const template = String(p.messageTemplate ?? "");
      const delayMs = Number(p.delayMs ?? 3000);
      const results: any[] = [];

      for (const r of recipients) {
        if (!r.phone) { results.push({ ...r, status: "skip" }); continue; }
        const to = r.phone.startsWith("whatsapp:") ? r.phone : `whatsapp:${r.phone}`;
        const msg = Object.entries(r).reduce(
          (m, [k, v]) => m.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v ?? "")),
          template
        );
        try {
          const res = await this.sendSingle(url, authHeader, fromNumber, to, msg) as any;
          results.push({ phone: r.phone, status: "sent", sid: res.sid });
        } catch (err: any) {
          results.push({ phone: r.phone, status: "failed", error: err.message });
        }
        if (delayMs > 0 && recipients.indexOf(r) < recipients.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      return { total: recipients.length, sent: results.filter((r) => r.status === "sent").length, results };
    }

    throw new Error(`Bilinmeyen operasyon: ${operationId}`);
  }

  private async sendSingle(url: string, auth: string, from: string, to: string, body: string) {
    const from_ = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: from_, To: to, Body: body }),
    });
    const data = await res.json() as any;
    if (data.code && data.code >= 20000) throw new Error(`Twilio hatası: ${data.message}`);
    return { sid: data.sid, status: data.status, to: data.to };
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const auth = "Basic " + Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString("base64");
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}.json`,
        { headers: { Authorization: auth } }
      );
      return res.ok;
    } catch { return false; }
  }
}
