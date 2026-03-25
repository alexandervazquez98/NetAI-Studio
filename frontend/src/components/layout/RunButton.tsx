import { runAnalysis } from '../../api/analysis';
import { useAgentStore } from '../../hooks/useAgentStore';

export const RunButton = () => {
  const { setCurrentAnalysisId, resetAgents } = useAgentStore();

  const handleRun = async () => {
    resetAgents();
    try {
      const res = await runAnalysis();
      setCurrentAnalysisId(res.analysis_id);
    } catch (e) {
      console.error('Failed to start analysis', e);
    }
  };

  return (
    <button
      onClick={handleRun}
      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
    >
      <span>&#9654;</span>
      Run Analysis
    </button>
  );
};
