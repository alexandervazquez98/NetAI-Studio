import { useState } from 'react';
import { useAnalysisHistory } from '../../hooks/useAnalysisHistory';
import { useAgentStore } from '../../hooks/useAgentStore';

export default function HistoryDropdown() {
  const { history, loading } = useAnalysisHistory();
  const setCurrentAnalysisId = useAgentStore((s) => s.setCurrentAnalysisId);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-1 text-sm text-gray-400 hover:text-white bg-gray-800 border border-gray-700 rounded px-3 py-1.5"
      >
        <span>History</span>
        <span>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded shadow-lg max-h-60 overflow-y-auto z-10">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-500">Loading...</div>
          )}
          {!loading && history.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-500">No history</div>
          )}
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentAnalysisId(item.id);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-gray-300 truncate">{item.id.slice(0, 8)}…</span>
                <span className={`shrink-0 font-medium ${
                  item.status === 'completed' ? 'text-green-400' :
                  item.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                }`}>{item.status}</span>
              </div>
              <div className="text-gray-500 mt-0.5">
                {new Date(item.created_at).toLocaleString()}
                {item.alert_count > 0 && ` · ${item.alert_count} alerts`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
