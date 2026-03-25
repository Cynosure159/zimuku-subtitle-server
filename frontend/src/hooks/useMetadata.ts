import { getMediaPosterUrl, type MediaMetadata } from '../api';
import { useMediaMetadataQuery } from './queries';

export type { MediaMetadata };

export function useMediaMetadata(fileId: number | null) {
  return useMediaMetadataQuery(fileId);
}

export function useMediaPosterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath) return null;
  return getMediaPosterUrl(posterPath);
}
