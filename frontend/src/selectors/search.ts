import type { SearchResult } from '../types/api';

export function getSearchFilterLabel(activeFilter: string, translate: (key: string, options?: object) => string) {
  const filterMap: Record<string, string> = {
    [translate('searchFilter.all')]: translate('searchFilter.all'),
    [translate('searchFilter.simplified')]: translate('searchFilter.simplified_short', { defaultValue: '简体' }),
    [translate('searchFilter.traditional')]: translate('searchFilter.traditional_short', { defaultValue: '繁体' }),
    [translate('searchFilter.english')]: translate('searchFilter.english_short', { defaultValue: '英文' }),
    [translate('searchFilter.bilingual')]: translate('searchFilter.bilingual_short', { defaultValue: '双语' }),
  };

  return filterMap[activeFilter] || activeFilter;
}

export function filterSearchResults(
  results: SearchResult[],
  activeFilter: string,
  allLabel: string,
  filterLabel: string
): SearchResult[] {
  return results.filter(item => {
    if (activeFilter === allLabel) {
      return true;
    }

    // 保持现有行为：没有 lang 的结果仍然放行，不因为筛选被隐藏。
    if (!item.lang) {
      return true;
    }

    return item.lang.some(lang => lang.includes(filterLabel));
  });
}
