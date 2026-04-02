import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class LeadScorerIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "lead-scorer",
    name: "Teklif Skoru (AI)",
    description: "Firma verilerini AI ile analiz et, 1-10 arası potansiyel puanı ver, düşük puanlıları filtrele",
    icon: "🎯",
    category: "ai",
    authType: "apiKey",
    credentialFields: [
      { key: "apiKey", label: "Anthropic API Key", type: "password", required: true },
    ],
    operations: [
      { id: "scoreLead", name: "Firma Puanla", description: "Tek bir firmayı AI ile puanla",
        parameters: [
          { key: "businessData", label: "Firma Verisi (JSON)", type: "json", required: true },
          { key: "minScore", label: "Minimum Puan (filtrele)", type: "number", required: false,
            placeholder: "6 (altındakileri geç)" },
          { key: "criteria", label: "Puanlama Kriterleri", type: "textarea", required: false,
            placeholder: "Web sitesi kalitesi, sektör, konum, yorum sayısı..." },
        ]},
      { id: "scoreBatch", name: "Toplu Puanla", description: "Firma listesini puanla ve sırala",
        parameters: [
          { key: "businesses", label: "Firma Listesi (JSON dizi)", type: "json", required: true },
          { key: "minScore", label: "Minimum Puan", type: "number", required: false, placeholder: "6" },
          { key: "sortByScore", label: "Puana Göre Sırala", type: "boolean", required: false },
          { key: "criteria", label: "Puanlama Kriterleri", type: "textarea", required: false },
        ]},
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    if (operationId === "scoreLead") return this.scoreLead(context);
    if (operationId === "scoreBatch") return this.scoreBatch(context);
    throw new Error(`Bilinmeyen operasyon: ${operationId}`);
  }

  private async scoreLead(context: ExecuteContext): Promise<unknown> {
    const { apiKey } = context.credentials;
    const p = context.parameters;
    const businessData = typeof p.businessData === "string"
      ? JSON.parse(p.businessData) : p.businessData;
    const minScore = Number(p.minScore ?? 0);

    const score = await this.getScore(apiKey, businessData, String(p.criteria ?? ""));

    if (minScore > 0 && score.score < minScore) {
      return { ...score, filtered: true, reason: `Puan ${score.score} < minimum ${minScore}` };
    }

    return { ...score, filtered: false, businessData };
  }

  private async scoreBatch(context: ExecuteContext): Promise<unknown> {
    const { apiKey } = context.credentials;
    const p = context.parameters;
    const businesses = typeof p.businesses === "string"
      ? JSON.parse(p.businesses) : (p.businesses as any[]);
    const minScore = Number(p.minScore ?? 0);
    const criteria = String(p.criteria ?? "");

    const scored = await Promise.all(
      businesses.map(async (b: any) => {
        try {
          const score = await this.getScore(apiKey, b, criteria);
          return { ...b, ...score, filtered: minScore > 0 && score.score < minScore };
        } catch {
          return { ...b, score: 0, filtered: true, reason: "Puanlama hatası" };
        }
      })
    );

    const passed = scored.filter((b) => !b.filtered);
    const filtered = scored.filter((b) => b.filtered);

    if (p.sortByScore) passed.sort((a, b) => b.score - a.score);

    return { total: businesses.length, passed: passed.length, filteredOut: filtered.length, businesses: passed, allScored: scored };
  }

  private async getScore(apiKey: string, business: any, criteria: string): Promise<{ score: number; reasoning: string; strengths: string[]; weaknesses: string[] }> {
    const prompt = `Aşağıdaki firma için web sitesi yapım teklifi potansiyelini değerlendir.

FİRMA VERİSİ:
${JSON.stringify(business, null, 2)}

${criteria ? `PUANLAMA KRİTERLERİ:\n${criteria}` : ""}

Değerlendirme kriterleri:
- Web sitesi kalitesi (yoksa veya eski ise yüksek puan)
- Sektörün dijital pazarlamaya uygunluğu
- Firma büyüklüğü ve yorum sayısı
- Google puanı ve aktivitesi
- Coğrafi konum (büyükşehir ise yüksek)

Yanıtını SADECE şu JSON formatında ver (başka hiçbir şey yazma):
{
  "score": 7,
  "reasoning": "Kısa açıklama",
  "strengths": ["güçlü yan 1", "güçlü yan 2"],
  "weaknesses": ["zayıf yan 1"]
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json() as any;
    const text = data.content?.[0]?.text ?? '{"score":5,"reasoning":"Veri yetersiz","strengths":[],"weaknesses":[]}';

    try {
      const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      return JSON.parse(clean);
    } catch {
      return { score: 5, reasoning: text.slice(0, 200), strengths: [], weaknesses: [] };
    }
  }
}
