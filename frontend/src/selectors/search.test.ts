import { describe, expect, it } from 'vitest';
import { filterSearchResults, getSearchFilterLabel } from './search';
import type { SearchResult } from '../types/api';

const translate = (key: string) => {
  const messages: Record<string, string> = {
    'searchFilter.all': '全部',
    'searchFilter.simplified': '简体',
    'searchFilter.simplified_short': '简体',
    'searchFilter.traditional': '繁体',
    'searchFilter.traditional_short': '繁体',
    'searchFilter.english': '英文',
    'searchFilter.english_short': '英文',
    'searchFilter.bilingual': '双语',
    'searchFilter.bilingual_short': '双语',
  };

  return messages[key] || key;
};

const results: SearchResult[] = [
  { title: 'A', link: '/a', lang: ['简体'] },
  { title: 'B', link: '/b', lang: ['英文'] },
  { title: 'C', link: '/c' },
];

describe('search selectors', () => {
  it('能生成当前筛选标签', () => {
    expect(getSearchFilterLabel('简体', translate)).toBe('简体');
  });

  it('筛选时保留没有 lang 的结果', () => {
    expect(filterSearchResults(results, '简体', '全部', '简体').map(item => item.title)).toEqual(['A', 'C']);
  });
});
