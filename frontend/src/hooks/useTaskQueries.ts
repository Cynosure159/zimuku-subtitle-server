import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listTasks,
  createDownloadTask,
  deleteTask,
  retryTask,
  clearCompletedTasks,
} from '../api';

export interface Task {
  id: number;
  title: string;
  source_url: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskStats {
  total: number;
  pending: number;
  downloading: number;
  completed: number;
  failed: number;
}

// Query hooks
export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: listTasks,
  });
}

export function useTaskStats() {
  return useQuery<TaskStats>({
    queryKey: ['tasks', 'stats'],
    queryFn: async () => {
      const tasks = await listTasks();
      return {
        total: tasks.length,
        pending: tasks.filter((t) => t.status === 'pending').length,
        downloading: tasks.filter((t) => t.status === 'downloading').length,
        completed: tasks.filter((t) => t.status === 'completed').length,
        failed: tasks.filter((t) => t.status === 'failed').length,
      };
    },
  });
}

// Mutation hooks
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, source_url }: { title: string; source_url: string }) =>
      createDownloadTask(title, source_url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useRetryTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => retryTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useClearCompletedTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearCompletedTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
