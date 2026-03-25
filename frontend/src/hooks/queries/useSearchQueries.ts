import { useQuery } from '@tanstack/react-query';
import { searchSubtitles } from '../../api';
import { queryKeys } from '../../lib/queryKeys';

export function useSubtitleSearchQuery(query: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.search.results(query),
    queryFn: () => searchSubtitles(query),
    enabled: enabled && query.trim().length > 0,
  });
}
