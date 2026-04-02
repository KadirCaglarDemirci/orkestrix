import { useEffect, useRef, useState } from "react";

export interface StreamLog {
  nodeId: string;
  status: "SUCCESS" | "FAILED";
  durationMs: number;
  error?: string;
  node?: { rfId: string; label: string; type: string };
}

export interface StreamState {
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | null;
  logs: StreamLog[];
  done: boolean;
}

export function useExecutionStream(executionId: string | null) {
  const [state, setState] = useState<StreamState>({ status: null, logs: [], done: false });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!executionId) return;

    setState({ status: "PENDING", logs: [], done: false });

    const token = localStorage.getItem("token");
    const url = `/api/executions/${executionId}/stream`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("status", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setState((s) => ({ ...s, status: data.status }));
    });

    es.addEventListener("update", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setState((s) => ({ ...s, status: data.status, logs: data.logs ?? [] }));
    });

    es.addEventListener("done", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setState((s) => ({ ...s, status: data.status, done: true }));
      es.close();
    });

    es.onerror = () => es.close();

    return () => { es.close(); esRef.current = null; };
  }, [executionId]);

  return state;
}
