import { useMemo } from 'react';
import type { ScannedFile, SortOption, FilterOption, SortOrder } from '../api';
import { buildGroupedMedia, type MovieGroup, type TvGroup } from '../selectors/mediaGrouping';

export type { MovieGroup, TvGroup } from '../selectors/mediaGrouping';

type MediaType = 'movie' | 'tv';
type MediaGroups<TType extends MediaType> = TType extends 'movie' ? MovieGroup[] : TvGroup[];

export function useMediaGrouping<TType extends MediaType>(
  files: ScannedFile[],
  type: TType,
  searchTerm: string,
  sortOption: SortOption,
  sortOrder: SortOrder,
  filterOption: FilterOption,
  unknownLabel: string
): MediaGroups<TType> {
  return useMemo(() => {
    if (type === 'movie') {
      return buildGroupedMedia(files, 'movie', searchTerm, sortOption, sortOrder, filterOption, unknownLabel);
    }

    return buildGroupedMedia(files, 'tv', searchTerm, sortOption, sortOrder, filterOption, unknownLabel);
  }, [files, type, searchTerm, sortOption, sortOrder, filterOption, unknownLabel]) as MediaGroups<TType>;
}
