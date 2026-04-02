import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class JiraIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "jira",
    name: "Jira Software",
    description: "Atlassian Jira ile proje yönetimi entegrasyonu",
    icon: "jira",
    color: "#0052CC",
    category: "project-management",
    authType: "basic_auth",
    credentialFields: [
      { key: "domain", label: "Domain", type: "url", required: true, placeholder: "https://yourcompany.atlassian.net" },
      { key: "email", label: "Email", type: "text", required: true },
      { key: "apiToken", label: "API Token", type: "password", required: true },
    ],
    operations: [
      {
        id: "createUser",
        name: "Create User",
        description: "Jira'da yeni kullanıcı oluştur",
        resource: "user",
        action: "create",
        inputSchema: [
          { key: "emailAddress", label: "Email", type: "string", required: true },
          { key: "displayName", label: "Display Name", type: "string", required: true },
          { key: "products", label: "Products", type: "multiselect", required: false, options: [
            { value: "jira-software", label: "Jira Software" },
            { value: "confluence", label: "Confluence" },
          ]},
        ],
      },
      {
        id: "getUser",
        name: "Get User",
        description: "Kullanıcı bilgilerini getir",
        resource: "user",
        action: "get",
        inputSchema: [
          { key: "accountId", label: "Account ID", type: "string", required: true },
        ],
      },
      {
        id: "getAllUsers",
        name: "Get All Users",
        description: "Tüm kullanıcıları listele",
        resource: "user",
        action: "getAll",
        inputSchema: [
          { key: "maxResults", label: "Max Results", type: "number", required: false, default: 50 },
        ],
      },
      {
        id: "createIssue",
        name: "Create Issue",
        description: "Yeni issue oluştur",
        resource: "issue",
        action: "create",
        inputSchema: [
          { key: "projectKey", label: "Project Key", type: "string", required: true, placeholder: "PROJ" },
          { key: "summary", label: "Summary", type: "string", required: true },
          { key: "issueType", label: "Issue Type", type: "select", required: true, options: [
            { value: "Bug", label: "Bug" },
            { value: "Task", label: "Task" },
            { value: "Story", label: "Story" },
          ]},
          { key: "description", label: "Description", type: "string", required: false },
        ],
      },
    ],
  };

  private getAuthHeader(credentials: Record<string, string>): string {
    const token = Buffer.from(`${credentials.email}:${credentials.apiToken}`).toString("base64");
    return `Basic ${token}`;
  }

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    const { credentials, parameters } = context;
    const baseUrl = credentials.domain.replace(/\/$/, "");
    const headers = {
      Authorization: this.getAuthHeader(credentials),
      Accept: "application/json",
    };

    switch (operationId) {
      case "createUser":
        return this.httpRequest({
          method: "POST",
          url: `${baseUrl}/rest/api/3/user`,
          headers,
          body: {
            emailAddress: parameters.emailAddress,
            displayName: parameters.displayName,
            products: parameters.products ?? [],
          },
        });

      case "getUser":
        return this.httpRequest({
          method: "GET",
          url: `${baseUrl}/rest/api/3/user`,
          headers,
          params: { accountId: String(parameters.accountId) },
        });

      case "getAllUsers":
        return this.httpRequest({
          method: "GET",
          url: `${baseUrl}/rest/api/3/users`,
          headers,
          params: { maxResults: String(parameters.maxResults ?? 50) },
        });

      case "createIssue":
        return this.httpRequest({
          method: "POST",
          url: `${baseUrl}/rest/api/3/issue`,
          headers,
          body: {
            fields: {
              project: { key: parameters.projectKey },
              summary: parameters.summary,
              issuetype: { name: parameters.issueType },
              description: parameters.description ? {
                type: "doc",
                version: 1,
                content: [{ type: "paragraph", content: [{ type: "text", text: parameters.description }] }],
              } : undefined,
            },
          },
        });

      default:
        throw new Error(`Jira: bilinmeyen operasyon '${operationId}'`);
    }
  }
}
