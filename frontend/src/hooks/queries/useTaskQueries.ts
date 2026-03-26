import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  clearCompletedTasks,
  deleteTask,
  listTasks,
  retryTask,
} from '../../api';
import { queryKeys } from '../../lib/queryKeys';
import type { Task } from '../../types/api';

type TasksQueryResult = { items: Task[] };

type TasksQueryOptions = Omit<
  UseQueryOptions<TasksQueryResult, Error, TasksQueryResult, ReturnType<typeof queryKeys.tasks.list>>,
  'queryKey' | 'queryFn'
>;

async function invalidateTasksQuery(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() });
}

export function useTasksQuery(options?: TasksQueryOptions) {
  return useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: listTasks,
    ...options,
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: async () => {
      await invalidateTasksQuery(queryClient);
    },
  });
}

export function useRetryTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: number) => retryTask(taskId),
    onSuccess: async () => {
      await invalidateTasksQuery(queryClient);
    },
  });
}

export function useClearCompletedTasksMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCompletedTasks,
    onSuccess: async () => {
      await invalidateTasksQuery(queryClient);
    },
  });
}
