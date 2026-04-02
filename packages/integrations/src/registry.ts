import { BaseIntegration } from "./base/BaseIntegration";
import { SlackIntegration } from "./catalog/slack";
import { JiraIntegration } from "./catalog/jira";
import { MicrosoftEntraIntegration } from "./catalog/microsoft-entra";
import { PostgreSQLIntegration } from "./catalog/postgresql";
import { AnthropicIntegration } from "./catalog/anthropic";
import { WebhookIntegration } from "./catalog/webhook";
import { GooglePlacesIntegration } from "./catalog/google-places";
import { WebScraperIntegration } from "./catalog/web-scraper";
import { WebsiteBuilderIntegration } from "./catalog/website-builder";
import { NetlifyIntegration } from "./catalog/netlify";
import { EmailIntegration } from "./catalog/email";
import { GoogleSheetsIntegration } from "./catalog/google-sheets";
import { WhatsAppIntegration } from "./catalog/whatsapp";
import { PdfGeneratorIntegration } from "./catalog/pdf-generator";
import { LeadScorerIntegration } from "./catalog/lead-scorer";

const integrations: BaseIntegration[] = [
  new SlackIntegration(),
  new JiraIntegration(),
  new MicrosoftEntraIntegration(),
  new PostgreSQLIntegration(),
  new AnthropicIntegration(),
  new WebhookIntegration(),
  new GooglePlacesIntegration(),
  new WebScraperIntegration(),
  new WebsiteBuilderIntegration(),
  new NetlifyIntegration(),
  new EmailIntegration(),
  new GoogleSheetsIntegration(),
  new WhatsAppIntegration(),
  new PdfGeneratorIntegration(),
  new LeadScorerIntegration(),
];

const registry = new Map<string, BaseIntegration>(
  integrations.map((i) => [i.definition.id, i])
);

export function getIntegration(id: string): BaseIntegration {
  const integration = registry.get(id);
  if (!integration) throw new Error(`Entegrasyon bulunamadı: '${id}'`);
  return integration;
}

export function getAllIntegrations(): BaseIntegration[] {
  return integrations;
}

export { registry };

// API uyumlu adapter (integrationRegistry.get / getAll interface)
export const integrationRegistry = {
  get(id: string): BaseIntegration {
    return getIntegration(id);
  },
  getAll(): Array<ReturnType<typeof getIntegration>["definition"]> {
    return integrations.map((i) => i.definition);
  },
};
