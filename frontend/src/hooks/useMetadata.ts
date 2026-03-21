import { useQuery } from '@tanstack/react-query';
import { API_BASE, fetchMediaMetadata, type MediaMetadata } from '../api';

export type { MediaMetadata };

export function useMediaMetadata(fileId: number | null) {
  return useQuery({
    queryKey: ['media', 'metadata', fileId],
    queryFn: () => fetchMediaMetadata(fileId!),
    enabled: fileId !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    throwOnError: false,
  });
}

export function useMediaPosterUrl(posterPath: string | null): string | null {
  if (!posterPath) return null;
  const encoded = encodeURIComponent(posterPath);
  return `${API_BASE}/media/poster?path=${encoded}`;
}
