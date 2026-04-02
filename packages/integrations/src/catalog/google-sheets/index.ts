import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class GoogleSheetsIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "google-sheets",
    name: "Google Sheets",
    description: "Spreadsheet'ten satır oku, yaz, firma listesini yönet",
    icon: "📊",
    category: "data",
    authType: "apiKey",
    credentialFields: [
      { key: "serviceAccountJson", label: "Service Account JSON", type: "textarea", required: true,
        helpText: "Google Cloud Console → IAM → Service Accounts → JSON key oluştur" },
    ],
    operations: [
      { id: "readRows", name: "Satırları Oku", description: "Tüm satırları veya belirli aralığı oku",
        parameters: [
          { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true,
            helpText: "URL'deki /d/ ile /edit arasındaki kısım" },
          { key: "range", label: "Aralık", type: "string", required: false, placeholder: "Sheet1!A1:Z100" },
          { key: "firstRowAsHeader", label: "İlk Satır Başlık", type: "boolean", required: false },
        ]},
      { id: "appendRow", name: "Satır Ekle", description: "Sona yeni satır ekle",
        parameters: [
          { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
          { key: "range", label: "Sayfa Adı", type: "string", required: false, placeholder: "Sheet1" },
          { key: "values", label: "Değerler (JSON dizi)", type: "json", required: true,
            placeholder: '["Firma Adı", "site.com", "5"]' },
        ]},
      { id: "updateRow", name: "Satır Güncelle", description: "Belirli satırı güncelle",
        parameters: [
          { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
          { key: "range", label: "Hücre Aralığı", type: "string", required: true, placeholder: "Sheet1!A2:E2" },
          { key: "values", label: "Değerler (JSON dizi)", type: "json", required: true },
        ]},
      { id: "clearSheet", name: "Sayfayı Temizle", description: "Belirli aralıktaki verileri sil",
        parameters: [
          { key: "spreadsheetId", label: "Spreadsheet ID", type: "string", required: true },
          { key: "range", label: "Aralık", type: "string", required: false, placeholder: "Sheet1" },
        ]},
    ],
  };

  private async getAuthHeaders(serviceAccountJson: string): Promise<Record<string, string>> {
    const sa = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    // JWT oluştur (RS256) — dinamik import ile jsonwebtoken
    let jwt: any;
    try { jwt = await import("jsonwebtoken"); } catch {
      throw new Error("jsonwebtoken kurulu değil: pnpm --filter api add jsonwebtoken");
    }

    const token = jwt.default.sign(payload, sa.private_key, { algorithm: "RS256" });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: token,
      }),
    });

    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) throw new Error(`Google auth hatası: ${JSON.stringify(tokenData)}`);
    return { Authorization: `Bearer ${tokenData.access_token}` };
  }

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    const headers = await this.getAuthHeaders(context.credentials.serviceAccountJson);
    const p = context.parameters;
    const spreadsheetId = String(p.spreadsheetId);
    const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

    if (operationId === "readRows") {
      const range = String(p.range ?? "Sheet1");
      const res = await fetch(`${base}/values/${encodeURIComponent(range)}`, { headers });
      const data = await res.json() as any;
      const rows: string[][] = data.values ?? [];
      if (!p.firstRowAsHeader || rows.length === 0) return { rows, total: rows.length };
      const [header, ...body] = rows;
      const objects = body.map((row) =>
        Object.fromEntries(header.map((h, i) => [h, row[i] ?? ""]))
      );
      return { rows: objects, headers: header, total: objects.length };
    }

    if (operationId === "appendRow") {
      const range = String(p.range ?? "Sheet1");
      const values = Array.isArray(p.values) ? [p.values] : [[p.values]];
      const res = await fetch(
        `${base}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
        { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ values }) }
      );
      return res.json();
    }

    if (operationId === "updateRow") {
      const range = String(p.range);
      const values = Array.isArray(p.values) ? [p.values] : [[p.values]];
      const res = await fetch(
        `${base}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        { method: "PUT", headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ values }) }
      );
      return res.json();
    }

    if (operationId === "clearSheet") {
      const range = String(p.range ?? "Sheet1");
      const res = await fetch(`${base}/values/${encodeURIComponent(range)}:clear`,
        { method: "POST", headers });
      return res.json();
    }

    throw new Error(`Bilinmeyen operasyon: ${operationId}`);
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try { await this.getAuthHeaders(credentials.serviceAccountJson); return true; }
    catch { return false; }
  }
}
