import { useTranslation } from 'react-i18next';
import { MediaSidebar } from '../components/MediaSidebar';
import { MediaInfoCard } from '../components/MediaInfoCard';
import { EmptySelectionState } from '../components/EmptySelectionState';
import { MediaList } from '../components/MediaItem';
import { useMediaBrowserController } from '../hooks/useMediaBrowserController';

export default function MoviesPage() {
  const { t } = useTranslation();
  const {
    selectedItem: selectedMovie,
    sidebarItems,
    searchTerm,
    setSearchTerm,
    selectedTitle: selectedMovieTitle,
    setSelectedTitle: setSelectedMovieTitle,
    sortOption,
    sortOrder,
    filterOption,
    handleSortChange,
    setFilterOption,
    handleRefresh,
    status,
    sidebarOpen,
    toggleSidebar,
    setMatchingFileOptimistic,
  } = useMediaBrowserController({
    type: 'movie',
    unknownLabel: t('page.movies.unknownMovie'),
  });

  return (
    <div className="flex flex-col gap-6 w-full h-full max-w-[1800px] min-h-0">
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] w-full min-h-0">
        <div
          className={`flex flex-col shrink-0 min-h-0 lg:transition-all lg:duration-300 lg:ease-in-out lg:overflow-hidden ${sidebarOpen ? 'lg:w-[380px] lg:opacity-100 lg:mr-6' : 'lg:w-0 lg:opacity-0 lg:mr-0'}`}
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
          <section className="flex-1 flex flex-col min-h-0 bg-surface-container-low rounded-2xl overflow-hidden relative border border-outline-variant/5 max-w-full">
            <MediaInfoCard
              fileId={selectedMovie.files[0]?.id}
              title={selectedMovie.title}
              year={selectedMovie.year}
            />

            <div className="flex-1 min-h-0 p-10 pt-6 space-y-8 overflow-y-auto custom-scrollbar">
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
