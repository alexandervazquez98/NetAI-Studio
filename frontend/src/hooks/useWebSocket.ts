import { useEffect, useRef, useCallback } from 'react';
import { useAgentStore } from './useAgentStore';
import { getAnalysis } from '../api/analysis';
import type { LogEntry, AgentStatus } from '../types/agent';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const useWebSocket = (analysisId: string | null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempts = useRef(0);
  const { setAgentStatus, addLogEntry, setAlerts, setSuggestions } = useAgentStore();

  const connect = useCallback(() => {
    if (!analysisId) return;
    const ws = new WebSocket(`${WS_URL}/ws/reasoning?analysis_id=${analysisId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Reset backoff counter on successful connection
      attempts.current = 0;
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as Record<string, unknown>;

        if (msg.type === 'agent_status') {
          setAgentStatus(msg.agent as string, msg.status as AgentStatus);

        } else if (msg.type === 'log_entry') {
          const entry: LogEntry = {
            id: crypto.randomUUID(),
            agent: msg.agent as string,
            level: (msg.level as LogEntry['level']) ?? 'info',
            message: msg.message as string,
            timestamp: msg.timestamp as string,
            tool_call: msg.tool_call as LogEntry['tool_call'],
          };
          addLogEntry(entry);

        } else if (msg.type === 'analysis_complete') {
          // Fetch full analysis data from REST to populate alerts and suggestions
          const analysisId = msg.analysis_id as string;
          if (analysisId) {
            getAnalysis(analysisId)
              .then((data) => {
                // data is typed as AnalysisSummary — cast to any to access extended fields
                const full = data as any;
                setAlerts(full.alerts ?? []);
                setSuggestions(full.raw_result?.suggestions ?? []);
              })
              .catch((err) => {
                console.error('Failed to fetch analysis results after completion:', err);
              });
          }
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    ws.onclose = () => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (cap)
      const delay = Math.min(1000 * Math.pow(2, attempts.current), 30_000);
      attempts.current += 1;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [analysisId, setAgentStatus, addLogEntry, setAlerts, setSuggestions]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  return wsRef;
};
