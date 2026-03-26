import { API_ENDPOINTS } from '../lib/config';
import type { SearchResult } from '../types/api';
import { getData } from './shared';

export async function searchSubtitles(query: string): Promise<SearchResult[]> {
  return getData(API_ENDPOINTS.SEARCH, { params: { q: query } });
}
