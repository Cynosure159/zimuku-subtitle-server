import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface MediaMetadata {
  file_id: number;
  filename: string;
  nfo_data: {
    title?: string;
    year?: string;
    plot?: string;
    rating?: string;
    genres?: string[];
    director?: string;
  } | null;
  poster_path: string | null;
  fanart_path: string | null;
  txt_info: Record<string, string> | null;
}

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

async function fetchMediaMetadata(fileId: number): Promise<MediaMetadata> {
  const response = await api.get(`/media/metadata/${fileId}`);
  return response.data;
}

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
  return `http://127.0.0.1:8000/media/poster?path=${encoded}`;
}
