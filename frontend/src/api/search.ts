import { API_ENDPOINTS } from '../lib/config';
import { apiClient } from '../lib/apiClient';
import type { SearchResult } from '../types/api';

export const searchSubtitles = async (query: string): Promise<SearchResult[]> => {
  const response = await apiClient.get(API_ENDPOINTS.SEARCH, { params: { q: query } });
  return response.data;
};
