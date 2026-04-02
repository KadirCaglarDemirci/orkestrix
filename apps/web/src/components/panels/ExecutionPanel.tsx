import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronRight, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getExecutions, getExecutionLogs } from "../../services/api";
import { useExecutionStream } from "../../hooks/useExecutionStream";

interface Props {
  workflowId: string;
}

const STATUS_ICON = {
  SUCCESS: <CheckCircle size={14} className="text-green-400" />,
  FAILED: <XCircle size={14} className="text-red-400" />,
  RUNNING: <Clock size={14} className="text-yellow-400 animate-spin" />,
  PENDING: <Clock size={14} className="text-gray-400 animate-pulse" />,
};

function LiveExecutionRow({ execution }: { execution: any }) {
  const [open, setOpen] = useState(true);
  const stream = useExecutionStream(
    execution.status === "RUNNING" || execution.status === "PENDING" ? execution.id : null
  );
  const qc = useQueryClient();
  const prevDone = useRef(false);

  // Execution tamamlanınca listeyi yenile
  useEffect(() => {
    if (stream.done && !prevDone.current) {
      prevDone.current = true;
      qc.invalidateQueries({ queryKey: ["executions"] });
    }
  }, [stream.done, qc]);

  const isLive = execution.status === "RUNNING" || execution.status === "PENDING";
  const displayStatus = isLive && stream.status ? stream.status : execution.status;
  const logs = stream.logs;

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left"
      >
        {open ? <ChevronDown size={13} className="text-gray-500" /> : <ChevronRight size={13} className="text-gray-500" />}
        {STATUS_ICON[displayStatus as keyof typeof STATUS_ICON] ?? STATUS_ICON.PENDING}
        {isLive && <Radio size={11} className="text-yellow-400 animate-pulse" />}
        <span className="text-xs text-gray-300 flex-1 truncate">
          #{execution.id.slice(0, 8)} — {new Date(execution.startedAt).toLocaleString("tr-TR")}
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
          displayStatus === "SUCCESS" ? "bg-green-500/20 text-green-400" :
          displayStatus === "FAILED"  ? "bg-red-500/20 text-red-400" :
          "bg-yellow-500/20 text-yellow-400"
        }`}>
          {displayStatus}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-800 bg-gray-950 p-3 space-y-2">
          {logs.length === 0 ? (
            <div className="text-xs text-gray-600">
              {isLive ? "Bekleniyor..." : "Log bulunamadı."}
            </div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="text-xs font-mono">
                <div className="flex items-center gap-2">
                  {log.status === "SUCCESS"
                    ? <CheckCircle size={11} className="text-green-400 shrink-0" />
                    : <XCircle size={11} className="text-red-400 shrink-0" />}
                  <span className="text-gray-300">{log.node?.label ?? log.nodeId}</span>
                  <span className="text-gray-600 ml-auto">{log.durationMs}ms</span>
                </div>
                {log.error && (
                  <div className="ml-4 mt-1 text-red-400 bg-red-500/10 rounded px-2 py-1">
                    {log.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CompletedExecutionRow({ execution }: { execution: any }) {
  const [open, setOpen] = useState(false);
  const { data: logs = [] } = useQuery({
    queryKey: ["logs", execution.id],
    queryFn: () => getExecutionLogs(execution.id),
    enabled: open,
  });

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left"
      >
        {open ? <ChevronDown size={13} className="text-gray-500" /> : <ChevronRight size={13} className="text-gray-500" />}
        {STATUS_ICON[execution.status as keyof typeof STATUS_ICON] ?? STATUS_ICON.PENDING}
        <span className="text-xs text-gray-300 flex-1 truncate">
          #{execution.id.slice(0, 8)} — {new Date(execution.startedAt).toLocaleString("tr-TR")}
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
          execution.status === "SUCCESS" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`}>
          {execution.status}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-800 bg-gray-950 p-3 space-y-2">
          {logs.length === 0 ? (
            <div className="text-xs text-gray-600">Log bulunamadı.</div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="text-xs font-mono">
                <div className="flex items-center gap-2">
                  {log.status === "SUCCESS"
                    ? <CheckCircle size={11} className="text-green-400 shrink-0" />
                    : <XCircle size={11} className="text-red-400 shrink-0" />}
                  <span className="text-gray-300">{log.node?.label ?? log.nodeId}</span>
                  <span className="text-gray-600 ml-auto">{log.durationMs}ms</span>
                </div>
                {log.error && (
                  <div className="ml-4 mt-1 text-red-400 bg-red-500/10 rounded px-2 py-1">
                    {log.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function ExecutionPanel({ workflowId }: Props) {
  const { data: executions = [], isLoading } = useQuery({
    queryKey: ["executions", workflowId],
    queryFn: () => getExecutions(workflowId),
    refetchInterval: 5000,
  });

  return (
    <div className="p-4 space-y-2">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Çalışma Geçmişi
      </div>
      {isLoading && <div className="text-xs text-gray-600">Yükleniyor...</div>}
      {!isLoading && executions.length === 0 && (
        <div className="text-xs text-gray-600">Henüz çalışma yok.</div>
      )}
      {executions.map((ex: any) =>
        ex.status === "SUCCESS" || ex.status === "FAILED"
          ? <CompletedExecutionRow key={ex.id} execution={ex} />
          : <LiveExecutionRow key={ex.id} execution={ex} />
      )}
    </div>
  );
}
