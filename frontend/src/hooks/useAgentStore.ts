import { create } from 'zustand';
import type { Agent, LogEntry, Alert, Suggestion } from '../types/agent';

const INITIAL_AGENTS: Agent[] = [
  { id: 'topology_agent', name: 'Topology Agent', status: 'idle' },
  { id: 'metrics_agent', name: 'Metrics Agent', status: 'idle' },
  { id: 'analyst_agent', name: 'Analyst Agent', status: 'idle' },
  { id: 'config_agent', name: 'Config Agent', status: 'idle' },
  { id: 'orchestrator', name: 'Orchestrator', status: 'idle' },
];

interface AgentState {
  agents: Agent[];
  logEntries: LogEntry[];
  alerts: Alert[];
  suggestions: Suggestion[];
  currentAnalysisId: string | null;
  setAgentStatus: (agentId: string, status: Agent['status']) => void;
  addLogEntry: (entry: LogEntry) => void;
  setAlerts: (alerts: Alert[]) => void;
  setSuggestions: (suggestions: Suggestion[]) => void;
  setCurrentAnalysisId: (id: string | null) => void;
  resetAgents: () => void;
  clearLog: () => void;
  approveSuggestion: (id: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: INITIAL_AGENTS,
  logEntries: [],
  alerts: [],
  suggestions: [],
  currentAnalysisId: null,
  setAgentStatus: (agentId, status) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.id === agentId ? { ...a, status } : a)),
    })),
  addLogEntry: (entry) =>
    set((state) => ({ logEntries: [...state.logEntries, entry] })),
  setAlerts: (alerts) => set({ alerts }),
  setSuggestions: (suggestions) => set({ suggestions }),
  setCurrentAnalysisId: (id) => set({ currentAnalysisId: id }),
  resetAgents: () => set({ agents: INITIAL_AGENTS, logEntries: [], currentAnalysisId: null }),
  clearLog: () => set({ logEntries: [] }),
  approveSuggestion: (id) =>
    set((state) => ({
      suggestions: state.suggestions.map((s) => (s.id === id ? { ...s, approved: true } : s)),
    })),
}));
