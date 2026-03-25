import type { ScannedFile, FilterOption, SortOption, SortOrder } from '../types/api';

export interface BaseMediaGroup {
  title: string;
  year?: string;
  createdAt?: string;
  hasSubCount: number;
  totalCount: number;
}

export interface MovieGroup extends BaseMediaGroup {
  files: ScannedFile[];
}

export interface TvGroup extends BaseMediaGroup {
  firstPath: string;
  seriesRootPath: string;
  firstFileId: number;
  seasons: Record<number, ScannedFile[]>;
}

function sortGroups<T extends BaseMediaGroup>(
  groups: T[],
  sortOption: SortOption,
  sortOrder: SortOrder
): T[] {
  return [...groups].sort((a, b) => {
    let comparison = 0;

    if (sortOption === 'year') {
      const yearA = parseInt(a.year || '0', 10);
      const yearB = parseInt(b.year || '0', 10);
      comparison = yearA - yearB;
    } else if (sortOption === 'created') {
      comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
    } else if (sortOption === 'status') {
      // 用“已匹配占比”而不是绝对数量排序，避免多文件条目天然排在前面。
      const ratioA = a.totalCount === 0 ? 0 : a.hasSubCount / a.totalCount;
      const ratioB = b.totalCount === 0 ? 0 : b.hasSubCount / b.totalCount;
      comparison = ratioA - ratioB;
    } else {
      comparison = a.title.localeCompare(b.title);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

function filterGroups<T extends BaseMediaGroup>(groups: T[], filterOption: FilterOption): T[] {
  if (filterOption === 'missing') {
    return groups.filter(group => group.hasSubCount < group.totalCount);
  }

  return groups;
}

function matchesSearchTerm(title: string, searchTerm: string): boolean {
  return title.toLowerCase().includes(searchTerm.toLowerCase());
}

export function buildMovieGroups(files: ScannedFile[], unknownLabel: string): MovieGroup[] {
  const groups = new Map<string, MovieGroup>();

  for (const file of files) {
    const title = file.extracted_title || unknownLabel;

    if (!groups.has(title)) {
      groups.set(title, {
        title,
        year: file.year ?? undefined,
        files: [],
        createdAt: file.created_at,
        hasSubCount: 0,
        totalCount: 0,
      });
    }

    const group = groups.get(title)!;
    group.files.push(file);
    group.totalCount += 1;
    if (file.has_subtitle) {
      group.hasSubCount += 1;
    }
  }

  return Array.from(groups.values());
}

export function buildTvGroups(files: ScannedFile[], unknownLabel: string): TvGroup[] {
  const groups = new Map<string, TvGroup>();

  for (const file of files) {
    const title = file.extracted_title || unknownLabel;

    if (!groups.has(title)) {
      groups.set(title, {
        title,
        year: file.year ?? undefined,
        totalCount: 0,
        hasSubCount: 0,
        firstPath: file.file_path,
        seriesRootPath: file.series_root_path || file.file_path.split('/').slice(0, -1).join('/'),
        firstFileId: file.id,
        createdAt: file.created_at,
        seasons: {},
      });
    }

    const group = groups.get(title)!;
    // 兼容没有季号的旧扫描结果，默认归到第 1 季，保持现有展示方式不变。
    const season = file.season || 1;

    if (!group.seasons[season]) {
      group.seasons[season] = [];
    }

    group.seasons[season].push(file);
    group.seasons[season].sort((a, b) => (a.episode || 0) - (b.episode || 0));
    group.totalCount += 1;
    if (file.has_subtitle) {
      group.hasSubCount += 1;
    }
  }

  return Array.from(groups.values());
}

export function buildGroupedMedia(
  files: ScannedFile[],
  type: 'movie',
  searchTerm: string,
  sortOption: SortOption,
  sortOrder: SortOrder,
  filterOption: FilterOption,
  unknownLabel: string
): MovieGroup[];
export function buildGroupedMedia(
  files: ScannedFile[],
  type: 'tv',
  searchTerm: string,
  sortOption: SortOption,
  sortOrder: SortOrder,
  filterOption: FilterOption,
  unknownLabel: string
): TvGroup[];
export function buildGroupedMedia(
  files: ScannedFile[],
  type: 'movie' | 'tv',
  searchTerm: string,
  sortOption: SortOption,
  sortOrder: SortOrder,
  filterOption: FilterOption,
  unknownLabel: string
): MovieGroup[] | TvGroup[] {
  if (type === 'movie') {
    const groups = buildMovieGroups(files, unknownLabel);
    const searchedGroups = groups.filter(group => matchesSearchTerm(group.title, searchTerm));
    const filteredGroups = filterGroups(searchedGroups, filterOption);

    return sortGroups(filteredGroups, sortOption, sortOrder);
  }

  const groups = buildTvGroups(files, unknownLabel);
  // movie/tv 分支拆开返回，既方便类型收窄，也避免 controller 再重复写一套分组逻辑。
  const searchedGroups = groups.filter(group => matchesSearchTerm(group.title, searchTerm));
  const filteredGroups = filterGroups(searchedGroups, filterOption);

  return sortGroups(filteredGroups, sortOption, sortOrder);
}
