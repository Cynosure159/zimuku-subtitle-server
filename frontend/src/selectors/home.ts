import type { ScannedFile } from '../types/api';

export interface HomeStats {
  totalFiles: number;
  hasSubtitle: number;
  missingSubtitle: number;
  totalMovies: number;
  hasSubtitleMovies: number;
  missingMovies: number;
  totalSeries: number;
  hasSubtitleSeries: number;
  missingSeries: number;
}

export function buildHomeStats(movieFiles: ScannedFile[], tvFiles: ScannedFile[]): HomeStats {
  const totalMovies = movieFiles.length;
  const hasSubtitleMovies = movieFiles.filter(file => file.has_subtitle).length;
  const totalSeries = tvFiles.length;
  const hasSubtitleSeries = tvFiles.filter(file => file.has_subtitle).length;

  return {
    totalFiles: totalMovies + totalSeries,
    hasSubtitle: hasSubtitleMovies + hasSubtitleSeries,
    missingSubtitle: totalMovies - hasSubtitleMovies + (totalSeries - hasSubtitleSeries),
    totalMovies,
    hasSubtitleMovies,
    missingMovies: totalMovies - hasSubtitleMovies,
    totalSeries,
    hasSubtitleSeries,
    missingSeries: totalSeries - hasSubtitleSeries,
  };
}

export function buildRecentMedia(movieFiles: ScannedFile[], tvFiles: ScannedFile[], limit = 6): ScannedFile[] {
  const titlesSeen = new Set<string>();
  const recentFiles: ScannedFile[] = [];
  const allFiles = [...movieFiles, ...tvFiles].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );

  for (const file of allFiles) {
    // 首页最近媒体按“类型 + 标题”去重，避免同一剧集多集把列表占满。
    const key = `${file.type}:${file.extracted_title}`;
    if (titlesSeen.has(key)) {
      continue;
    }

    titlesSeen.add(key);
    recentFiles.push(file);

    if (recentFiles.length >= limit) {
      break;
    }
  }

  return recentFiles;
}
