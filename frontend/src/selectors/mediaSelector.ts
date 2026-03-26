import { getMediaTitle, parseMediaYear } from '../lib/mediaUtils';
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

function getSelectorTitle(file: ScannedFile): string {
  return getMediaTitle(file);
}

function addUniqueNumber(numbers: number[], value: number): void {
  if (!numbers.includes(value)) {
    numbers.push(value);
  }
}

export function buildMediaSelectorItems(
  rawData: ScannedFile[],
  mediaType: 'movie' | 'tv'
): MediaSelectorItem[] {
  if (mediaType === 'movie') {
    return rawData.map(file => ({
      id: file.id,
      title: getSelectorTitle(file),
      path: file.file_path,
      path_type: file.type as 'movie' | 'tv',
      year: file.year ? parseMediaYear(file.year) : undefined,
    }));
  }

  const grouped = new Map<string, MediaSelectorItem>();

  for (const file of rawData) {
    const title = getSelectorTitle(file);
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
      addUniqueNumber(item.seasons!, season);

      if (episode !== null && episode !== undefined) {
        if (!item.seasonEpisodes![season]) {
          item.seasonEpisodes![season] = [];
        }

        addUniqueNumber(item.seasonEpisodes![season], episode);
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
  const file = rawData.find(scannedFile => getSelectorTitle(scannedFile) === item.title);

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
