import { useMemo, useState, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { MediaConfigPanel } from '../components/MediaConfigPanel';
import { MediaSidebar, type SidebarItem } from '../components/MediaSidebar';
import { MediaInfoCard } from '../components/MediaInfoCard';
import { EmptySelectionState } from '../components/EmptySelectionState';
import { MediaList } from '../components/MediaList';
import { useMediaPolling, type ScannedFile } from '../hooks/useMediaPolling';

const API_BASE = 'http://127.0.0.1:8000';

async function fetchMovieMetadata(fileId: number) {
  const response = await axios.get(`${API_BASE}/media/metadata/${fileId}`);
  return response.data;
}

export default function MoviesPage() {
  const { paths, files, status, fetchData, setIsScanningOptimistic, setMatchingFileOptimistic } = useMediaPolling('movie');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovieTitle, setSelectedMovieTitle] = useState<string | null>(null);

  const groupedMovies = useMemo(() => {
    const groups: Record<string, { title: string; year?: string; files: ScannedFile[] }> = {};
    files.forEach(file => {
      const title = file.extracted_title || '未知电影';
      if (!groups[title]) {
        groups[title] = { title, year: file.year, files: [] };
      }
      groups[title].files.push(file);
    });
    
    return Object.values(groups).filter(m => 
      m.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.title.localeCompare(b.title));
  }, [files, searchTerm]);

  // 批量获取每个电影的元数据（海报和 NFO 信息）
  const metadataQueries = useQueries({
    queries: (groupedMovies || []).map(movie => ({
      queryKey: ['media', 'metadata', movie.files[0]?.id],
      queryFn: () => fetchMovieMetadata(movie.files[0].id),
      staleTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      enabled: movie.files.length > 0
    }))
  });

  // 构建侧边栏列表，包含海报和 NFO 信息
  const sidebarItems: SidebarItem[] = useMemo(() => {
    if (!groupedMovies) return [];
    return groupedMovies.map((movie, index) => {
      const metadata = metadataQueries[index]?.data;
      // 优先使用 NFO 中的标题和年份
      const nfoTitle = metadata?.nfo_data?.title;
      const nfoYear = metadata?.nfo_data?.year;
      // 构建海报 URL
      let posterUrl: string | null = null;
      if (metadata?.poster_path) {
        posterUrl = `${API_BASE}/media/poster?path=${encodeURIComponent(metadata.poster_path)}`;
      }
      const totalCount = movie.files.length;
      const hasSubCount = movie.files.filter(f => f.has_subtitle).length;
      return {
        title: nfoTitle || movie.title,
        year: nfoYear || movie.year,
        totalCount,
        hasSubCount,
        poster: posterUrl
      };
    });
  }, [groupedMovies, metadataQueries]);

  // Auto-select first movie if none selected
  useEffect(() => {
    if (groupedMovies.length > 0 && (!selectedMovieTitle || !groupedMovies.find(m => m.title === selectedMovieTitle))) {
      const timer = setTimeout(() => setSelectedMovieTitle(groupedMovies[0].title), 0);
      return () => clearTimeout(timer);
    }
  }, [groupedMovies, selectedMovieTitle]);

  const selectedMovie = groupedMovies.find(m => m.title === selectedMovieTitle);

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <MediaConfigPanel
        type="movie"
        title="电影管理"
        paths={paths}
        isScanning={status.is_scanning}
        onRefreshData={fetchData}
        setIsScanningOptimistic={setIsScanningOptimistic}
      />

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-160px)] min-h-[600px]">
        <MediaSidebar
          items={sidebarItems}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          selectedTitle={selectedMovieTitle}
          onSelectTitle={setSelectedMovieTitle}
          searchPlaceholder="搜索电影..."
          emptyText="未找到电影"
        />

        {selectedMovie ? (
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 custom-scrollbar pr-2 lg:ml-0 ml-2">
            <MediaInfoCard
              fileId={selectedMovie.files[0]?.id}
              title={selectedMovie.title}
              year={selectedMovie.year}
              path={selectedMovie.files[0]?.file_path}
            />

            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-slate-900">本地视频文件 ({selectedMovie.files.length})</h3>
              <MediaList files={selectedMovie.files} status={status} setMatchingFileOptimistic={setMatchingFileOptimistic} />
            </div>
          </div>
        ) : (
          <EmptySelectionState typeName="电影" />
        )}
      </div>
    </div>
  );
}
