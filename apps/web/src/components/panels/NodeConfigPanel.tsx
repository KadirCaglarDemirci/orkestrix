import { X, Trash2, Info } from "lucide-react";
import { useWorkflowStore } from "../../stores/workflowStore";
import { useQuery } from "@tanstack/react-query";
import { getIntegrations } from "../../services/api";
import { CredentialSelect } from "../editor/CredentialSelect";

// ─── Tek parametre alanı ──────────────────────────────────────────────────────
function ParamField({
  field,
  value,
  onChange,
  integrationId,
}: {
  field: any;
  value: unknown;
  onChange: (val: unknown) => void;
  integrationId?: string;
}) {
  const strVal = value !== undefined && value !== null ? String(value) : "";

  // Credential seçici
  if (field.key === "credentialId" && integrationId) {
    return (
      <CredentialSelect
        integrationId={integrationId}
        value={strVal}
        onChange={onChange}
      />
    );
  }

  switch (field.type) {
    case "boolean":
      return (
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            value ? "bg-brand-500" : "bg-gray-700"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              value ? "translate-x-4.5" : "translate-x-0.5"
            }`}
          />
        </button>
      );

    case "select":
      return (
        <select
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
        >
          <option value="">— Seç —</option>
          {field.options?.map((opt: string | { value: string; label: string }) => {
            const v = typeof opt === "string" ? opt : opt.value;
            const l = typeof opt === "string" ? opt : opt.label;
            return <option key={v} value={v}>{l}</option>;
          })}
        </select>
      );

    case "textarea":
      return (
        <textarea
          rows={4}
          placeholder={field.placeholder ?? ""}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono focus:outline-none focus:border-brand-500 resize-y"
        />
      );

    case "json":
      return (
        <textarea
          rows={3}
          placeholder={field.placeholder ?? "{}"}
          value={
            typeof value === "string"
              ? value
              : JSON.stringify(value ?? {}, null, 2)
          }
          onChange={(e) => {
            try { onChange(JSON.parse(e.target.value)); }
            catch { onChange(e.target.value); }
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 font-mono focus:outline-none focus:border-brand-500 resize-y"
        />
      );

    case "number":
      return (
        <input
          type="number"
          placeholder={field.placeholder ?? ""}
          value={strVal}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
        />
      );

    case "password":
      return (
        <input
          type="password"
          placeholder={field.placeholder ?? ""}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
        />
      );

    default:
      return (
        <input
          type="text"
          placeholder={field.placeholder ?? "{{ $prev.field }} veya sabit değer"}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
        />
      );
  }
}

// ─── Ana panel ────────────────────────────────────────────────────────────────
export function NodeConfigPanel() {
  const { selectedNodeId, nodes, updateNodeData, deleteNode, selectNode } = useWorkflowStore();
  const node = nodes.find((n) => n.id === selectedNodeId);

  const { data: integrations = [] } = useQuery({
    queryKey: ["integrations"],
    queryFn: getIntegrations,
  });

  if (!node) return null;

  const { data } = node;
  const params: Record<string, unknown> = (data.parameters as any) ?? {};

  const setParam = (key: string, val: unknown) => {
    updateNodeData(node.id, { parameters: { ...params, [key]: val } });
  };

  const selectedIntegration = integrations.find((i: any) => i.id === data.integrationId);
  const selectedOperation = selectedIntegration?.operations?.find(
    (op: any) => op.id === data.operationId
  );

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div>
          <div className="text-sm font-semibold text-gray-100">{data.label}</div>
          <div className="text-xs text-gray-500 capitalize">{(data.nodeType ?? "").toLowerCase()}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => deleteNode(node.id)}
            className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
            title="Düğümü sil"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => selectNode(null)}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Düğüm Adı */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Düğüm Adı</label>
          <input
            value={data.label}
            onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* ── TRIGGER ── */}
        {data.nodeType === "TRIGGER" && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Tetikleyici Tipi</label>
              <select
                value={data.triggerType ?? "MANUAL"}
                onChange={(e) => updateNodeData(node.id, { triggerType: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
              >
                <option value="MANUAL">Manuel</option>
                <option value="WEBHOOK">Webhook</option>
                <option value="SCHEDULE">Schedule (Cron)</option>
                <option value="FORM_SUBMISSION">Form Submit</option>
              </select>
            </div>
            {data.triggerType === "WEBHOOK" && (
              <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-400">
                Webhook URL: <span className="text-brand-400 font-mono break-all">
                  {`${window.location.protocol}//${window.location.hostname}:3001/webhooks/${data.webhookPath ?? "<path>"}`}
                </span>
              </div>
            )}
            {data.triggerType === "SCHEDULE" && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Cron İfadesi</label>
                <input
                  placeholder="* * * * * (dakika saat gün ay hgünü)"
                  value={String(params.cronExpression ?? "")}
                  onChange={(e) => setParam("cronExpression", e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            )}
          </>
        )}

        {/* ── ACTION ── */}
        {data.nodeType === "ACTION" && (
          <>
            {/* Entegrasyon seç */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Entegrasyon</label>
              <select
                value={data.integrationId ?? ""}
                onChange={(e) =>
                  updateNodeData(node.id, {
                    integrationId: e.target.value,
                    operationId: undefined,
                    parameters: {},
                  })
                }
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">— Seç —</option>
                {integrations
                  .filter((i: any) => i.authType !== "none" || true)
                  .map((i: any) => (
                    <option key={i.id} value={i.id}>
                      {i.icon ? `${i.icon} ` : ""}{i.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Credential seç */}
            {selectedIntegration?.authType !== "none" && selectedIntegration && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Credential</label>
                <CredentialSelect
                  integrationId={data.integrationId ?? ""}
                  value={String(data.credentialId ?? "")}
                  onChange={(v) => updateNodeData(node.id, { credentialId: v })}
                />
              </div>
            )}

            {/* Operasyon seç */}
            {selectedIntegration && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Operasyon</label>
                <select
                  value={data.operationId ?? ""}
                  onChange={(e) =>
                    updateNodeData(node.id, { operationId: e.target.value, parameters: {} })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="">— Seç —</option>
                  {selectedIntegration.operations?.map((op: any) => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ))}
                </select>
                {selectedOperation?.description && (
                  <p className="text-xs text-gray-600 mt-1">{selectedOperation.description}</p>
                )}
              </div>
            )}

            {/* Parametre alanları */}
            {selectedOperation?.parameters?.map((field: any) => (
              <div key={field.key}>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-400 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-400">*</span>}
                </label>
                <ParamField
                  field={field}
                  value={params[field.key]}
                  onChange={(v) => setParam(field.key, v)}
                  integrationId={data.integrationId}
                />
                {field.helpText && (
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <Info size={10} /> {field.helpText}
                  </p>
                )}
              </div>
            ))}

            {/* Expression ipucu */}
            {selectedOperation && (
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1.5">
                  Expression Kullanımı
                </div>
                <div className="space-y-0.5 text-[10px] text-gray-600 font-mono">
                  <div><span className="text-brand-400">{"{{ $prev.field }}"}</span> — önceki node çıktısı</div>
                  <div><span className="text-brand-400">{"{{ input.field }}"}</span> — trigger inputu</div>
                  <div><span className="text-brand-400">{'{{ $node["Ad"].field }}'}</span> — belirli node</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── CONDITION ── */}
        {data.nodeType === "CONDITION" && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Alan</label>
              <input
                placeholder="{{ $prev.status }} veya sabit alan adı"
                value={String(params.field ?? "")}
                onChange={(e) => setParam("field", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Operatör</label>
              <select
                value={String(params.operator ?? "equals")}
                onChange={(e) => setParam("operator", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
              >
                <option value="equals">eşit (==)</option>
                <option value="notEquals">eşit değil (!=)</option>
                <option value="contains">içerir</option>
                <option value="greaterThan">büyük (&gt;)</option>
                <option value="lessThan">küçük (&lt;)</option>
                <option value="exists">var (exists)</option>
                <option value="isTrue">doğru (true)</option>
                <option value="isFalse">yanlış (false)</option>
              </select>
            </div>
            {!["exists", "isTrue", "isFalse"].includes(String(params.operator ?? "equals")) && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Değer</label>
                <input
                  placeholder="Karşılaştırma değeri"
                  value={String(params.value ?? "")}
                  onChange={(e) => setParam("value", e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            )}
          </>
        )}

        {/* ── AI AGENT ── */}
        {data.nodeType === "AI_AGENT" && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Sistem Promptu</label>
              <textarea
                rows={4}
                placeholder="Agent'ın rolünü ve kurallarını tanımlayın..."
                value={String(params.systemPrompt ?? "")}
                onChange={(e) => setParam("systemPrompt", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500 resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Kullanıcı Mesajı</label>
              <textarea
                rows={3}
                placeholder="{{ $prev }} veya sabit mesaj — boş bırakılırsa önceki node çıktısı kullanılır"
                value={String(params.userMessage ?? "")}
                onChange={(e) => setParam("userMessage", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono focus:outline-none focus:border-brand-500 resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Max İterasyon</label>
              <input
                type="number"
                min={1} max={25}
                value={String(params.maxIterations ?? 10)}
                onChange={(e) => setParam("maxIterations", Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/20 text-xs text-gray-500">
              Model, Memory ve Tool node'larını canvas'ta bu node'a bağlayın.
              Bağlantı yönü: Model/Memory/Tool → AI Agent (sol handle'lar).
            </div>
          </>
        )}

        {/* ── LOOP ── */}
        {data.nodeType === "LOOP" && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Dizi Alanı</label>
              <input
                placeholder="businesses veya results.items"
                value={String(params.arrayField ?? "")}
                onChange={(e) => setParam("arrayField", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono focus:outline-none focus:border-brand-500"
              />
              <p className="text-xs text-gray-600 mt-1">
                Önceki node çıktısındaki hangi dizi alanı üzerinde döneceğini belirler. Boş bırakılırsa tüm çıktı dizi olarak kullanılır.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Maks. Eleman</label>
              <input
                type="number"
                min={1} max={1000}
                placeholder="100"
                value={String(params.maxItems ?? "")}
                onChange={(e) => setParam("maxItems", e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="bg-cyan-500/5 rounded-lg p-3 border border-cyan-500/20 text-xs text-gray-500 space-y-1">
              <div><span className="text-cyan-400 font-mono">{"{{ $item }}"}</span> — mevcut eleman</div>
              <div><span className="text-cyan-400 font-mono">{"{{ $index }}"}</span> — sıra (0'dan başlar)</div>
              <div><span className="text-cyan-400 font-mono">{"{{ $total }}"}</span> — toplam eleman sayısı</div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
