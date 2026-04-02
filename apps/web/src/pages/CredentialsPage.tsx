import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle, XCircle, ChevronLeft, Key } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCredentials, getIntegrations, createCredential, deleteCredential, testCredential } from "../services/api";

export function CredentialsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState("");
  const [name, setName] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});

  const { data: credentials = [] } = useQuery({ queryKey: ["credentials"], queryFn: getCredentials });
  const { data: integrations = [] } = useQuery({ queryKey: ["integrations"], queryFn: getIntegrations });

  const selectedIntegration = integrations.find((i: any) => i.id === selectedIntegrationId);

  const createMutation = useMutation({
    mutationFn: () => createCredential({ name, integrationId: selectedIntegrationId, data: fields }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credentials"] });
      setShowForm(false);
      setName("");
      setFields({});
      setSelectedIntegrationId("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCredential(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["credentials"] }),
  });

  const handleTest = async (id: string) => {
    setTestResults((s) => ({ ...s, [id]: null }));
    try {
      const res = await testCredential(id);
      setTestResults((s) => ({ ...s, [id]: res.valid }));
    } catch {
      setTestResults((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 bg-gray-900 px-6 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-1.5 rounded hover:bg-gray-800 text-gray-400">
          <ChevronLeft size={16} />
        </button>
        <Key size={16} className="text-gray-400" />
        <span className="text-sm font-semibold text-gray-100">Credentials</span>
        <button
          onClick={() => setShowForm(true)}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium"
        >
          <Plus size={13} /> Yeni Credential
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Form */}
        {showForm && (
          <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-100 mb-4">Yeni Credential Ekle</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Credential Adı</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Şirket Slack Botu"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Entegrasyon</label>
                <select
                  value={selectedIntegrationId}
                  onChange={(e) => { setSelectedIntegrationId(e.target.value); setFields({}); }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="">— Seç —</option>
                  {integrations.map((i: any) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              {selectedIntegration?.credentialFields?.map((field: any) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input
                    type={field.type === "password" ? "password" : "text"}
                    placeholder={field.placeholder ?? ""}
                    value={fields[field.key] ?? ""}
                    onChange={(e) => setFields((s) => ({ ...s, [field.key]: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-brand-500"
                  />
                  {field.helpText && <p className="text-xs text-gray-600 mt-1">{field.helpText}</p>}
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!name || !selectedIntegrationId || createMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium disabled:opacity-50"
                >
                  {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {credentials.length === 0 && !showForm && (
            <div className="text-center py-12 text-gray-600">
              <Key size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Henüz credential yok.</p>
            </div>
          )}
          {credentials.map((cred: any) => (
            <div key={cred.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-100">{cred.name}</div>
                <div className="text-xs text-gray-500">{cred.integrationId}</div>
              </div>

              {testResults[cred.id] === true && <CheckCircle size={15} className="text-green-400" />}
              {testResults[cred.id] === false && <XCircle size={15} className="text-red-400" />}

              <button
                onClick={() => handleTest(cred.id)}
                className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
              >
                Test Et
              </button>
              <button
                onClick={() => { if (confirm("Silinsin mi?")) deleteMutation.mutate(cred.id); }}
                className="text-gray-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
