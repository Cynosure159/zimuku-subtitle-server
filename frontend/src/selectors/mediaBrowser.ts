import { getMediaPosterUrl } from '../api';
import { parseMediaYear } from '../lib/mediaUtils';
import type { MediaMetadata, SidebarItem, SortOption, SortOrder, TaskStatus } from '../types/api';
import type { MovieGroup, TvGroup } from './mediaGrouping';

export interface SidebarEntry<TGroup extends MovieGroup | TvGroup> {
  group: TGroup;
  item: SidebarItem;
}

export function getDefaultSortOrder(option: SortOption): SortOrder {
  return option === 'name' ? 'asc' : 'desc';
}

export function getSortedSeasonNumbers(series: TvGroup | undefined): number[] {
  if (!series) {
    return [];
  }

  return Object.keys(series.seasons)
    .map(Number)
    .sort((a, b) => a - b);
}

export function isMovieGroup(group: MovieGroup | TvGroup): group is MovieGroup {
  return 'files' in group;
}

export function buildSidebarItem(
  group: MovieGroup | TvGroup,
  metadata?: MediaMetadata
): SidebarItem {
  // 侧栏展示优先走 metadata/NFO，保证海报、标题、年份与详情卡片口径一致。
  const posterUrl = metadata?.poster_path ? getMediaPosterUrl(metadata.poster_path) : null;
  const displayTitle = metadata?.nfo_data?.title || group.title;
  const year = metadata?.nfo_data?.year ?? group.year;

  return {
    id: group.title,
    displayTitle,
    year: year ?? undefined,
    totalCount: group.totalCount,
    hasSubCount: group.hasSubCount,
    poster: posterUrl,
    createdAt: group.createdAt,
  };
}

export function orderSidebarEntriesByDisplayYear<TGroup extends MovieGroup | TvGroup>(
  entries: SidebarEntry<TGroup>[],
  sortOrder: SortOrder
): SidebarEntry<TGroup>[] {
  return [...entries].sort((a, b) => {
    const yearA = parseMediaYear(a.item.year || a.group.year);
    const yearB = parseMediaYear(b.item.year || b.group.year);
    const comparison = yearA - yearB;

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

export function orderSidebarEntries<TGroup extends MovieGroup | TvGroup>(
  entries: SidebarEntry<TGroup>[],
  sortOption: SortOption,
  sortOrder: SortOrder
): SidebarEntry<TGroup>[] {
  // 只有年份排序需要按 sidebar 展示值重排，其余排序已在分组 selector 完成。
  if (sortOption !== 'year') {
    return entries;
  }

  return orderSidebarEntriesByDisplayYear(entries, sortOrder);
}

export function findGroupByTitle<TGroup extends { title: string }>(
  groups: TGroup[],
  title: string | null
): TGroup | undefined {
  if (!title) {
    return undefined;
  }

  return groups.find(group => group.title === title);
}

export function getSelectionFromUrl<TGroup extends { title: string }>(
  groups: TGroup[],
  titleFromUrl: string | null,
  seasonFromUrl: string | null
): { title: string | null; season?: number } | null {
  if (!titleFromUrl) {
    return null;
  }

  // 只接受当前列表里真实存在的项，避免 URL 残留参数把页面带到无效选中状态。
  const matchedGroup = findGroupByTitle(groups, titleFromUrl);
  if (!matchedGroup) {
    return null;
  }

  const selection: { title: string | null; season?: number } = { title: titleFromUrl };

  if (seasonFromUrl) {
    selection.season = Number(seasonFromUrl);
  }

  return selection;
}

export function getNextSelectedTitle<TGroup extends { title: string }>(
  groups: TGroup[],
  selectedTitle: string | null
): string | null {
  if (groups.length === 0) {
    return null;
  }

  // 当前选中仍有效时保持不动，避免筛选/轮询刷新后无意义跳选。
  if (selectedTitle && groups.some(group => group.title === selectedTitle)) {
    return selectedTitle;
  }

  return groups[0].title;
}

export function getNextSelectedSeason(
  availableSeasons: number[],
  selectedSeason: number
): number | null {
  if (availableSeasons.length === 0) {
    return null;
  }

  if (availableSeasons.includes(selectedSeason)) {
    return selectedSeason;
  }

  return availableSeasons[0];
}

export function getCurrentSeasonFiles(
  selectedSeries: TvGroup | undefined,
  selectedSeason: number
): TvGroup['seasons'][number] {
  if (!selectedSeries) {
    return [];
  }

  return selectedSeries.seasons[selectedSeason] || [];
}

export function getTotalEpisodesCount(selectedSeries: TvGroup | undefined): number {
  if (!selectedSeries) {
    return 0;
  }

  return Object.values(selectedSeries.seasons).reduce((count, files) => count + files.length, 0);
}

export function isSelectedSeasonMatching(
  status: TaskStatus,
  selectedSeries: TvGroup | undefined,
  selectedSeason: number
): boolean {
  if (!selectedSeries) {
    return false;
  }

  return status.matching_seasons.some(
    season => season.title === selectedSeries.title && season.season === selectedSeason
  );
}
