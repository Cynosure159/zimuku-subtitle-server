import { useMemo, useState, useEffect, startTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  fetchMediaMetadata,
  triggerMediaMatch,
  getMediaPosterUrl,
  type SortOption,
  type FilterOption,
  type SortOrder,
} from '../api';
import { MediaSidebar, type SidebarItem } from '../components/MediaSidebar';
import { MediaInfoCard } from '../components/MediaInfoCard';
import { EmptySelectionState } from '../components/EmptySelectionState';
import { MediaList } from '../components/MediaItem';
import { useMediaPolling } from '../hooks/useMediaPolling';
import { useMediaGrouping, type MovieGroup } from '../hooks/useMediaGrouping';
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
      setIsScanningOptimistic(true);
      setTimeout(() => setIsScanningOptimistic(false), 3000);
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
      if (opt === 'name') setSortOrder('asc');
      else setSortOrder('desc');
    }
  };

  const groupedMovies = useMediaGrouping(
    files,
    'movie',
    searchTerm,
    sortOption,
    sortOrder,
    filterOption,
    t('page.movies.unknownMovie')
  ) as MovieGroup[];

  const metadataQueries = useQueries({
    queries: (groupedMovies || []).map(movie => ({
      queryKey: ['media', 'metadata', movie.files[0]?.id],
      queryFn: () => fetchMediaMetadata(movie.files[0].id),
      staleTime: 10 * 60 * 1000,
      retry: 1,
      enabled: movie.files.length > 0,
    })),
  });

  const sidebarItems: SidebarItem[] = useMemo(() => {
    if (!groupedMovies) return [];
    return groupedMovies.map((movie, index) => {
      const metadata = metadataQueries[index]?.data;
      const nfoTitle = metadata?.nfo_data?.title;
      const nfoYear = metadata?.nfo_data?.year ?? undefined;
      const posterUrl = metadata?.poster_path ? getMediaPosterUrl(metadata.poster_path) : null;
      const totalCount = movie.files.length;
      const hasSubCount = movie.files.filter(f => f.has_subtitle).length;
      return {
        id: movie.title,
        displayTitle: nfoTitle || movie.title,
        year: nfoYear || movie.year,
        totalCount,
        hasSubCount,
        poster: posterUrl,
      };
    });
  }, [groupedMovies, metadataQueries]);

  const { toggleSidebar, sidebarOpen } = useUIStore();

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches && !useUIStore.getState().sidebarOpen) {
        toggleSidebar();
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [toggleSidebar]);

  useEffect(() => {
    const titleFromUrl = searchParams.get('title');
    if (titleFromUrl && groupedMovies.find(m => m.title === titleFromUrl)) {
      startTransition(() => {
        setSelectedMovieTitle(titleFromUrl);
      });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('title');
      setSearchParams(newParams, { replace: true });
    } else if (
      groupedMovies.length > 0 &&
      (!selectedMovieTitle || !groupedMovies.find(m => m.title === selectedMovieTitle))
    ) {
      const timer = setTimeout(() => setSelectedMovieTitle(groupedMovies[0].title), 0);
      return () => clearTimeout(timer);
    }
  }, [groupedMovies, selectedMovieTitle, searchParams, setSearchParams]);

  const selectedMovie = groupedMovies.find(m => m.title === selectedMovieTitle);

  return (
    <div className="flex flex-col gap-6 w-full h-full max-w-[1800px]">
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] w-full">
        <div
          className={`flex flex-col shrink-0 lg:transition-all lg:duration-300 lg:ease-in-out lg:overflow-hidden ${sidebarOpen ? 'lg:w-[380px] lg:opacity-100 lg:mr-6' : 'lg:w-0 lg:opacity-0 lg:mr-0'}`}
        >
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
                  <code className="text-sm text-on-surface-variant font-body">
                    {selectedMovie.files[0]?.file_path?.split('/').slice(0, -1).join('/') ||
                      selectedMovie.files[0]?.file_path?.split('\\').slice(0, -1).join('\\')}
                  </code>
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
                  <MediaList
                    files={selectedMovie.files}
                    status={status}
                    setMatchingFileOptimistic={setMatchingFileOptimistic}
                  />
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
