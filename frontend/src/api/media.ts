import { API_BASE } from '../lib/config';
import { API_ENDPOINTS } from '../lib/config';
import type { MediaMetadata, MediaPath, ScannedFile, TaskStatus } from '../types/api';
import { getData, postData, deleteData } from './shared';

export async function fetchMediaMetadata(fileId: number): Promise<MediaMetadata> {
  return getData(API_ENDPOINTS.MEDIA_METADATA(fileId));
}

export async function listMediaPaths(): Promise<MediaPath[]> {
  return getData(API_ENDPOINTS.MEDIA_PATHS);
}

export async function addMediaPath(path: string, pathType: 'movie' | 'tv'): Promise<void> {
  return postData(API_ENDPOINTS.MEDIA_PATHS, null, {
    params: { path, path_type: pathType },
  });
}

export async function deleteMediaPath(pathId: number): Promise<void> {
  return deleteData(`${API_ENDPOINTS.MEDIA_PATHS}/${pathId}`);
}

export async function listScannedFiles(pathType?: 'movie' | 'tv'): Promise<ScannedFile[]> {
  return getData(API_ENDPOINTS.MEDIA_FILES, {
    params: { path_type: pathType },
  });
}

export async function triggerMediaMatch(pathType?: 'movie' | 'tv'): Promise<void> {
  return postData(API_ENDPOINTS.MEDIA_MATCH, null, {
    params: { path_type: pathType },
  });
}

export async function autoMatchFile(fileId: number): Promise<void> {
  return postData(API_ENDPOINTS.MEDIA_AUTO_MATCH(fileId));
}

export async function matchTVSeason(title: string, season: number): Promise<void> {
  return postData(
    `${API_ENDPOINTS.MEDIA_TV_MATCH_SEASON}?title=${encodeURIComponent(title)}&season=${season}`
  );
}

export async function getTaskStatus(): Promise<TaskStatus> {
  return getData(API_ENDPOINTS.MEDIA_TASK_STATUS);
}

export function getMediaPosterUrl(posterPath: string): string {
  return `${API_BASE}${API_ENDPOINTS.MEDIA_POSTER}?path=${encodeURIComponent(posterPath)}`;
}
