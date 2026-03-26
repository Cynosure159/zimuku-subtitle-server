import { API_ENDPOINTS } from '../lib/config';
import type { Task } from '../types/api';
import { deleteData, getData, postData } from './shared';

export async function listTasks(): Promise<{ items: Task[] }> {
  return getData(API_ENDPOINTS.TASKS);
}

export async function deleteTask(taskId: number): Promise<void> {
  return deleteData(`${API_ENDPOINTS.TASKS}${taskId}`);
}

export async function retryTask(taskId: number): Promise<void> {
  return postData(API_ENDPOINTS.TASK_RETRY(taskId));
}

export async function clearCompletedTasks(): Promise<void> {
  return postData(API_ENDPOINTS.TASK_CLEAR_COMPLETED);
}

export async function createDownloadTask(
  title: string,
  sourceUrl: string,
  targetPath?: string,
  targetType?: 'movie' | 'tv',
  season?: number,
  episode?: number,
  language?: string
): Promise<void> {
  return postData(API_ENDPOINTS.TASKS, null, {
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
}
