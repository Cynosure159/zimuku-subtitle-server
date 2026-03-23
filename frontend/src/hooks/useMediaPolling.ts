import { useMediaPollingContext } from '../contexts/MediaPollingContext';

export type { MediaPath, ScannedFile, TaskStatus } from '../api';

export function useMediaPolling(type: 'movie' | 'tv') {
  const { movie, tv, status, setIsScanningOptimistic, setMatchingFileOptimistic, setMatchingSeasonOptimistic } =
    useMediaPollingContext();

  const data = type === 'movie' ? movie : tv;

  const fetchData = async () => {
    // Context handles data fetching; this is a no-op wrapper for compatibility
  };

  return {
    paths: data.paths,
    files: data.files,
    status,
    fetchData,
    setIsScanningOptimistic,
    setMatchingFileOptimistic,
    setMatchingSeasonOptimistic,
  };
}
