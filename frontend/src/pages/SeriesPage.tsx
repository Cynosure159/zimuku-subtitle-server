import { useMemo, useState, useEffect, startTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { API_BASE, autoMatchFile, fetchMediaMetadata, matchTVSeason, triggerMediaMatch } from '../api';
import { MediaSidebar, type SidebarItem, type SortOption, type FilterOption, type SortOrder } from '../components/MediaSidebar';
import { MediaInfoCard } from '../components/MediaInfoCard';
import { EmptySelectionState } from '../components/EmptySelectionState';
import { useMediaPolling, type ScannedFile } from '../hooks/useMediaPolling';
import { MediaItem } from '../components/MediaItem';
import { Search, Loader2 } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';

export default function SeriesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { files, status, setIsScanningOptimistic, setMatchingFileOptimistic, setMatchingSeasonOptimistic } = useMediaPolling('tv');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeriesTitle, setSelectedSeriesTitle] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');

  const handleRefresh = async () => {
    try {
      if (setIsScanningOptimistic) {
        setIsScanningOptimistic(true);
        setTimeout(() => setIsScanningOptimistic(false), 3000);
      }
      await triggerMediaMatch('tv');
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

  const handleAutoSearch = async (fileId: number) => {
    if (setMatchingFileOptimistic) {
      setMatchingFileOptimistic(fileId, true);
      setTimeout(() => setMatchingFileOptimistic(fileId, false), 3000);
    }
    try {
      await autoMatchFile(fileId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(t('mediaConfig.triggerFailed') + ': ' + message);
      if (setMatchingFileOptimistic) {
        setMatchingFileOptimistic(fileId, false);
      }
    }
  };

  const handleMatchSeason = async (title: string, season: number) => {
    setMatchingSeasonOptimistic(title, season, true);
    const timeoutId = setTimeout(() => setMatchingSeasonOptimistic(title, season, false), 3000);
    try {
      await matchTVSeason(title, season);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      setMatchingSeasonOptimistic(title, season, false);
      const message = err instanceof Error ? err.message : String(err);
      alert(t('mediaConfig.triggerFailed') + ': ' + message);
    }
  };

  const groupedSeries = useMemo(() => {
    const groups: Record<string, {
      title: string;
      year?: string;
      totalCount: number;
      hasSubCount: number;
      firstPath: string;
      seriesRootPath: string;
      firstFileId: number;
      createdAt?: string;
      seasons: Record<number, ScannedFile[]>
    }> = {};

    files.forEach(file => {
      const title = file.extracted_title || t('page.series.unknownSeries');
      if (!groups[title]) {
        groups[title] = {
          title,
          year: file.year,
          totalCount: 0,
          hasSubCount: 0,
          firstPath: file.file_path,
          seriesRootPath: file.series_root_path || file.file_path.split('/').slice(0, -1).join('/'),
          firstFileId: file.id,
          createdAt: file.created_at,
          seasons: {}
        };
      }
      const s = file.season || 1;
      if (!groups[title].seasons[s]) {
        groups[title].seasons[s] = [];
      }
      groups[title].seasons[s].push(file);
      groups[title].seasons[s].sort((a, b) => (a.episode || 0) - (b.episode || 0));

      groups[title].totalCount++;
      if (file.has_subtitle) groups[title].hasSubCount++;
    });

    let result = Object.values(groups).filter(s =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter
    if (filterOption === 'missing') {
      result = result.filter(s => s.hasSubCount < s.totalCount);
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

  // 批量获取每个剧集的元数据（海报和 NFO 信息）
  const metadataQueries = useQueries({
    queries: (groupedSeries || []).map(series => ({
      queryKey: ['media', 'metadata', series.firstFileId],
      queryFn: () => fetchMediaMetadata(series.firstFileId),
      staleTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
    }))
  });

  // 构建侧边栏列表，包含海报和 NFO 信息
  const sidebarItems: SidebarItem[] = useMemo(() => {
    if (!groupedSeries) return [];
    return groupedSeries.map((series, index) => {
      const metadata = metadataQueries[index]?.data;
      // 优先使用 NFO 中的标题和年份
      const nfoTitle = metadata?.nfo_data?.title;
      const nfoYear = metadata?.nfo_data?.year;
      // 构建海报 URL
      let posterUrl: string | null = null;
      if (metadata?.poster_path) {
        posterUrl = `${API_BASE}/media/poster?path=${encodeURIComponent(metadata.poster_path)}`;
      }
      // 使用原始标题作为 key 和选择标识，NFO 标题仅用于显示
      return {
        id: series.title,
        displayTitle: nfoTitle || series.title,
        year: nfoYear || series.year,
        totalCount: series.totalCount,
        hasSubCount: series.hasSubCount,
        poster: posterUrl,
        createdAt: series.createdAt
      };
    });
  }, [groupedSeries, metadataQueries]);

  const { toggleSidebar, sidebarOpen } = useUIStore();

  // Auto-open sidebar on desktop transition
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

  // Auto-select first series OR select via search params
  useEffect(() => {
    const titleFromUrl = searchParams.get('title');
    const seasonFromUrl = searchParams.get('season');

    if (titleFromUrl && groupedSeries.find(s => s.title === titleFromUrl)) {
      startTransition(() => {
        setSelectedSeriesTitle(titleFromUrl);
        if (seasonFromUrl) {
          setSelectedSeason(Number(seasonFromUrl));
        }
      });
      // Clear params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('title');
      newParams.delete('season');
      setSearchParams(newParams, { replace: true });
    } else if (groupedSeries.length > 0 && (!selectedSeriesTitle || !groupedSeries.find(s => s.title === selectedSeriesTitle))) {
      const timer = setTimeout(() => {
        const first = groupedSeries[0];
        setSelectedSeriesTitle(first.title);
        const availableSeasons = Object.keys(first.seasons).map(Number).sort((a, b) => a - b);
        if (availableSeasons.length > 0) {
          setSelectedSeason(availableSeasons[0]);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [groupedSeries, selectedSeriesTitle, searchParams, setSearchParams]);

  const selectedSeries = groupedSeries.find(s => s.title === selectedSeriesTitle);
  const availableSeasons = useMemo(() => {
    return selectedSeries ? Object.keys(selectedSeries.seasons).map(Number).sort((a, b) => a - b) : [];
  }, [selectedSeries]);

  // Update season when selected series changes
  useEffect(() => {
    if (selectedSeries && !availableSeasons.includes(selectedSeason)) {
      if (availableSeasons.length > 0) {
        const timer = setTimeout(() => setSelectedSeason(availableSeasons[0]), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedSeriesTitle, selectedSeries, availableSeasons, selectedSeason]);

  const currentSeasonFiles = selectedSeries?.seasons[selectedSeason] || [];

  // 判断当前季是否正在补全中
  const isSelectedSeasonMatching = selectedSeries && status.matching_seasons.some(
    m => m.title === selectedSeries.title && m.season === selectedSeason
  );

  const totalEpisodesCount = useMemo(() => {
    if (!selectedSeries) return 0;
    return Object.values(selectedSeries.seasons).reduce((acc, files) => acc + files.length, 0);
  }, [selectedSeries]);

  return (
    <div className="flex flex-col gap-6 w-full h-full max-w-[1800px]">

      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] w-full">
        <div className={`flex flex-col shrink-0 lg:transition-all lg:duration-300 lg:ease-in-out lg:overflow-hidden ${sidebarOpen ? 'lg:w-[380px] lg:opacity-100 lg:mr-6' : 'lg:w-0 lg:opacity-0 lg:mr-0'}`}>
          <MediaSidebar
            items={sidebarItems}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            selectedTitle={selectedSeriesTitle}
            onSelectTitle={setSelectedSeriesTitle}
            searchPlaceholder={t('page.series.placeholder')}
            emptyText={t('page.series.noSeries')}
            onRefresh={handleRefresh}
            isRefreshing={status.is_scanning}
            title={t('tv')}
            sortOption={sortOption}
            onSortOptionChange={handleSortChange}
            sortOrder={sortOrder}
            filterOption={filterOption}
            onFilterOptionChange={setFilterOption}
          />
        </div>

        {selectedSeries ? (
          <section className="flex-1 flex flex-col bg-surface-container-low rounded-2xl overflow-hidden relative border border-outline-variant/5 max-w-full">
            <MediaInfoCard
              fileId={selectedSeries.firstFileId}
              title={selectedSeries.title}
              year={selectedSeries.year}
              isTv={true}
              count={totalEpisodesCount}
            />

            <div className="flex-1 p-10 pt-6 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center bg-surface-container/50 p-4 rounded-xl border border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">folder_open</span>
                  <code className="text-sm text-on-surface-variant font-body">{selectedSeries.seriesRootPath}</code>
                </div>
              </div>

              {/* Seasons Tabs */}
              <div className="flex items-center justify-between border-b border-outline-variant/10 relative">
                <div className="flex gap-10 overflow-x-auto scrollbar-hide">
                  {availableSeasons.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSeason(s)}
                      className={`pb-4 text-sm whitespace-nowrap transition-colors relative ${selectedSeason === s ? 'text-primary font-bold border-b-2 border-primary z-10' : 'text-on-surface-variant font-medium hover:text-on-surface'}`}
                    >
                      {t('page.series.season', { n: s })}
                    </button>
                  ))}
                </div>
                {selectedSeries && (
                  <button
                    onClick={() => handleMatchSeason(selectedSeries.title, selectedSeason)}
                    disabled={isSelectedSeasonMatching}
                    className={`absolute right-0 bottom-3 text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 border uppercase tracking-widest ${isSelectedSeasonMatching ? 'bg-surface-container text-on-surface-variant border-outline-variant/20 cursor-not-allowed' : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:shadow-[0_0_12px_rgba(189,194,255,0.1)]'}`}
                  >
                    {isSelectedSeasonMatching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Search className="w-3.5 h-3.5 shrink-0" />
                    )}
                    {isSelectedSeasonMatching ? t('page.series.smartMatching') : t('page.series.smartMatch')}
                  </button>
                )}
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between px-2 w-full">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold font-headline text-on-surface">{t('page.movies.localFiles')}</h3>
                    {currentSeasonFiles.some(f => !f.has_subtitle) && (
                      <div className="flex items-center gap-2 bg-error-dim/10 text-error-dim px-3 py-1 rounded-full border border-error-dim/20">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        <span className="text-[11px] font-bold uppercase tracking-wider">{t('status.missing')}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-on-surface-variant font-label">
                    {t('page.movies.fileCount', { count: currentSeasonFiles.length })}
                  </span>
                </div>
                
                <div className="flex flex-col gap-3 w-full">
                  {currentSeasonFiles.map(file => (
                    <MediaItem
                      key={file.id}
                      file={file}
                      status={status}
                      variant="tv"
                      showEpisode={true}
                      onAutoSearch={handleAutoSearch}
                    />
                  ))}
                  {currentSeasonFiles.length === 0 && (
                    <div className="p-8 text-center text-sm font-label text-on-surface-variant opacity-70">
                      {t('page.series.noVideos')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="flex-1">
            <EmptySelectionState typeName={t('tv')} />
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
