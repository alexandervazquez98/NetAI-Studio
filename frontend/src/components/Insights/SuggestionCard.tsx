import { useAgentStore } from '../../hooks/useAgentStore';
import type { Suggestion } from '../../types/agent';

const priorityLabel = (priority: Suggestion['priority']) => {
  switch (priority) {
    case 'immediate': return <span className="bg-red-700 text-red-100 text-xs px-1.5 py-0.5 rounded font-semibold">Immediate</span>;
    case 'medium_term': return <span className="bg-amber-700 text-amber-100 text-xs px-1.5 py-0.5 rounded font-semibold">Medium Term</span>;
    case 'long_term': return <span className="bg-blue-700 text-blue-100 text-xs px-1.5 py-0.5 rounded font-semibold">Long Term</span>;
  }
};

export function SuggestionCard() {
  const suggestions = useAgentStore((s) => s.suggestions);
  const approveSuggestion = useAgentStore((s) => s.approveSuggestion);

  if (suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-500 text-sm">
        No suggestions yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {suggestions.map((s) => (
        <div
          key={s.id}
          className={`rounded-lg border p-3 text-sm ${s.approved ? 'bg-green-900 border-green-700' : 'bg-gray-800 border-gray-700'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            {priorityLabel(s.priority)}
            <span className="font-medium text-gray-200 truncate">{s.target}</span>
          </div>
          <p className="text-gray-300 mb-1 font-medium">{s.action}</p>
          <p className="text-gray-400 text-xs mb-1">{s.reasoning}</p>
          <p className="text-gray-500 text-xs mb-2">
            <span className="font-semibold">Impact:</span> {s.estimated_impact}
            {s.requires_config_change && (
              <span className="ml-2 text-amber-400">(Requires config change)</span>
            )}
          </p>
          {!s.approved && (
            <button
              onClick={() => approveSuggestion(s.id)}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition-colors"
            >
              Aprobar
            </button>
          )}
          {s.approved && (
            <span className="text-xs text-green-400 font-semibold">&#10003; Aprobado</span>
          )}
        </div>
      ))}
    </div>
  );
}
