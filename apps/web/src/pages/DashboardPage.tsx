import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Pencil, Trash2, Zap, Key, Upload, Download, CheckCircle, XCircle, Clock, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import { getWorkflows, getWorkflowStats, createWorkflow, deleteWorkflow, executeWorkflow } from "../services/api";
import { useAuthStore } from "../stores/authStore";
import { useWorkflowStore } from "../stores/workflowStore";

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function MiniBar({ date, success, failed }: { date: string; success: number; failed: number }) {
  const total = success + failed;
  const max = Math.max(total, 1);
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: 40 }}>
        {failed > 0 && (
          <div
            className="w-full bg-red-500/60 rounded-sm"
            style={{ height: `${(failed / max) * 40}px` }}
          />
        )}
        {success > 0 && (
          <div
            className="w-full bg-green-500/60 rounded-sm"
            style={{ height: `${(success / max) * 40}px` }}
          />
        )}
        {total === 0 && <div className="w-full bg-gray-800 rounded-sm" style={{ height: 4 }} />}
      </div>
      <span className="text-[9px] text-gray-600 rotate-[-35deg] origin-top-right whitespace-nowrap">
        {date.slice(5)}
      </span>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout } = useAuthStore();
  const reset = useWorkflowStore((s) => s.reset);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: getWorkflows,
  });

  const { data: stats } = useQuery({
    queryKey: ["workflow-stats"],
    queryFn: getWorkflowStats,
    refetchInterval: 30_000,
  });

  const handleExport = (wf: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const blob = new Blob([JSON.stringify(wf, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${wf.name.replace(/\s+/g, "-")}.flow.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    await createWorkflow({ name: data.name ?? "İçe Aktarılan Workflow" });
    qc.invalidateQueries({ queryKey: ["workflows"] });
    e.target.value = "";
  };

  const createMutation = useMutation({
    mutationFn: () => createWorkflow({ name: "Yeni Workflow" }),
    onSuccess: (wf) => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      reset();
      navigate(`/workflows/${wf.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      qc.invalidateQueries({ queryKey: ["workflow-stats"] });
    },
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => executeWorkflow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["workflow-stats"] }),
  });

  const openWorkflow = (id: string) => {
    reset();
    navigate(`/workflows/${id}`);
  };

  const avgSec = stats ? (stats.executions.avgDurationMs / 1000).toFixed(1) : "—";

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900 px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">Flowmatic</span>
        </div>
        <button
          onClick={() => navigate("/credentials")}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded hover:bg-gray-800"
        >
          <Key size={13} /> Credentials
        </button>
        <span className="text-sm text-gray-400">{user?.name ?? user?.email}</span>
        <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          Çıkış
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats cards */}
        {stats && (
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Genel Bakış</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={<Activity size={14} className="text-brand-400" />}
                label="Workflow"
                value={stats.workflows.total}
                sub={`${stats.workflows.active} aktif`}
                color="bg-brand-500/20"
              />
              <StatCard
                icon={<CheckCircle size={14} className="text-green-400" />}
                label="Başarılı"
                value={stats.executions.success}
                sub={`%${stats.executions.successRate} başarı`}
                color="bg-green-500/20"
              />
              <StatCard
                icon={<XCircle size={14} className="text-red-400" />}
                label="Başarısız"
                value={stats.executions.failed}
                sub={`${stats.executions.running} çalışıyor`}
                color="bg-red-500/20"
              />
              <StatCard
                icon={<Clock size={14} className="text-yellow-400" />}
                label="Ort. Süre"
                value={`${avgSec}s`}
                sub={`${stats.executions.total} toplam`}
                color="bg-yellow-500/20"
              />
            </div>

            {/* Mini bar chart */}
            {stats.daily && stats.daily.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-4">
                  Son 7 Gün — Execution Geçmişi
                </p>
                <div className="flex items-end gap-1 px-2 pb-4">
                  {stats.daily.map((d: any) => (
                    <MiniBar key={d.date} date={d.date} success={d.success} failed={d.failed} />
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1 text-[11px] text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-sm bg-green-500/60 inline-block" /> Başarılı
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500/60 inline-block" /> Başarısız
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Workflow list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Workflow'larım</h1>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
              >
                <Upload size={14} /> İçe Aktar
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Plus size={15} /> Yeni Workflow
              </button>
            </div>
          </div>

          {isLoading && <div className="text-sm text-gray-500">Yükleniyor...</div>}

          {!isLoading && workflows.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <Zap size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Henüz workflow yok.</p>
              <p className="text-xs mt-1">Yeni Workflow butonuna tıkla.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((wf: any) => (
              <div
                key={wf.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors group cursor-pointer"
                onClick={() => openWorkflow(wf.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-100 truncate group-hover:text-white transition-colors">
                      {wf.name}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(wf.updatedAt).toLocaleDateString("tr-TR", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ml-2 shrink-0 ${
                    wf.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-700 text-gray-500"
                  }`}>
                    {wf.isActive ? "AKTİF" : "PASİF"}
                  </div>
                </div>

                {wf._count && (
                  <div className="flex items-center gap-3 text-[11px] text-gray-600 mb-3">
                    <span>{wf._count.nodes} node</span>
                    <span>{wf._count.executions} çalıştırma</span>
                    {wf.executions?.[0] && (
                      <span className={
                        wf.executions[0].status === "SUCCESS" ? "text-green-500" :
                        wf.executions[0].status === "FAILED" ? "text-red-500" : "text-yellow-500"
                      }>
                        ● {wf.executions[0].status}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-gray-800" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openWorkflow(wf.id); }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <Pencil size={12} /> Düzenle
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); executeMutation.mutate(wf.id); }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-400 transition-colors"
                  >
                    <Play size={12} /> Çalıştır
                  </button>
                  <button
                    onClick={(e) => handleExport(wf, e)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <Download size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`"${wf.name}" silinsin mi?`)) deleteMutation.mutate(wf.id);
                    }}
                    className="ml-auto flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
