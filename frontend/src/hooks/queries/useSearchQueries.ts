import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { searchSubtitles } from '../../api';
import { queryKeys } from '../../lib/queryKeys';
import type { SearchResult } from '../../types/api';

type SearchQueryOptions = Omit<
  UseQueryOptions<SearchResult[], Error, SearchResult[], ReturnType<typeof queryKeys.search.results>>,
  'queryKey' | 'queryFn'
>;

export function useSubtitleSearchQuery(query: string, options?: SearchQueryOptions) {
  const trimmedQuery = query.trim();

  return useQuery({
    queryKey: queryKeys.search.results(query),
    queryFn: () => searchSubtitles(query),
    enabled: trimmedQuery.length > 0,
    ...options,
  });
}
