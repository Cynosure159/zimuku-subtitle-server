import { useQuery } from '@tanstack/react-query';
import { listTasks } from '../../api';
import { queryKeys } from '../../lib/queryKeys';

export function useTasksQuery() {
  return useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: listTasks,
  });
}
