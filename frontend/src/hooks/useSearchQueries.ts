import { useQuery } from '@tanstack/react-query';
import { searchSubtitles } from '../api';

export interface SearchResult {
  id: string;
  title: string;
  subtitle_name: string;
  language: string;
  format: string;
  fps: string;
  publish_date: string;
  download_count: string;
  source_url: string;
  score?: number;
}

// Query hooks
export function useSearch(query: string, enabled: boolean = true) {
  return useQuery<SearchResult[]>({
    queryKey: ['search', query],
    queryFn: () => searchSubtitles(query),
    enabled: enabled && query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
