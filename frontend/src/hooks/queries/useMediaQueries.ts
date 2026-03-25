import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import {
  fetchMediaMetadata,
  getTaskStatus,
  listMediaPaths,
  listScannedFiles,
} from '../../api';
import { queryKeys } from '../../lib/queryKeys';
import type { TaskStatus } from '../../types/api';

export function useMediaPathsQuery() {
  return useQuery({
    queryKey: queryKeys.media.paths(),
    queryFn: listMediaPaths,
  });
}

export function useMediaFilesQuery(pathType?: 'movie' | 'tv') {
  return useQuery({
    queryKey: queryKeys.media.files(pathType),
    queryFn: () => listScannedFiles(pathType),
  });
}

export function useMediaMetadataQuery(fileId: number | null) {
  return useQuery({
    queryKey: queryKeys.media.metadata(fileId),
    queryFn: () => fetchMediaMetadata(fileId!),
    enabled: fileId !== null,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    throwOnError: false,
  });
}

type MediaTaskStatusQueryOptions = Omit<
  UseQueryOptions<TaskStatus, Error, TaskStatus, ReturnType<typeof queryKeys.media.taskStatus>>,
  'queryKey' | 'queryFn'
>;

export function useMediaTaskStatusQuery(options?: MediaTaskStatusQueryOptions) {
  return useQuery({
    queryKey: queryKeys.media.taskStatus(),
    queryFn: getTaskStatus,
    ...options,
  });
}
