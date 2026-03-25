import apiClient from './client';

export interface ChatResponse {
  message: string;
}

export const sendChatMessage = async (message: string): Promise<ChatResponse> => {
  const res = await apiClient.post<ChatResponse>('/api/chat/', { message });
  return res.data;
};
