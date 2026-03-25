export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface LogEntry {
  id: string;
  agent: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  tool_call?: ToolCall;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  node: string;
  site: string;
  description: string;
  impact: string;
  metric: string;
  threshold: string;
}

export interface Suggestion {
  id: string;
  priority: 'immediate' | 'medium_term' | 'long_term';
  target: string;
  action: string;
  reasoning: string;
  requires_config_change: boolean;
  estimated_impact: string;
  approved?: boolean;
}
