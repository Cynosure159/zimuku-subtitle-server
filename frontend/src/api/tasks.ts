import { API_ENDPOINTS } from '../lib/config';
import { apiClient } from '../lib/apiClient';
import type { Task } from '../types/api';

export const listTasks = async (): Promise<{ items: Task[] }> => {
  const response = await apiClient.get(API_ENDPOINTS.TASKS);
  return response.data;
};

export const deleteTask = async (taskId: number): Promise<void> => {
  const response = await apiClient.delete(`${API_ENDPOINTS.TASKS}${taskId}`);
  return response.data;
};

export const retryTask = async (taskId: number): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.TASK_RETRY(taskId));
  return response.data;
};

export const clearCompletedTasks = async (): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.TASK_CLEAR_COMPLETED);
  return response.data;
};

export const createDownloadTask = async (
  title: string,
  sourceUrl: string,
  targetPath?: string,
  targetType?: 'movie' | 'tv',
  season?: number,
  episode?: number,
  language?: string
): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.TASKS, null, {
    params: {
      title,
      source_url: sourceUrl,
      target_path: targetPath,
      target_type: targetType,
      season,
      episode,
      language,
    },
  });
  return response.data;
};
