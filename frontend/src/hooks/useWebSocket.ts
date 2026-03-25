import { useEffect, useRef, useCallback } from 'react';
import { useAgentStore } from './useAgentStore';
import type { LogEntry, AgentStatus } from '../types/agent';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const useWebSocket = (analysisId: string | null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setAgentStatus, addLogEntry, setAlerts, setSuggestions } = useAgentStore();

  const connect = useCallback(() => {
    if (!analysisId) return;
    const ws = new WebSocket(`${WS_URL}/ws/reasoning?analysis_id=${analysisId}`);
    wsRef.current = ws;

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
          // alerts and suggestions will be populated by subsequent messages
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 3000);
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
