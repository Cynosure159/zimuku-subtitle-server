import { useMemo } from 'react';
import type { ScannedFile, SortOption, FilterOption, SortOrder } from '../api';
import { buildGroupedMedia, type MovieGroup, type TvGroup } from '../selectors/mediaGrouping';

export type { MovieGroup, TvGroup } from '../selectors/mediaGrouping';

export function useMediaGrouping(
  files: ScannedFile[],
  type: 'movie' | 'tv',
  searchTerm: string,
  sortOption: SortOption,
  sortOrder: SortOrder,
  filterOption: FilterOption,
  unknownLabel: string
): MovieGroup[] | TvGroup[] {
  return useMemo(() => {
    return buildGroupedMedia(files, type, searchTerm, sortOption, sortOrder, filterOption, unknownLabel);
  }, [files, type, searchTerm, sortOption, sortOrder, filterOption, unknownLabel]);
}
