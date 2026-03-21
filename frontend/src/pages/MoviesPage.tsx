import { useMemo, useState, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { paths, files, status, fetchData, setIsScanningOptimistic, setMatchingFileOptimistic } = useMediaPolling('movie');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovieTitle, setSelectedMovieTitle] = useState<string | null>(null);

  const groupedMovies = useMemo(() => {
    const groups: Record<string, { title: string; year?: string; files: ScannedFile[]; createdAt?: string }> = {};
    files.forEach(file => {
      const title = file.extracted_title || t('page.movies.unknownMovie');
      if (!groups[title]) {
        groups[title] = { title, year: file.year, files: [], createdAt: file.created_at };
      }
      groups[title].files.push(file);
    });

    const result = Object.values(groups).filter(m =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return result.sort((a, b) => a.title.localeCompare(b.title));
  }, [files, searchTerm, t]);

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
      // 使用原始标题作为 key 和选择标识，NFO 标题仅用于显示
      return {
        id: movie.title,
        displayTitle: nfoTitle || movie.title,
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
        title={t('page.movies.title')}
        paths={paths}
        isScanning={status.is_scanning}
        onRefreshData={fetchData}
        setIsScanningOptimistic={setIsScanningOptimistic}
      />

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)] w-full">
        <div className="flex flex-col shrink-0">
          <MediaSidebar
            items={sidebarItems}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            selectedTitle={selectedMovieTitle}
            onSelectTitle={setSelectedMovieTitle}
            searchPlaceholder={t('page.movies.noMovies').replace('未找到', '搜索')}
            emptyText={t('page.movies.noMovies')}
          />
        </div>

        {selectedMovie ? (
          <section className="flex-1 flex flex-col bg-surface-container-low rounded-2xl overflow-hidden relative border border-outline-variant/5 max-w-full">
            <MediaInfoCard
              fileId={selectedMovie.files[0]?.id}
              title={selectedMovie.title}
              year={selectedMovie.year}
              path={selectedMovie.files[0]?.file_path}
            />

            <div className="flex-1 p-10 pt-6 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center bg-surface-container/50 p-4 rounded-xl border border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">folder_open</span>
                  <code className="text-sm text-on-surface-variant font-body">{selectedMovie.files[0]?.file_path?.split('/').slice(0, -1).join('/') || selectedMovie.files[0]?.file_path?.split('\\').slice(0, -1).join('\\')}</code>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between px-2 w-full">
                  <h3 className="text-xl font-bold font-headline text-on-surface">{t('page.movies.localFiles')}</h3>
                  <span className="text-sm text-on-surface-variant font-label">{selectedMovie.files.length} {selectedMovie.files.length === 1 ? 'file' : 'files'} found</span>
                </div>
                <div className="w-full">
                  <MediaList files={selectedMovie.files} status={status} setMatchingFileOptimistic={setMatchingFileOptimistic} />
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="flex-1">
            <EmptySelectionState typeName={t('movie')} />
          </div>
        )}
      </div>
    </div>
  );
}
