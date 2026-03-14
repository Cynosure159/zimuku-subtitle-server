import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { autoMatchFile, matchTVSeason } from '../api';
import { MediaConfigPanel } from '../components/MediaConfigPanel';
import { MediaSidebar, type SidebarItem } from '../components/MediaSidebar';
import { MediaInfoCard } from '../components/MediaInfoCard';
import { EmptySelectionState } from '../components/EmptySelectionState';
import { useMediaPolling, type ScannedFile } from '../hooks/useMediaPolling';
import { Search, Loader2 } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

async function fetchSeriesMetadata(fileId: number) {
  const response = await axios.get(`${API_BASE}/media/metadata/${fileId}`);
  return response.data;
}

export default function SeriesPage() {
  const navigate = useNavigate();
  const { paths, files, status, fetchData, setIsScanningOptimistic, setMatchingFileOptimistic } = useMediaPolling('tv');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeriesTitle, setSelectedSeriesTitle] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  const handleAutoSearch = async (fileId: number) => {
    // Optimistic update for immediate UI feedback
    if (setMatchingFileOptimistic) {
      setMatchingFileOptimistic(fileId, true);
      // Fallback to clear state after 3 seconds
      setTimeout(() => setMatchingFileOptimistic(fileId, false), 3000);
    }
    try {
      await autoMatchFile(fileId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert('自动搜索触发失败: ' + message);
      // Revert optimistic state on error
      if (setMatchingFileOptimistic) {
        setMatchingFileOptimistic(fileId, false);
      }
    }
  };

  const handleManualSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleMatchSeason = async (title: string, season: number) => {
    try {
      await matchTVSeason(title, season);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert('补全任务触发失败: ' + message);
    }
  };

  // Group files by extracted_title and season
  const groupedSeries = useMemo(() => {
    const groups: Record<string, {
      title: string;
      year?: string;
      totalCount: number;
      hasSubCount: number;
      firstPath: string;
      firstFileId: number;
      seasons: Record<number, ScannedFile[]>
    }> = {};

    files.forEach(file => {
      const title = file.extracted_title || '未知剧集';
      if (!groups[title]) {
        groups[title] = {
          title,
          year: file.year,
          totalCount: 0,
          hasSubCount: 0,
          firstPath: file.file_path,
          firstFileId: file.id,
          seasons: {}
        };
      }
      const s = file.season || 1;
      if (!groups[title].seasons[s]) {
        groups[title].seasons[s] = [];
      }
      groups[title].seasons[s].push(file);
      // Sort episodes inside season
      groups[title].seasons[s].sort((a, b) => (a.episode || 0) - (b.episode || 0));
      
      groups[title].totalCount++;
      if (file.has_subtitle) groups[title].hasSubCount++;
    });
    
    return Object.values(groups).filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.title.localeCompare(b.title));
  }, [files, searchTerm]);

  // 批量获取每个剧集的元数据（海报和 NFO 信息）
  const metadataQueries = useQueries({
    queries: (groupedSeries || []).map(series => ({
      queryKey: ['media', 'metadata', series.firstFileId],
      queryFn: () => fetchSeriesMetadata(series.firstFileId),
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
      return {
        title: nfoTitle || series.title,
        year: nfoYear || series.year,
        totalCount: series.totalCount,
        hasSubCount: series.hasSubCount,
        poster: posterUrl
      };
    });
  }, [groupedSeries, metadataQueries]);

  // Auto-select first series
  useEffect(() => {
    if (groupedSeries.length > 0 && (!selectedSeriesTitle || !groupedSeries.find(s => s.title === selectedSeriesTitle))) {
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
  }, [groupedSeries, selectedSeriesTitle]);

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

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <MediaConfigPanel
        type="tv"
        title="剧集管理"
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
          selectedTitle={selectedSeriesTitle}
          onSelectTitle={setSelectedSeriesTitle}
          searchPlaceholder="搜索剧集..."
          emptyText="未找到剧集"
        />

        {selectedSeries ? (
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 custom-scrollbar pr-2 lg:ml-0 ml-2">
            <MediaInfoCard
              fileId={selectedSeries.firstFileId}
              title={selectedSeries.title}
              year={selectedSeries.year}
              path={selectedSeries.firstPath}
            />

            {/* Seasons Tabs & Actions */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {availableSeasons.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSeason(s)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedSeason === s ? 'bg-blue-500 text-white shadow-sm shadow-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    第 {s} 季
                  </button>
                ))}
              </div>

              {selectedSeries && (
                <button
                  onClick={() => handleMatchSeason(selectedSeries.title, selectedSeason)}
                  disabled={isSelectedSeasonMatching}
                  className={`${isSelectedSeasonMatching ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'} text-xs px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shrink-0 border hover:shadow-sm`}
                >
                  {isSelectedSeasonMatching ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  {isSelectedSeasonMatching ? '智能补全中...' : '智能补全本季字幕'}
                </button>
              )}
            </div>

            {/* File List Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center">
                <div className="flex-1">集数与文件名称</div>
                <div className="w-48 text-center">状态与操作</div>
              </div>
              <div className="flex flex-col">
                {currentSeasonFiles.map((file, i) => {
                  const isMatching = status.matching_files.includes(file.id);
                  return (
                    <div key={file.id} className={`flex items-center px-5 py-4 ${i !== currentSeasonFiles.length - 1 ? 'border-b border-slate-50' : ''}`}>
                      <div className="flex-1 flex items-center gap-3 overflow-hidden">
                        <div className="w-10 text-sm font-bold text-slate-400 shrink-0">
                          E{file.episode?.toString().padStart(2, '0') || '??'}
                        </div>
                        <div className="text-sm text-slate-700 truncate" title={file.filename}>
                          {file.filename}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        {isMatching ? (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            搜索中
                          </span>
                        ) : file.has_subtitle ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium">已匹配</span>
                        ) : (
                          <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded font-medium">缺字幕</span>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {!file.has_subtitle && !isMatching && (
                            <button 
                              onClick={() => handleAutoSearch(file.id)}
                              className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-1 rounded-md font-medium hover:bg-emerald-100 transition-colors"
                            >
                              自动搜索
                            </button>
                          )}
                          <button 
                            onClick={() => handleManualSearch(file.extracted_title || file.filename)}
                            className="bg-blue-50 text-blue-600 text-[10px] px-2 py-1 rounded-md font-medium hover:bg-blue-100 transition-colors"
                          >
                            手动搜索
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {currentSeasonFiles.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-400">
                    本季暂无视频文件
                  </div>
               )}
              </div>
            </div>
          </div>
        ) : (
          <EmptySelectionState typeName="剧集" />
        )}
      </div>
    </div>
  );
}
