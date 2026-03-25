import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  addMediaPath,
  deleteMediaPath,
  fetchMediaMetadata,
  getTaskStatus,
  listMediaPaths,
  listScannedFiles,
  triggerMediaMatch,
} from '../../api';
import { queryKeys } from '../../lib/queryKeys';
import type { MediaPath, ScannedFile, TaskStatus } from '../../types/api';

type MediaPathsQueryOptions = Omit<
  UseQueryOptions<MediaPath[], Error, MediaPath[], ReturnType<typeof queryKeys.media.paths>>,
  'queryKey' | 'queryFn'
>;

type MediaFilesQueryOptions = Omit<
  UseQueryOptions<ScannedFile[], Error, ScannedFile[], ReturnType<typeof queryKeys.media.files>>,
  'queryKey' | 'queryFn'
>;

export function useMediaPathsQuery(options?: MediaPathsQueryOptions) {
  return useQuery({
    queryKey: queryKeys.media.paths(),
    queryFn: listMediaPaths,
    ...options,
  });
}

export function useMediaFilesQuery(pathType?: 'movie' | 'tv', options?: MediaFilesQueryOptions) {
  return useQuery({
    queryKey: queryKeys.media.files(pathType),
    queryFn: () => listScannedFiles(pathType),
    ...options,
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

export function useAddMediaPathMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, pathType }: { path: string; pathType: 'movie' | 'tv' }) =>
      addMediaPath(path, pathType),
    onSuccess: async (_, variables) => {
      // 路径变更会影响目录列表和对应媒体列表，两者都需要立即失效。
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.media.paths() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.media.files(variables.pathType) }),
      ]);
    },
  });
}

export function useDeleteMediaPathMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, pathType }: { id: number; pathType: 'movie' | 'tv' }) =>
      deleteMediaPath(id).then(() => pathType),
    onSuccess: async pathType => {
      // 删除目录后沿用相同的失效范围，保证设置页和媒体页数据同步。
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.media.paths() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.media.files(pathType) }),
      ]);
    },
  });
}

export function useTriggerMediaMatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pathType?: 'movie' | 'tv') => triggerMediaMatch(pathType),
    onSuccess: async (_, pathType) => {
      // 触发扫描后优先刷新任务状态；文件列表刷新交给 query 立刻接管。
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.media.taskStatus() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.media.files(pathType) }),
      ]);
    },
  });
}
