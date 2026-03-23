import axios from 'axios';
import { API_BASE, API_ENDPOINTS } from './lib/config';
import type {
  MediaMetadata,
  ScannedFile,
  MediaPath,
  Task,
  TaskStatus,
  Setting,
  SearchResult,
  MediaSelection,
  SidebarItem,
  SortOption,
  FilterOption,
  SortOrder,
} from './types/api';

// ==================== Axios Instance ====================

const api = axios.create({
  baseURL: API_BASE,
});

// ==================== Media APIs ====================

export const fetchMediaMetadata = async (fileId: number): Promise<MediaMetadata> => {
  const response = await api.get(API_ENDPOINTS.MEDIA_METADATA(fileId));
  return response.data;
};

export const listMediaPaths = async (): Promise<MediaPath[]> => {
  const response = await api.get(API_ENDPOINTS.MEDIA_PATHS);
  return response.data;
};

export const addMediaPath = async (path: string, pathType: 'movie' | 'tv'): Promise<void> => {
  const response = await api.post(API_ENDPOINTS.MEDIA_PATHS, null, {
    params: { path, path_type: pathType },
  });
  return response.data;
};

export const deleteMediaPath = async (pathId: number): Promise<void> => {
  const response = await api.delete(`${API_ENDPOINTS.MEDIA_PATHS}/${pathId}`);
  return response.data;
};

export const listScannedFiles = async (pathType?: 'movie' | 'tv'): Promise<ScannedFile[]> => {
  const response = await api.get(API_ENDPOINTS.MEDIA_FILES, {
    params: { path_type: pathType },
  });
  return response.data;
};

export const triggerMediaMatch = async (pathType?: 'movie' | 'tv'): Promise<void> => {
  const response = await api.post(API_ENDPOINTS.MEDIA_MATCH, null, {
    params: { path_type: pathType },
  });
  return response.data;
};

export const autoMatchFile = async (fileId: number): Promise<void> => {
  const response = await api.post(API_ENDPOINTS.MEDIA_AUTO_MATCH(fileId));
  return response.data;
};

export const matchTVSeason = async (title: string, season: number): Promise<void> => {
  const response = await api.post(
    `${API_ENDPOINTS.MEDIA_TV_MATCH_SEASON}?title=${encodeURIComponent(title)}&season=${season}`
  );
  return response.data;
};

export const getTaskStatus = async (): Promise<TaskStatus> => {
  const response = await api.get(API_ENDPOINTS.MEDIA_TASK_STATUS);
  return response.data;
};

export const getMediaPosterUrl = (posterPath: string): string => {
  return `${API_BASE}${API_ENDPOINTS.MEDIA_POSTER}?path=${encodeURIComponent(posterPath)}`;
};

// ==================== Task APIs ====================

export const listTasks = async (): Promise<{ items: Task[] }> => {
  const response = await api.get(API_ENDPOINTS.TASKS);
  return response.data;
};

export const deleteTask = async (taskId: number): Promise<void> => {
  const response = await api.delete(`${API_ENDPOINTS.TASKS}${taskId}`);
  return response.data;
};

export const retryTask = async (taskId: number): Promise<void> => {
  const response = await api.post(API_ENDPOINTS.TASK_RETRY(taskId));
  return response.data;
};

export const clearCompletedTasks = async (): Promise<void> => {
  const response = await api.post(API_ENDPOINTS.TASK_CLEAR_COMPLETED);
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
  const response = await api.post(API_ENDPOINTS.TASKS, null, {
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

// ==================== Settings APIs ====================

export const listSettings = async (): Promise<Setting[]> => {
  const response = await api.get(API_ENDPOINTS.SETTINGS);
  return response.data;
};

export const updateSetting = async (
  key: string,
  value: string,
  description?: string
): Promise<void> => {
  const response = await api.post(API_ENDPOINTS.SETTINGS, { key, value, description });
  return response.data;
};

// ==================== Search APIs ====================

export const searchSubtitles = async (query: string): Promise<SearchResult[]> => {
  const response = await api.get(API_ENDPOINTS.SEARCH, { params: { q: query } });
  return response.data;
};

// ==================== Re-exports ====================

export type {
  MediaMetadata,
  ScannedFile,
  MediaPath,
  Task,
  TaskStatus,
  Setting,
  SearchResult,
  MediaSelection,
  SidebarItem,
  SortOption,
  FilterOption,
  SortOrder,
};
