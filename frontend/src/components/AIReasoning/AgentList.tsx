import { useAgentStore } from '../../hooks/useAgentStore';
import type { AgentStatus } from '../../types/agent';

const statusDot = (status: AgentStatus) => {
  switch (status) {
    case 'idle':
      return <span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" />;
    case 'running':
      return <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse" />;
    case 'done':
      return <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />;
    case 'error':
      return <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />;
  }
};

const statusLabel = (status: AgentStatus) => {
  switch (status) {
    case 'idle': return <span className="text-gray-400 text-xs">Idle</span>;
    case 'running': return <span className="text-blue-400 text-xs font-medium">Running</span>;
    case 'done': return <span className="text-green-400 text-xs font-medium">Done</span>;
    case 'error': return <span className="text-red-400 text-xs font-medium">Error</span>;
  }
};

export default function AgentList() {
  const agents = useAgentStore((s) => s.agents);

  return (
    <div className="flex flex-col gap-2">
      {agents.map((agent) => (
        <div key={agent.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800">
          <div className="flex items-center gap-2">
            {statusDot(agent.status)}
            <span className="text-sm text-gray-200">{agent.name}</span>
          </div>
          {statusLabel(agent.status)}
        </div>
      ))}
    </div>
  );
}
