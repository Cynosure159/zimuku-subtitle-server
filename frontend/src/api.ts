import axios from 'axios';

export const API_BASE = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE,
});

export interface MediaMetadata {
  file_id: number;
  filename: string;
  nfo_data: {
    title?: string;
    year?: string;
    plot?: string;
    rating?: string;
    genres?: string[];
    director?: string;
    runtime?: string;
  } | null;
  poster_path: string | null;
  fanart_path: string | null;
  txt_info: Record<string, string> | null;
}

export const fetchMediaMetadata = async (fileId: number): Promise<MediaMetadata> => {
  const response = await api.get(`/media/metadata/${fileId}`);
  return response.data;
};

export const searchSubtitles = async (q: string) => {
  const response = await api.get('/search/', { params: { q } });
  return response.data;
};

export const createDownloadTask = async (
  title: string,
  source_url: string,
  target_path?: string,
  target_type?: 'movie' | 'tv',
  season?: number,
  episode?: number,
  language?: string
) => {
  const response = await api.post('/tasks/', null, {
    params: { title, source_url, target_path, target_type, season, episode, language }
  });
  return response.data;
};

export const listTasks = async () => {
  const response = await api.get('/tasks/');
  return response.data;
};

export const deleteTask = async (taskId: number) => {
  const response = await api.delete(`/tasks/${taskId}`);
  return response.data;
};

export const retryTask = async (taskId: number) => {
  const response = await api.post(`/tasks/${taskId}/retry`);
  return response.data;
};

export interface SearchResult {
  title: string;
  link: string;
  lang?: string[];
  download_count?: string;
  author?: string;
  format?: string;
  fps?: string;
  rating?: string;
}

export const clearCompletedTasks = async () => {
  const response = await api.post('/tasks/clear-completed');
  return response.data;
};

export const listMediaPaths = async () => {
  const response = await api.get('/media/paths');
  return response.data;
};

export const listScannedFiles = async (path_type?: 'movie' | 'tv') => {
  const response = await api.get('/media/files', { params: { path_type } });
  return response.data;
};

export const addMediaPath = async (path: string, path_type: 'movie' | 'tv') => {
  const response = await api.post('/media/paths', null, { params: { path, path_type } });
  return response.data;
};

export const deleteMediaPath = async (pathId: number) => {
  const response = await api.delete(`/media/paths/${pathId}`);
  return response.data;
};

export const triggerMediaMatch = async (path_type?: 'movie' | 'tv') => {
  const response = await api.post('/media/match', null, { params: { path_type } });
  return response.data;
};

export async function autoMatchFile(fileId: number) {
  const response = await api.post(`/media/files/${fileId}/auto-match`);
  return response.data;
}

export async function matchTVSeason(title: string, season: number) {
  const response = await api.post(`/media/tv/match-season?title=${encodeURIComponent(title)}&season=${season}`);
  return response.data;
}

export async function getTaskStatus() {
  const response = await api.get('/media/task-status');
  return response.data;
}

// Tasks API
export const listSettings = async () => {
  const response = await api.get('/settings/');
  return response.data;
};

export const updateSetting = async (key: string, value: string, description?: string) => {
  const response = await api.post('/settings/', { key, value, description });
  return response.data;
};



