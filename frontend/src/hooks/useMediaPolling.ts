import { useState, useEffect } from 'react';
import { listMediaPaths, listScannedFiles, getTaskStatus } from '../api';

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
  series_root_path?: string;
  created_at: string;
}

export interface TaskStatus {
  is_scanning: boolean;
  matching_files: number[];
  matching_seasons: { title: string; season: number }[];
}

export function useMediaPolling(type: 'movie' | 'tv') {
  const [paths, setPaths] = useState<MediaPath[]>([]);
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [status, setStatus] = useState<TaskStatus>({ 
    is_scanning: false, 
    matching_files: [], 
    matching_seasons: [] 
  });

  const fetchData = async () => {
    try {
      const [pathsData, filesData, statusData] = await Promise.all([
        listMediaPaths(),
        listScannedFiles(type),
        getTaskStatus()
      ]);
      setPaths(pathsData.filter((p: MediaPath) => p.type === type));
      setFiles(filesData);
      setStatus(statusData);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const [pathsData, filesData, statusData] = await Promise.all([
          listMediaPaths(),
          listScannedFiles(type),
          getTaskStatus()
        ]);
        setPaths(pathsData.filter((p: MediaPath) => p.type === type));
        setFiles(filesData);
        setStatus(statusData);

        // 根据是否有活动任务决定下一次轮询时间
        const hasTasks = 
          statusData.is_scanning || 
          statusData.matching_files.length > 0 || 
          statusData.matching_seasons.length > 0;
          
        timer = setTimeout(poll, hasTasks ? 2000 : 10000);
      } catch (err) {
        console.error('Polling error: ', err);
        timer = setTimeout(poll, 10000); // 出错则默认 10s 后重试
      }
    };
    
    poll();
    return () => clearTimeout(timer);
  }, [type]);

  // Optimistic update methods for immediate UI feedback
  const setIsScanningOptimistic = (value: boolean) => {
    setStatus(prev => ({ ...prev, is_scanning: value }));
  };

  const setMatchingFileOptimistic = (fileId: number, isMatching: boolean) => {
    setStatus(prev => ({
      ...prev,
      matching_files: isMatching
        ? [...prev.matching_files, fileId]
        : prev.matching_files.filter(id => id !== fileId)
    }));
  };

  const setMatchingSeasonOptimistic = (title: string, season: number, isMatching: boolean) => {
    setStatus(prev => ({
      ...prev,
      matching_seasons: isMatching
        ? [...prev.matching_seasons, { title, season }]
        : prev.matching_seasons.filter(m => !(m.title === title && m.season === season))
    }));
  };

  return { paths, files, status, fetchData, setIsScanningOptimistic, setMatchingFileOptimistic, setMatchingSeasonOptimistic };
}
