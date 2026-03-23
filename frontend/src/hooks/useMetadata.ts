import { useQuery } from '@tanstack/react-query';
import { fetchMediaMetadata, getMediaPosterUrl, type MediaMetadata } from '../api';

export type { MediaMetadata };

export function useMediaMetadata(fileId: number | null) {
  return useQuery({
    queryKey: ['media', 'metadata', fileId],
    queryFn: () => fetchMediaMetadata(fileId!),
    enabled: fileId !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });
}

export function useMediaPosterUrl(posterPath: string | null | undefined): string | null {
  if (!posterPath) return null;
  return getMediaPosterUrl(posterPath);
}
