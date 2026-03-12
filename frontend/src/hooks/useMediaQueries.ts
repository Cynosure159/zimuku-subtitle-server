import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMediaPaths,
  listScannedFiles,
  getMediaStatus,
  addMediaPath,
  deleteMediaPath,
  updateMediaPath,
  triggerMediaMatch,
} from '../api';

export interface MediaPath {
  id: number;
  path: string;
  type: string;
  enabled: boolean;
  last_scanned_at?: string;
}

export interface ScannedFile {
  id: number;
  filename: string;
  extracted_title: string;
  file_path: string;
  year?: string;
  season?: number;
  episode?: number;
  has_subtitle: boolean;
  created_at: string;
}

export interface MediaStatus {
  is_scanning: boolean;
  matching_files: number[];
  matching_seasons: { title: string; season: number }[];
}

// Query hooks
export function useMediaPaths() {
  return useQuery<MediaPath[]>({
    queryKey: ['media', 'paths'],
    queryFn: listMediaPaths,
  });
}

export function useScannedFiles(type?: 'movie' | 'tv') {
  return useQuery<ScannedFile[]>({
    queryKey: ['media', 'files', type],
    queryFn: () => listScannedFiles(type),
  });
}

export function useMediaStatus() {
  return useQuery<MediaStatus>({
    queryKey: ['media', 'status'],
    queryFn: getMediaStatus,
    refetchInterval: (query) => {
      const status = query.state.data;
      if (!status) return false;
      const hasActiveTasks =
        status.is_scanning ||
        status.matching_files.length > 0 ||
        status.matching_seasons.length > 0;
      return hasActiveTasks ? 2000 : false;
    },
  });
}

// Mutation hooks
export function useAddMediaPath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ path, path_type }: { path: string; path_type: 'movie' | 'tv' }) =>
      addMediaPath(path, path_type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', 'paths'] });
    },
  });
}

export function useDeleteMediaPath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pathId: number) => deleteMediaPath(pathId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', 'paths'] });
    },
  });
}

export function useUpdateMediaPath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pathId,
      enabled,
      path_type,
    }: {
      pathId: number;
      enabled?: boolean;
      path_type?: 'movie' | 'tv';
    }) => updateMediaPath(pathId, enabled, path_type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', 'paths'] });
    },
  });
}

export function useTriggerMediaMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (path_type?: 'movie' | 'tv') => triggerMediaMatch(path_type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', 'status'] });
    },
  });
}
