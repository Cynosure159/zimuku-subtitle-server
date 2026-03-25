import { API_ENDPOINTS } from '../lib/config';
import { API_BASE } from '../lib/config';
import { apiClient } from '../lib/apiClient';
import type { MediaMetadata, MediaPath, ScannedFile, TaskStatus } from '../types/api';

export const fetchMediaMetadata = async (fileId: number): Promise<MediaMetadata> => {
  const response = await apiClient.get(API_ENDPOINTS.MEDIA_METADATA(fileId));
  return response.data;
};

export const listMediaPaths = async (): Promise<MediaPath[]> => {
  const response = await apiClient.get(API_ENDPOINTS.MEDIA_PATHS);
  return response.data;
};

export const addMediaPath = async (path: string, pathType: 'movie' | 'tv'): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.MEDIA_PATHS, null, {
    params: { path, path_type: pathType },
  });
  return response.data;
};

export const deleteMediaPath = async (pathId: number): Promise<void> => {
  const response = await apiClient.delete(`${API_ENDPOINTS.MEDIA_PATHS}/${pathId}`);
  return response.data;
};

export const listScannedFiles = async (pathType?: 'movie' | 'tv'): Promise<ScannedFile[]> => {
  const response = await apiClient.get(API_ENDPOINTS.MEDIA_FILES, {
    params: { path_type: pathType },
  });
  return response.data;
};

export const triggerMediaMatch = async (pathType?: 'movie' | 'tv'): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.MEDIA_MATCH, null, {
    params: { path_type: pathType },
  });
  return response.data;
};

export const autoMatchFile = async (fileId: number): Promise<void> => {
  const response = await apiClient.post(API_ENDPOINTS.MEDIA_AUTO_MATCH(fileId));
  return response.data;
};

export const matchTVSeason = async (title: string, season: number): Promise<void> => {
  const response = await apiClient.post(
    `${API_ENDPOINTS.MEDIA_TV_MATCH_SEASON}?title=${encodeURIComponent(title)}&season=${season}`
  );
  return response.data;
};

export const getTaskStatus = async (): Promise<TaskStatus> => {
  const response = await apiClient.get(API_ENDPOINTS.MEDIA_TASK_STATUS);
  return response.data;
};

export const getMediaPosterUrl = (posterPath: string): string => {
  return `${API_BASE}${API_ENDPOINTS.MEDIA_POSTER}?path=${encodeURIComponent(posterPath)}`;
};
