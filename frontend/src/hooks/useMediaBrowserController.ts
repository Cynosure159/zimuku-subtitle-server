import { useEffect, useMemo, useState, startTransition } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  fetchMediaMetadata,
  getMediaPosterUrl,
  triggerMediaMatch,
  type FilterOption,
  type SortOption,
  type SortOrder,
} from '../api';
import { useMediaGrouping, type MovieGroup, type TvGroup } from './useMediaGrouping';
import { useMediaPolling } from './useMediaPolling';
import { queryKeys } from '../lib/queryKeys';
import { useUIStore } from '../stores/useUIStore';
import type { SidebarItem } from '../types/api';

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

interface BaseControllerOptions {
  unknownLabel: string;
}

interface MovieControllerOptions extends BaseControllerOptions {
  type: 'movie';
}

interface TvControllerOptions extends BaseControllerOptions {
  type: 'tv';
}

interface BaseMediaBrowserController<TGroup extends MovieGroup | TvGroup> {
  files: ReturnType<typeof useMediaPolling>['files'];
  groupedItems: TGroup[];
  selectedItem: TGroup | undefined;
  sidebarItems: SidebarItem[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedTitle: string | null;
  setSelectedTitle: (title: string) => void;
  sortOption: SortOption;
  sortOrder: SortOrder;
  filterOption: FilterOption;
  handleSortChange: (option: SortOption) => void;
  setFilterOption: (option: FilterOption) => void;
  handleRefresh: () => Promise<void>;
  status: ReturnType<typeof useMediaPolling>['status'];
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setIsScanningOptimistic: ReturnType<typeof useMediaPolling>['setIsScanningOptimistic'];
  setMatchingFileOptimistic: ReturnType<typeof useMediaPolling>['setMatchingFileOptimistic'];
  setMatchingSeasonOptimistic: ReturnType<typeof useMediaPolling>['setMatchingSeasonOptimistic'];
}

interface MovieBrowserController extends BaseMediaBrowserController<MovieGroup> {
  type: 'movie';
}

interface TvBrowserController extends BaseMediaBrowserController<TvGroup> {
  type: 'tv';
  selectedSeason: number;
  setSelectedSeason: (season: number) => void;
  availableSeasons: number[];
  currentSeasonFiles: TvGroup['seasons'][number];
  totalEpisodesCount: number;
  isSelectedSeasonMatching: boolean;
}

interface SidebarEntry<TGroup extends MovieGroup | TvGroup> {
  group: TGroup;
  item: SidebarItem;
}

function getDefaultSortOrder(option: SortOption): SortOrder {
  return option === 'name' ? 'asc' : 'desc';
}

function getSortedSeasonNumbers(series: TvGroup | undefined): number[] {
  if (!series) return [];
  return Object.keys(series.seasons)
    .map(Number)
    .sort((a, b) => a - b);
}

function isMovieGroup(group: MovieGroup | TvGroup): group is MovieGroup {
  return 'files' in group;
}

function sortEntriesByDisplayYear<TGroup extends MovieGroup | TvGroup>(
  entries: SidebarEntry<TGroup>[],
  sortOrder: SortOrder
): SidebarEntry<TGroup>[] {
  return [...entries].sort((a, b) => {
    const yearA = parseInt(a.item.year || a.group.year || '0', 10);
    const yearB = parseInt(b.item.year || b.group.year || '0', 10);
    const comparison = yearA - yearB;
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

function useKeepDesktopSidebarOpen(toggleSidebar: () => void) {
  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches && !useUIStore.getState().sidebarOpen) {
        toggleSidebar();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [toggleSidebar]);
}

function useSidebarEntries<TGroup extends MovieGroup | TvGroup>(
  groups: TGroup[],
  type: 'movie' | 'tv'
) {
  const metadataQueries = useQueries({
    queries: groups.map(group => {
      const fileId = type === 'movie'
        ? (isMovieGroup(group) ? group.files[0]?.id : undefined)
        : (isMovieGroup(group) ? undefined : group.firstFileId);

      return {
        queryKey: queryKeys.media.metadata(fileId ?? null),
        queryFn: () => fetchMediaMetadata(fileId!),
        staleTime: 10 * 60 * 1000,
        retry: 1,
        enabled: typeof fileId === 'number',
      };
    }),
  });

  return useMemo<SidebarEntry<TGroup>[]>(() => {
    return groups.map((group, index) => {
      const metadata = metadataQueries[index]?.data;
      const posterUrl = metadata?.poster_path ? getMediaPosterUrl(metadata.poster_path) : null;
      const displayTitle = metadata?.nfo_data?.title || group.title;
      const year = metadata?.nfo_data?.year ?? group.year;

      return {
        group,
        item: {
          id: group.title,
          displayTitle,
          year: year ?? undefined,
          totalCount: group.totalCount,
          hasSubCount: group.hasSubCount,
          poster: posterUrl,
          createdAt: group.createdAt,
        },
      };
    });
  }, [groups, metadataQueries]);
}

export function useMediaBrowserController(options: MovieControllerOptions): MovieBrowserController;
export function useMediaBrowserController(options: TvControllerOptions): TvBrowserController;
export function useMediaBrowserController(
  options: MovieControllerOptions | TvControllerOptions
): MovieBrowserController | TvBrowserController {
  const { type, unknownLabel } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    files,
    status,
    setIsScanningOptimistic,
    setMatchingFileOptimistic,
    setMatchingSeasonOptimistic,
  } = useMediaPolling(type);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [selectedSeason, setSelectedSeason] = useState(1);
  const { sidebarOpen, toggleSidebar } = useUIStore();

  useKeepDesktopSidebarOpen(toggleSidebar);

  const groupedItems = useMediaGrouping(
    files,
    type,
    searchTerm,
    sortOption,
    sortOrder,
    filterOption,
    unknownLabel
  ) as MovieGroup[] | TvGroup[];

  const movieGroupedItems = type === 'movie' ? (groupedItems as MovieGroup[]) : [];
  const tvGroupedItems = type === 'tv' ? (groupedItems as TvGroup[]) : [];

  const movieSidebarEntries = useSidebarEntries(movieGroupedItems, 'movie');
  const tvSidebarEntries = useSidebarEntries(tvGroupedItems, 'tv');
  const orderedMovieEntries = useMemo(() => {
    if (sortOption !== 'year') return movieSidebarEntries;
    return sortEntriesByDisplayYear(movieSidebarEntries, sortOrder);
  }, [movieSidebarEntries, sortOption, sortOrder]);
  const orderedTvEntries = useMemo(() => {
    if (sortOption !== 'year') return tvSidebarEntries;
    return sortEntriesByDisplayYear(tvSidebarEntries, sortOrder);
  }, [tvSidebarEntries, sortOption, sortOrder]);
  const orderedEntries = type === 'movie' ? orderedMovieEntries : orderedTvEntries;

  const orderedGroupedItems = useMemo(() => orderedEntries.map(entry => entry.group), [orderedEntries]);
  const orderedMovieGroupedItems = useMemo(
    () => (type === 'movie' ? (orderedGroupedItems as MovieGroup[]) : []),
    [orderedGroupedItems, type]
  );
  const orderedTvGroupedItems = useMemo(
    () => (type === 'tv' ? (orderedGroupedItems as TvGroup[]) : []),
    [orderedGroupedItems, type]
  );

  const sidebarItems = useMemo(
    () => orderedEntries.map(entry => entry.item),
    [orderedEntries]
  );

  useEffect(() => {
    const titleFromUrl = searchParams.get('title');
    const seasonFromUrl = searchParams.get('season');
    const matchingItem = (type === 'movie' ? orderedMovieGroupedItems : orderedTvGroupedItems).find(
      item => item.title === titleFromUrl
    );

    if (titleFromUrl && matchingItem) {
      startTransition(() => {
        setSelectedTitle(titleFromUrl);
        if (type === 'tv' && seasonFromUrl) {
          setSelectedSeason(Number(seasonFromUrl));
        }
      });

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('title');
      nextParams.delete('season');
      setSearchParams(nextParams, { replace: true });
      return;
    }

    if (
      (type === 'movie' ? orderedMovieGroupedItems.length > 0 : orderedTvGroupedItems.length > 0) &&
      (!selectedTitle ||
        !(type === 'movie' ? orderedMovieGroupedItems : orderedTvGroupedItems).some(
          item => item.title === selectedTitle
        ))
    ) {
      const timer = setTimeout(() => {
        const firstItem = type === 'movie' ? orderedMovieGroupedItems[0] : orderedTvGroupedItems[0];
        setSelectedTitle(firstItem.title);

        if (type === 'tv') {
          const firstSeason = getSortedSeasonNumbers(firstItem as TvGroup)[0];
          if (typeof firstSeason === 'number') {
            setSelectedSeason(firstSeason);
          }
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [
    orderedMovieGroupedItems,
    orderedTvGroupedItems,
    searchParams,
    selectedTitle,
    setSearchParams,
    type,
  ]);

  const selectedItem = useMemo(
    () =>
      (type === 'movie' ? orderedMovieGroupedItems : orderedTvGroupedItems).find(
        item => item.title === selectedTitle
      ),
    [orderedMovieGroupedItems, orderedTvGroupedItems, selectedTitle, type]
  );

  const availableSeasons = useMemo(
    () => (type === 'tv' ? getSortedSeasonNumbers(selectedItem as TvGroup | undefined) : []),
    [selectedItem, type]
  );

  useEffect(() => {
    if (type !== 'tv' || !selectedItem) return;
    if (availableSeasons.includes(selectedSeason)) return;
    if (availableSeasons.length === 0) return;

    const timer = setTimeout(() => setSelectedSeason(availableSeasons[0]), 0);
    return () => clearTimeout(timer);
  }, [availableSeasons, selectedItem, selectedSeason, type]);

  const currentSeasonFiles = useMemo(() => {
    if (type !== 'tv' || !selectedItem) return [];
    return (selectedItem as TvGroup).seasons[selectedSeason] || [];
  }, [selectedItem, selectedSeason, type]);

  const totalEpisodesCount = useMemo(() => {
    if (type !== 'tv' || !selectedItem) return 0;
    return Object.values((selectedItem as TvGroup).seasons).reduce((count, files) => count + files.length, 0);
  }, [selectedItem, type]);

  const isSelectedSeasonMatching = useMemo(() => {
    if (type !== 'tv' || !selectedItem) return false;
    return status.matching_seasons.some(
      season => season.title === selectedItem.title && season.season === selectedSeason
    );
  }, [selectedItem, selectedSeason, status.matching_seasons, type]);

  const handleSortChange = (option: SortOption) => {
    if (option === sortOption) {
      setSortOrder(current => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortOption(option);
    setSortOrder(getDefaultSortOrder(option));
  };

  const handleRefresh = async () => {
    try {
      setIsScanningOptimistic(true);
      setTimeout(() => setIsScanningOptimistic(false), 3000);
      await triggerMediaMatch(type);
    } catch (error: unknown) {
      console.error(error);
    }
  };

  if (type === 'movie') {
    return {
      type,
      files,
      groupedItems: orderedMovieGroupedItems,
      selectedItem: selectedItem as MovieGroup | undefined,
      sidebarItems,
      searchTerm,
      setSearchTerm,
      selectedTitle,
      setSelectedTitle,
      sortOption,
      sortOrder,
      filterOption,
      handleSortChange,
      setFilterOption,
      handleRefresh,
      status,
      sidebarOpen,
      toggleSidebar,
      setIsScanningOptimistic,
      setMatchingFileOptimistic,
      setMatchingSeasonOptimistic,
    };
  }

  return {
    type,
    files,
    groupedItems: orderedTvGroupedItems,
    selectedItem: selectedItem as TvGroup | undefined,
    sidebarItems,
    searchTerm,
    setSearchTerm,
    selectedTitle,
    setSelectedTitle,
    sortOption,
    sortOrder,
    filterOption,
    handleSortChange,
    setFilterOption,
    handleRefresh,
    status,
    sidebarOpen,
    toggleSidebar,
    setIsScanningOptimistic,
    setMatchingFileOptimistic,
    setMatchingSeasonOptimistic,
    selectedSeason,
    setSelectedSeason,
    availableSeasons,
    currentSeasonFiles,
    totalEpisodesCount,
    isSelectedSeasonMatching,
  };
}
