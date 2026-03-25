import { useState, useEffect } from 'react';
import { getAnalysisHistory, type AnalysisSummary } from '../api/analysis';

export const useAnalysisHistory = () => {
  const [history, setHistory] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getAnalysisHistory();
      setHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return { history, loading, refresh };
};
