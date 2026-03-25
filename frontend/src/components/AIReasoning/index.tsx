import { useAgentStore } from '../../hooks/useAgentStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import AgentList from './AgentList';
import ReasoningLog from './ReasoningLog';
import HistoryDropdown from './HistoryDropdown';

export default function AIReasoning() {
  const currentAnalysisId = useAgentStore((s) => s.currentAnalysisId);
  useWebSocket(currentAnalysisId);

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r border-gray-800 p-4 flex flex-col gap-4">
        <h2 className="font-semibold text-gray-300">Agentes</h2>
        <AgentList />
        <div className="mt-auto">
          <HistoryDropdown />
        </div>
      </aside>
      <main className="flex-1 flex flex-col p-4 overflow-hidden">
        <ReasoningLog />
      </main>
    </div>
  );
}
