import { useState } from 'react';
import type { LogEntry } from '../../types/agent';

interface LogEntryProps {
  entry: LogEntry;
}

const agentBadgeColor = (agent: string) => {
  switch (agent) {
    case 'topology_agent': return 'bg-blue-700 text-blue-100';
    case 'metrics_agent': return 'bg-green-700 text-green-100';
    case 'analyst_agent': return 'bg-purple-700 text-purple-100';
    case 'config_agent': return 'bg-orange-700 text-orange-100';
    case 'orchestrator': return 'bg-gray-600 text-gray-100';
    default: return 'bg-gray-700 text-gray-100';
  }
};

const entryBg = (level: LogEntry['level']) => {
  switch (level) {
    case 'warning': return 'bg-amber-950 border-amber-800';
    case 'error': return 'bg-red-950 border-red-800';
    default: return 'bg-gray-900 border-gray-800';
  }
};

export default function LogEntryComponent({ entry }: LogEntryProps) {
  const [expanded, setExpanded] = useState(false);

  const formattedTime = (() => {
    try {
      return new Date(entry.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return entry.timestamp;
    }
  })();

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${entryBg(entry.level)}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${agentBadgeColor(entry.agent)}`}>
          {entry.agent}
        </span>
        <span className="text-gray-500 text-xs ml-auto">{formattedTime}</span>
      </div>
      <p className="text-gray-200 leading-snug">{entry.message}</p>
      {entry.tool_call && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <span>{expanded ? '▾' : '▸'}</span>
            Tool: {entry.tool_call.name}
          </button>
          {expanded && (
            <div className="mt-1 space-y-1">
              <div className="rounded bg-gray-800 p-2">
                <p className="text-xs text-gray-400 mb-1 font-semibold">Input</p>
                <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(entry.tool_call.input, null, 2)}
                </pre>
              </div>
              <div className="rounded bg-gray-800 p-2">
                <p className="text-xs text-gray-400 mb-1 font-semibold">Output</p>
                <pre className="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(entry.tool_call.output, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
