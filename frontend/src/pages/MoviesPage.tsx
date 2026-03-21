import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { API_BASE, fetchMediaMetadata, triggerMediaMatch } from '../api';
import { MediaSidebar, type SidebarItem, type SortOption, type FilterOption, type SortOrder } from '../components/MediaSidebar';
import { MediaInfoCard } from '../components/MediaInfoCard';
import { EmptySelectionState } from '../components/EmptySelectionState';
import { MediaList } from '../components/MediaItem';
import { useMediaPolling, type ScannedFile } from '../hooks/useMediaPolling';
import { useUIStore } from '../stores/useUIStore';

export default function MoviesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { files, status, setIsScanningOptimistic, setMatchingFileOptimistic } = useMediaPolling('movie');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovieTitle, setSelectedMovieTitle] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');

  const handleRefresh = async () => {
    try {
      if (setIsScanningOptimistic) {
        setIsScanningOptimistic(true);
        setTimeout(() => setIsScanningOptimistic(false), 3000);
      }
      await triggerMediaMatch('movie');
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const handleSortChange = (opt: SortOption) => {
    if (opt === sortOption) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(opt);
      // Set default order for new options
      if (opt === 'name') setSortOrder('asc');
      else setSortOrder('desc');
    }
  };

  const groupedMovies = useMemo(() => {
    const groups: Record<string, { title: string; year?: string; files: ScannedFile[]; createdAt?: string; hasSubCount: number; totalCount: number }> = {};
    files.forEach(file => {
      const title = file.extracted_title || t('page.movies.unknownMovie');
      if (!groups[title]) {
        groups[title] = { title, year: file.year, files: [], createdAt: file.created_at, hasSubCount: 0, totalCount: 0 };
      }
      groups[title].files.push(file);
      groups[title].totalCount++;
      if (file.has_subtitle) groups[title].hasSubCount++;
    });

    let result = Object.values(groups).filter(m =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter
    if (filterOption === 'missing') {
      result = result.filter(m => m.hasSubCount < m.totalCount);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortOption === 'year') {
        const yearA = parseInt(a.year || '0');
        const yearB = parseInt(b.year || '0');
        comparison = yearA - yearB;
      } else if (sortOption === 'created') {
        comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
      } else if (sortOption === 'status') {
        const ratioA = a.hasSubCount / a.totalCount;
        const ratioB = b.hasSubCount / b.totalCount;
        comparison = ratioA - ratioB;
      } else {
        comparison = a.title.localeCompare(b.title);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [files, searchTerm, t, sortOption, sortOrder, filterOption]);

  // 批量获取每个电影的元数据（海报和 NFO 信息）
  const metadataQueries = useQueries({
    queries: (groupedMovies || []).map(movie => ({
      queryKey: ['media', 'metadata', movie.files[0]?.id],
      queryFn: () => fetchMediaMetadata(movie.files[0].id),
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

  const { toggleSidebar, sidebarOpen } = useUIStore();
  
  // Ensure sidebar is open on mount
  useEffect(() => {
    if (!sidebarOpen) {
      toggleSidebar();
    }
    
    // Auto-open on desktop transition
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches && !useUIStore.getState().sidebarOpen) {
        toggleSidebar();
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Auto-select first movie if none selected OR select via search params
  useEffect(() => {
    const titleFromUrl = searchParams.get('title');
    if (titleFromUrl && groupedMovies.find(m => m.title === titleFromUrl)) {
      setSelectedMovieTitle(titleFromUrl);
      // Optional: Clear the param after selection
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('title');
      setSearchParams(newParams, { replace: true });
    } else if (groupedMovies.length > 0 && (!selectedMovieTitle || !groupedMovies.find(m => m.title === selectedMovieTitle))) {
      const timer = setTimeout(() => setSelectedMovieTitle(groupedMovies[0].title), 0);
      return () => clearTimeout(timer);
    }
  }, [groupedMovies, selectedMovieTitle, searchParams, setSearchParams]);

  const selectedMovie = groupedMovies.find(m => m.title === selectedMovieTitle);

  return (
    <div className="flex flex-col gap-6 w-full h-full max-w-[1800px]">

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] w-full">
        <div className={`flex flex-col shrink-0 lg:transition-all lg:duration-300 lg:ease-in-out lg:overflow-hidden ${sidebarOpen ? 'lg:w-[380px] lg:opacity-100 lg:mr-6' : 'lg:w-0 lg:opacity-0 lg:mr-0'}`}>
          <MediaSidebar
            items={sidebarItems}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            selectedTitle={selectedMovieTitle}
            onSelectTitle={setSelectedMovieTitle}
            searchPlaceholder={t('page.movies.placeholder')}
            emptyText={t('page.movies.noMovies')}
            onRefresh={handleRefresh}
            isRefreshing={status.is_scanning}
            title={t('movie')}
            sortOption={sortOption}
            onSortOptionChange={handleSortChange}
            sortOrder={sortOrder}
            filterOption={filterOption}
            onFilterOptionChange={setFilterOption}
          />
        </div>

        {selectedMovie ? (
          <section className="flex-1 flex flex-col bg-surface-container-low rounded-2xl overflow-hidden relative border border-outline-variant/5 max-w-full">
            <MediaInfoCard
              fileId={selectedMovie.files[0]?.id}
              title={selectedMovie.title}
              year={selectedMovie.year}
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
                  <span className="text-sm text-on-surface-variant font-label">
                    {t('page.movies.fileCount', { count: selectedMovie.files.length })}
                  </span>
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
      {/* Floating Toggle Button - only visible on small screens as per previous design */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleSidebar}
          className="w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined">{sidebarOpen ? 'close' : 'menu'}</span>
        </button>
      </div>
    </div>
  );
}
