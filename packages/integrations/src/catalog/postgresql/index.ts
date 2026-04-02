import { BaseIntegration, ExecuteContext } from "../../base/BaseIntegration";
import type { IntegrationDefinition } from "@flowmatic/types";

export class PostgreSQLIntegration extends BaseIntegration {
  readonly definition: IntegrationDefinition = {
    id: "postgresql",
    name: "PostgreSQL",
    description: "PostgreSQL veritabanı sorguları ve LangChain chat memory",
    icon: "database",
    color: "#336791",
    category: "database",
    authType: "connection_string",
    credentialFields: [
      {
        key: "connectionString",
        label: "Connection String",
        type: "password",
        required: true,
        placeholder: "postgresql://user:password@host:5432/dbname",
      },
    ],
    operations: [
      {
        id: "executeQuery",
        name: "Execute Query",
        description: "SQL sorgusu çalıştır",
        resource: "database",
        action: "query",
        inputSchema: [
          { key: "query", label: "SQL Query", type: "string", required: true },
          { key: "parameters", label: "Parameters (JSON Array)", type: "json", required: false },
        ],
        outputSchema: {
          type: "object",
          properties: {
            rows: { type: "array" },
            rowCount: { type: "number" },
          },
        },
      },
      {
        id: "insertRow",
        name: "Insert Row",
        description: "Tabloya satır ekle",
        resource: "database",
        action: "insert",
        inputSchema: [
          { key: "table", label: "Table Name", type: "string", required: true },
          { key: "data", label: "Row Data (JSON)", type: "json", required: true },
        ],
      },
      {
        id: "updateRows",
        name: "Update Rows",
        description: "Tablo satırlarını güncelle",
        resource: "database",
        action: "update",
        inputSchema: [
          { key: "table", label: "Table Name", type: "string", required: true },
          { key: "data", label: "Update Data (JSON)", type: "json", required: true },
          { key: "where", label: "WHERE clause", type: "string", required: true },
        ],
      },
      {
        id: "selectRows",
        name: "Select Rows",
        description: "Tablo satırlarını sorgula",
        resource: "database",
        action: "select",
        inputSchema: [
          { key: "table", label: "Table Name", type: "string", required: true },
          { key: "where", label: "WHERE clause (optional)", type: "string", required: false },
          { key: "limit", label: "Limit", type: "number", required: false, placeholder: "100" },
        ],
      },
    ],
  };

  async execute(operationId: string, context: ExecuteContext): Promise<unknown> {
    // PostgreSQL operations are proxied through the API server which has pg client
    // This integration acts as a descriptor; actual execution happens in WorkflowExecutor
    // via a direct pg client to avoid shipping pg to browser bundles
    throw new Error(
      "PostgreSQL entegrasyonu doğrudan execute edilemez. WorkflowExecutor üzerinden kullanılır."
    );
  }
}
