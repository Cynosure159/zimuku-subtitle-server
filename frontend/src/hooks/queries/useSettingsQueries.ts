import { useQuery } from '@tanstack/react-query';
import { listSettings } from '../../api';
import { queryKeys } from '../../lib/queryKeys';

export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings.list(),
    queryFn: listSettings,
  });
}
