import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class MicrosoftEntraIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "microsoft-entra",
    name: "Microsoft Entra ID",
    description: "Microsoft Entra ID (Azure AD) ile kullanıcı ve grup yönetimi",
    icon: "microsoft",
    color: "#0078D4",
    category: "identity",
    authType: "oauth2",
    credentialFields: [
      { key: "tenantId", label: "Tenant ID", type: "string", required: true },
      { key: "clientId", label: "Client ID", type: "string", required: true },
      { key: "clientSecret", label: "Client Secret", type: "password", required: true },
    ],
    operations: [
      {
        id: "getUser",
        name: "Get User",
        description: "Kullanıcı bilgilerini getir",
        resource: "user",
        action: "get",
        inputSchema: [
          { key: "userId", label: "User ID or UPN", type: "string", required: true },
        ],
        outputSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            displayName: { type: "string" },
            mail: { type: "string" },
            jobTitle: { type: "string" },
            department: { type: "string" },
            manager: { type: "object" },
          },
        },
      },
      {
        id: "updateUser",
        name: "Update User",
        description: "Kullanıcı özelliklerini güncelle",
        resource: "user",
        action: "update",
        inputSchema: [
          { key: "userId", label: "User ID or UPN", type: "string", required: true },
          { key: "properties", label: "Properties (JSON)", type: "json", required: true, helpText: 'Örn: {"jobTitle":"Manager","department":"Engineering"}' },
        ],
      },
      {
        id: "addToGroup",
        name: "Add User to Group",
        description: "Kullanıcıyı gruba ekle",
        resource: "group",
        action: "addMember",
        inputSchema: [
          { key: "groupId", label: "Group ID", type: "string", required: true },
          { key: "userId", label: "User ID", type: "string", required: true },
        ],
      },
      {
        id: "checkManagerRole",
        name: "Check Manager Role",
        description: "Kullanıcının manager rolü olup olmadığını kontrol et",
        resource: "user",
        action: "checkRole",
        inputSchema: [
          { key: "userId", label: "User ID or UPN", type: "string", required: true },
        ],
        outputSchema: {
          type: "object",
          properties: {
            isManager: { type: "boolean" },
            directReports: { type: "number" },
          },
        },
      },
    ],
  };

  private async getAccessToken(credentials: Record<string, string>): Promise<string> {
    const { tenantId, clientId, clientSecret } = credentials;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
    });

    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }
    );

    if (!response.ok) throw new Error(`Token alınamadı: ${response.statusText}`);
    const data = await response.json() as any;
    return data.access_token;
  }

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    const { credentials, parameters } = context;
    const token = await this.getAccessToken(credentials);
    const headers = { Authorization: `Bearer ${token}` };

    switch (operationId) {
      case "getUser":
        return this.httpRequest({
          method: "GET",
          url: `https://graph.microsoft.com/v1.0/users/${parameters.userId}`,
          headers,
          params: { $select: "id,displayName,mail,jobTitle,department,userPrincipalName" },
        });

      case "updateUser":
        await this.httpRequest({
          method: "PATCH",
          url: `https://graph.microsoft.com/v1.0/users/${parameters.userId}`,
          headers,
          body: parameters.properties,
        });
        return { success: true };

      case "addToGroup": {
        const user = await this.httpRequest({
          method: "GET",
          url: `https://graph.microsoft.com/v1.0/users/${parameters.userId}`,
          headers,
        }) as any;
        await this.httpRequest({
          method: "POST",
          url: `https://graph.microsoft.com/v1.0/groups/${parameters.groupId}/members/$ref`,
          headers,
          body: { "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${user.id}` },
        });
        return { success: true };
      }

      case "checkManagerRole": {
        const reports = await this.httpRequest({
          method: "GET",
          url: `https://graph.microsoft.com/v1.0/users/${parameters.userId}/directReports`,
          headers,
        }) as any;
        const count = reports.value?.length ?? 0;
        return { isManager: count > 0, directReports: count };
      }

      default:
        throw new Error(`Microsoft Entra: bilinmeyen operasyon '${operationId}'`);
    }
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      await this.getAccessToken(credentials);
      return true;
    } catch {
      return false;
    }
  }
}
