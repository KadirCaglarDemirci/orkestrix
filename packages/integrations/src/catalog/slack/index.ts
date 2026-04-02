import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class SlackIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "slack",
    name: "Slack",
    description: "Slack mesajlaşma platformu ile entegrasyon",
    icon: "slack",
    color: "#4A154B",
    category: "communication",
    authType: "bearer_token",
    credentialFields: [
      {
        key: "botToken",
        label: "Bot Token",
        type: "password",
        required: true,
        placeholder: "xoxb-...",
        helpText: "Slack App ayarlarından Bot User OAuth Token",
      },
    ],
    operations: [
      {
        id: "addToChannel",
        name: "Add to Channel",
        description: "Kullanıcıyı bir kanala ekle",
        resource: "channel",
        action: "invite",
        inputSchema: [
          { key: "channelId", label: "Channel", type: "select", required: true, loadOptionsMethod: "getChannels" },
          { key: "userId", label: "User ID", type: "string", required: true },
        ],
        outputSchema: {
          type: "object",
          properties: {
            ok: { type: "boolean", description: "İşlem başarılı mı?" },
          },
        },
      },
      {
        id: "sendMessage",
        name: "Send Message",
        description: "Kanala veya kullanıcıya mesaj gönder",
        resource: "message",
        action: "send",
        inputSchema: [
          { key: "channelId", label: "Channel", type: "select", required: true, loadOptionsMethod: "getChannels" },
          { key: "text", label: "Message", type: "string", required: true },
        ],
      },
      {
        id: "updateProfile",
        name: "Update Profile",
        description: "Kullanıcı profilini güncelle",
        resource: "user",
        action: "updateProfile",
        inputSchema: [
          { key: "userId", label: "User ID", type: "string", required: true },
          { key: "fields", label: "Profile Fields (JSON)", type: "json", required: true },
        ],
      },
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    const { credentials, parameters } = context;
    const headers = { Authorization: `Bearer ${credentials.botToken}` };

    switch (operationId) {
      case "addToChannel":
        return this.httpRequest({
          method: "POST",
          url: "https://slack.com/api/conversations.invite",
          headers,
          body: { channel: parameters.channelId, users: parameters.userId },
        });

      case "sendMessage":
        return this.httpRequest({
          method: "POST",
          url: "https://slack.com/api/chat.postMessage",
          headers,
          body: { channel: parameters.channelId, text: parameters.text },
        });

      case "updateProfile":
        return this.httpRequest({
          method: "POST",
          url: "https://slack.com/api/users.profile.set",
          headers,
          body: { user: parameters.userId, profile: parameters.fields },
        });

      default:
        throw new Error(`Slack: bilinmeyen operasyon '${operationId}'`);
    }
  }

  async loadOptions(
    methodName: string,
    credentials: Record<string, string>
  ): Promise<Array<{ value: string; label: string }>> {
    if (methodName === "getChannels") {
      const result = await this.httpRequest({
        method: "GET",
        url: "https://slack.com/api/conversations.list",
        headers: { Authorization: `Bearer ${credentials.botToken}` },
        params: { limit: "200", types: "public_channel,private_channel" },
      }) as any;

      return (result.channels ?? []).map((ch: any) => ({
        value: ch.id,
        label: `#${ch.name}`,
      }));
    }
    return [];
  }

  async validateCredentials(credentials: Record<string, string>): Promise<boolean> {
    try {
      const result = await this.httpRequest({
        method: "GET",
        url: "https://slack.com/api/auth.test",
        headers: { Authorization: `Bearer ${credentials.botToken}` },
      }) as any;
      return result.ok === true;
    } catch {
      return false;
    }
  }
}
