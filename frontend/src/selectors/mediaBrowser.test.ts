import { describe, expect, it } from 'vitest';
import {
  buildSidebarItem,
  getCurrentSeasonFiles,
  getNextSelectedSeason,
  getNextSelectedTitle,
  getSelectionFromUrl,
  getTotalEpisodesCount,
  isSelectedSeasonMatching,
  orderSidebarEntriesByDisplayYear,
} from './mediaBrowser';
import type { MediaMetadata, TaskStatus } from '../types/api';
import type { TvGroup } from './mediaGrouping';

const seriesGroup: TvGroup = {
  title: 'Series',
  year: '2020',
  totalCount: 2,
  hasSubCount: 1,
  firstPath: '/tv/Series/S01E01.mkv',
  seriesRootPath: '/tv/Series',
  firstFileId: 11,
  createdAt: '2026-03-21T09:00:00',
  seasons: {
    1: [
      {
        id: 11,
        filename: 'Series S01E01.mkv',
        extracted_title: 'Series',
        file_path: '/tv/Series/S01E01.mkv',
        year: '2020',
        season: 1,
        episode: 1,
        has_subtitle: true,
        type: 'tv',
        created_at: '2026-03-21T09:00:00',
      },
    ],
    2: [
      {
        id: 12,
        filename: 'Series S02E01.mkv',
        extracted_title: 'Series',
        file_path: '/tv/Series/S02E01.mkv',
        year: '2021',
        season: 2,
        episode: 1,
        has_subtitle: false,
        type: 'tv',
        created_at: '2026-03-22T09:00:00',
      },
    ],
  },
};

const metadata: MediaMetadata = {
  file_id: 11,
  filename: 'Series S01E01.mkv',
  nfo_data: {
    title: 'Series (NFO)',
    year: '2024',
  },
  poster_path: 'poster.jpg',
  fanart_path: null,
  txt_info: null,
};

const status: TaskStatus = {
  is_scanning: false,
  matching_files: [],
  matching_seasons: [{ title: 'Series', season: 2 }],
};

describe('mediaBrowser selectors', () => {
  it('sidebar item 优先使用 metadata 展示字段', () => {
    expect(buildSidebarItem(seriesGroup, metadata)).toMatchObject({
      displayTitle: 'Series (NFO)',
      year: '2024',
      poster: '/api/media/poster?path=poster.jpg',
    });
  });

  it('按展示年份排序侧栏条目', () => {
    const entries = [
      { group: { ...seriesGroup, title: 'A', year: '2020' }, item: { id: 'A', displayTitle: 'A', year: '2025', totalCount: 1, hasSubCount: 1 } },
      { group: { ...seriesGroup, title: 'B', year: '2024' }, item: { id: 'B', displayTitle: 'B', year: '2023', totalCount: 1, hasSubCount: 1 } },
    ];

    expect(orderSidebarEntriesByDisplayYear(entries, 'desc').map(entry => entry.item.id)).toEqual(['A', 'B']);
  });

  it('能解析 URL 选中项并回退默认选中', () => {
    expect(getSelectionFromUrl([seriesGroup], 'Series', '2')).toEqual({ title: 'Series', season: 2 });
    expect(getNextSelectedTitle([seriesGroup], null)).toBe('Series');
    expect(getNextSelectedSeason([1, 2], 3)).toBe(1);
  });

  it('能计算当前季文件、总集数和季级匹配状态', () => {
    expect(getCurrentSeasonFiles(seriesGroup, 2)).toHaveLength(1);
    expect(getTotalEpisodesCount(seriesGroup)).toBe(2);
    expect(isSelectedSeasonMatching(status, seriesGroup, 2)).toBe(true);
  });
});
