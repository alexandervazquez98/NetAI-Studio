import apiClient from './client';
import type { TopologyGraphSchema } from '../types/api';

export const getGraph = async (): Promise<TopologyGraphSchema> => {
  const res = await apiClient.get<TopologyGraphSchema>('/api/graph/');
  return res.data;
};

export const saveGraph = async (graph: TopologyGraphSchema): Promise<void> => {
  await apiClient.post('/api/graph/', graph);
};

export const updateNode = async (nodeId: string, data: Partial<unknown>): Promise<void> => {
  await apiClient.put(`/api/graph/nodes/${nodeId}`, data);
};

export const deleteNode = async (nodeId: string): Promise<void> => {
  await apiClient.delete(`/api/graph/nodes/${nodeId}`);
};

export const exportGraph = async (): Promise<unknown> => {
  const res = await apiClient.get('/api/graph/export');
  return res.data;
};
