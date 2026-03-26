import type { ScannedFile } from '../types/api';

type FileTitleSource = Pick<ScannedFile, 'extracted_title' | 'filename'>;

export function parseMediaYear(value?: string | null): number {
  return parseInt(value || '0', 10);
}

export function getMediaTitle(file: FileTitleSource, fallback?: string): string {
  return file.extracted_title || fallback || file.filename;
}

export function getMediaSeasonNumber(season?: number | null, fallback = 1): number {
  return season || fallback;
}
