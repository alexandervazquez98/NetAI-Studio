import { useAnalysisHistory } from '../../hooks/useAnalysisHistory';

export default function HistoryList() {
  const { history, loading, refresh } = useAnalysisHistory();

  return (
    <div className="flex flex-col max-h-60 overflow-hidden">
      <div className="px-4 py-2 flex items-center justify-between border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Analysis History</h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
      <div className="overflow-y-auto flex-1">
        {loading && (
          <div className="px-4 py-3 text-xs text-gray-500">Loading...</div>
        )}
        {!loading && history.length === 0 && (
          <div className="px-4 py-3 text-xs text-gray-500">No history</div>
        )}
        {history.map((item) => (
          <div
            key={item.id}
            className="px-4 py-2 border-b border-gray-800 last:border-b-0 text-xs"
          >
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-gray-300 font-medium truncate">{item.id.slice(0, 12)}…</span>
              <span className={`shrink-0 font-medium ${
                item.status === 'completed' ? 'text-green-400' :
                item.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
              }`}>{item.status}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span>{new Date(item.created_at).toLocaleString()}</span>
              {item.alert_count > 0 && (
                <span className="text-red-400">{item.alert_count} alerts</span>
              )}
            </div>
            {item.summary && (
              <p className="text-gray-500 mt-0.5 truncate">{item.summary}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
