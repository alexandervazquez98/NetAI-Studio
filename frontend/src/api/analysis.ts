import apiClient from './client';

export interface RunAnalysisResponse {
  analysis_id: string;
  status: string;
}

export interface AnalysisSummary {
  id: string;
  created_at: string;
  status: string;
  summary: string | null;
  alert_count: number;
}

export const runAnalysis = async (): Promise<RunAnalysisResponse> => {
  const res = await apiClient.post<RunAnalysisResponse>('/api/analysis/run');
  return res.data;
};

export const getAnalysisHistory = async (): Promise<AnalysisSummary[]> => {
  const res = await apiClient.get<AnalysisSummary[]>('/api/analysis/history');
  return res.data;
};

export const getAnalysis = async (id: string): Promise<AnalysisSummary> => {
  const res = await apiClient.get<AnalysisSummary>(`/api/analysis/${id}`);
  return res.data;
};
