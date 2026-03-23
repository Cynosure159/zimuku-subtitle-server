import { useMemo } from 'react';
import type { ScannedFile, SortOption, FilterOption, SortOrder } from '../api';

export interface MovieGroup {
  title: string;
  year?: string;
  files: ScannedFile[];
  createdAt?: string;
  hasSubCount: number;
  totalCount: number;
}

export interface TvGroup {
  title: string;
  year?: string;
  totalCount: number;
  hasSubCount: number;
  firstPath: string;
  seriesRootPath: string;
  firstFileId: number;
  createdAt?: string;
  seasons: Record<number, ScannedFile[]>;
}

function sortGroups<T extends { title: string; year?: string; createdAt?: string; hasSubCount: number; totalCount: number }>(
  result: T[],
  sortOption: SortOption,
  sortOrder: SortOrder
): T[] {
  result.sort((a, b) => {
    let comparison = 0;
    if (sortOption === 'year') {
      const yearA = parseInt(a.year || '0');
      const yearB = parseInt(b.year || '0');
      comparison = yearA - yearB;
    } else if (sortOption === 'created') {
      comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
    } else if (sortOption === 'status') {
      const ratioA = a.hasSubCount / a.totalCount;
      const ratioB = b.hasSubCount / b.totalCount;
      comparison = ratioA - ratioB;
    } else {
      comparison = a.title.localeCompare(b.title);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  return result;
}

function filterGroups<T extends { title: string; hasSubCount: number; totalCount: number }>(
  result: T[],
  filterOption: FilterOption
): T[] {
  if (filterOption === 'missing') {
    return result.filter(m => m.hasSubCount < m.totalCount);
  }
  return result;
}

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
    if (type === 'movie') {
      const groups: Record<string, MovieGroup> = {};

      files.forEach(file => {
        const title = file.extracted_title || unknownLabel;
        if (!groups[title]) {
          groups[title] = {
            title,
            year: file.year ?? undefined,
            files: [],
            createdAt: file.created_at,
            hasSubCount: 0,
            totalCount: 0,
          };
        }
        groups[title].files.push(file);
        groups[title].totalCount++;
        if (file.has_subtitle) groups[title].hasSubCount++;
      });

      let result = Object.values(groups).filter(m =>
        m.title.toLowerCase().includes(searchTerm.toLowerCase())
      );

      result = filterGroups(result, filterOption);
      result = sortGroups(result, sortOption, sortOrder);

      return result;
    } else {
      const groups: Record<string, TvGroup> = {};

      files.forEach(file => {
        const title = file.extracted_title || unknownLabel;
        if (!groups[title]) {
          groups[title] = {
            title,
            year: file.year ?? undefined,
            totalCount: 0,
            hasSubCount: 0,
            firstPath: file.file_path,
            seriesRootPath: file.series_root_path || file.file_path.split('/').slice(0, -1).join('/'),
            firstFileId: file.id,
            createdAt: file.created_at,
            seasons: {},
          };
        }
        const s = file.season || 1;
        if (!groups[title].seasons[s]) {
          groups[title].seasons[s] = [];
        }
        groups[title].seasons[s].push(file);
        groups[title].seasons[s].sort((a, b) => (a.episode || 0) - (b.episode || 0));

        groups[title].totalCount++;
        if (file.has_subtitle) groups[title].hasSubCount++;
      });

      let result = Object.values(groups).filter(m =>
        m.title.toLowerCase().includes(searchTerm.toLowerCase())
      );

      result = filterGroups(result, filterOption);
      result = sortGroups(result, sortOption, sortOrder);

      return result;
    }
  }, [files, type, searchTerm, sortOption, sortOrder, filterOption, unknownLabel]);
}
