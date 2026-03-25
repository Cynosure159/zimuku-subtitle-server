import type { MediaSelection, ScannedFile } from '../types/api';

export interface MediaSelectorItem {
  id: number | string;
  title: string;
  path: string;
  path_type: 'movie' | 'tv';
  year?: number;
  episode_count?: number;
  seasons?: number[];
  seasonEpisodes?: Record<number, number[]>;
}

export function buildMediaSelectorItems(
  rawData: ScannedFile[],
  mediaType: 'movie' | 'tv'
): MediaSelectorItem[] {
  if (mediaType === 'movie') {
    return rawData.map(file => ({
      id: file.id,
      title: file.extracted_title || file.filename,
      path: file.file_path,
      path_type: file.type as 'movie' | 'tv',
      year: file.year ? parseInt(file.year, 10) : undefined,
    }));
  }

  const grouped = new Map<string, MediaSelectorItem>();

  for (const file of rawData) {
    const title = file.extracted_title || file.filename;
    // 使用稳定字符串 key，避免原先按字符码求和带来的碰撞风险。
    const itemId = `tv:${title}`;

    if (!grouped.has(title)) {
      grouped.set(title, {
        id: itemId,
        title,
        path: file.file_path,
        path_type: 'tv',
        seasons: [],
        episode_count: 0,
        seasonEpisodes: {},
      });
    }

    const item = grouped.get(title)!;
    const season = file.season;
    const episode = file.episode;

    if (season !== null && season !== undefined) {
      // MediaSelector 只做展示聚合，不改动原始扫描结果顺序。
      if (!item.seasons!.includes(season)) {
        item.seasons!.push(season);
      }

      if (episode !== null && episode !== undefined) {
        if (!item.seasonEpisodes![season]) {
          item.seasonEpisodes![season] = [];
        }

        if (!item.seasonEpisodes![season].includes(episode)) {
          item.seasonEpisodes![season].push(episode);
        }
      }
    }

    item.episode_count = (item.episode_count || 0) + 1;
  }

  for (const item of grouped.values()) {
    item.seasons?.sort((a, b) => a - b);

    if (!item.seasonEpisodes) {
      continue;
    }

    for (const season of Object.keys(item.seasonEpisodes)) {
      item.seasonEpisodes[parseInt(season, 10)].sort((a, b) => a - b);
    }
  }

  return Array.from(grouped.values());
}

export function buildMediaSelection(
  item: MediaSelectorItem,
  rawData: ScannedFile[],
  season?: number
): MediaSelection {
  // 回查原始文件，保证返回给下载弹窗的仍是后端认可的真实文件 id/path。
  const file = rawData.find(scannedFile => (scannedFile.extracted_title || scannedFile.filename) === item.title);

  return {
    id: file?.id || item.id,
    title: item.title,
    type: item.path_type,
    path: file?.file_path || item.path,
    year: item.year,
    episode_count: item.episode_count,
    season,
    episodes: season && item.seasonEpisodes ? item.seasonEpisodes[season] : undefined,
  };
}
