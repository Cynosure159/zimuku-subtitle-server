import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  listMediaPaths,
  listScannedFiles,
  getTaskStatus,
  type MediaPath,
  type ScannedFile,
  type TaskStatus,
} from '../api';

interface MovieState {
  paths: MediaPath[];
  files: ScannedFile[];
}

interface TvState {
  paths: MediaPath[];
  files: ScannedFile[];
}

interface MediaPollingState {
  movie: MovieState;
  tv: TvState;
  status: TaskStatus;
}

interface MediaPollingContextValue extends MediaPollingState {
  fetchMovieData: () => Promise<void>;
  fetchTvData: () => Promise<void>;
  setIsScanningOptimistic: (value: boolean) => void;
  setMatchingFileOptimistic: (fileId: number, isMatching: boolean) => void;
  setMatchingSeasonOptimistic: (title: string, season: number, isMatching: boolean) => void;
}

const MediaPollingContext = createContext<MediaPollingContextValue | null>(null);

const initialState: MediaPollingState = {
  movie: { paths: [], files: [] },
  tv: { paths: [], files: [] },
  status: {
    is_scanning: false,
    matching_files: [],
    matching_seasons: [],
  },
};

export function MediaPollingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MediaPollingState>(initialState);

  const fetchAll = useCallback(async () => {
    try {
      const [pathsData, filesData, statusData] = await Promise.all([
        listMediaPaths(),
        listScannedFiles(),
        getTaskStatus(),
      ]);

      setState(() => ({
        movie: {
          paths: pathsData.filter((p: MediaPath) => p.type === 'movie'),
          files: filesData.filter((f: ScannedFile) => f.type === 'movie'),
        },
        tv: {
          paths: pathsData.filter((p: MediaPath) => p.type === 'tv'),
          files: filesData.filter((f: ScannedFile) => f.type === 'tv'),
        },
        status: statusData,
      }));
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, []);

  const fetchMovieData = useCallback(async () => {
    try {
      const [pathsData, filesData, statusData] = await Promise.all([
        listMediaPaths(),
        listScannedFiles('movie'),
        getTaskStatus(),
      ]);
      setState(prev => ({
        ...prev,
        movie: {
          paths: pathsData.filter((p: MediaPath) => p.type === 'movie'),
          files: filesData,
        },
        status: statusData,
      }));
    } catch (err) {
      console.error('Fetch movie data error:', err);
    }
  }, []);

  const fetchTvData = useCallback(async () => {
    try {
      const [pathsData, filesData, statusData] = await Promise.all([
        listMediaPaths(),
        listScannedFiles('tv'),
        getTaskStatus(),
      ]);
      setState(prev => ({
        ...prev,
        tv: {
          paths: pathsData.filter((p: MediaPath) => p.type === 'tv'),
          files: filesData,
        },
        status: statusData,
      }));
    } catch (err) {
      console.error('Fetch tv data error:', err);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      await fetchAll();

      const statusData = await getTaskStatus().catch(() => null);
      if (!statusData) {
        timer = setTimeout(poll, 10000);
        return;
      }

      const hasTasks =
        statusData.is_scanning ||
        statusData.matching_files.length > 0 ||
        statusData.matching_seasons.length > 0;

      timer = setTimeout(poll, hasTasks ? 2000 : 10000);
    };

    poll();
    return () => clearTimeout(timer);
  }, [fetchAll]);

  const setIsScanningOptimistic = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, status: { ...prev.status, is_scanning: value } }));
  }, []);

  const setMatchingFileOptimistic = useCallback((fileId: number, isMatching: boolean) => {
    setState(prev => ({
      ...prev,
      status: {
        ...prev.status,
        matching_files: isMatching
          ? [...prev.status.matching_files, fileId]
          : prev.status.matching_files.filter(id => id !== fileId),
      },
    }));
  }, []);

  const setMatchingSeasonOptimistic = useCallback((title: string, season: number, isMatching: boolean) => {
    setState(prev => ({
      ...prev,
      status: {
        ...prev.status,
        matching_seasons: isMatching
          ? [...prev.status.matching_seasons, { title, season }]
          : prev.status.matching_seasons.filter(m => !(m.title === title && m.season === season)),
      },
    }));
  }, []);

  const value: MediaPollingContextValue = {
    ...state,
    fetchMovieData,
    fetchTvData,
    setIsScanningOptimistic,
    setMatchingFileOptimistic,
    setMatchingSeasonOptimistic,
  };

  return <MediaPollingContext.Provider value={value}>{children}</MediaPollingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMediaPollingContext(): MediaPollingContextValue {
  const context = useContext(MediaPollingContext);
  if (!context) {
    throw new Error('useMediaPollingContext must be used within MediaPollingProvider');
  }
  return context;
}
