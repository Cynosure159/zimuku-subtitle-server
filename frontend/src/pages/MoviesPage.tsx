import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { autoMatchFile } from '../api';
import { MediaConfigPanel } from '../components/MediaConfigPanel';
import { MediaSidebar, type SidebarItem } from '../components/MediaSidebar';
import { MediaInfoCard } from '../components/MediaInfoCard';
import { EmptySelectionState } from '../components/EmptySelectionState';
import { useMediaPolling, type ScannedFile } from '../hooks/useMediaPolling';
import { FolderOpen, Loader2 } from 'lucide-react';

export default function MoviesPage() {
  const navigate = useNavigate();
  const { paths, files, status, fetchData } = useMediaPolling('movie');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovieTitle, setSelectedMovieTitle] = useState<string | null>(null);

  const handleAutoSearch = async (fileId: number) => {
    try {
      await autoMatchFile(fileId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert('自动搜索触发失败: ' + message);
    }
  };

  const handleManualSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

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

  // Sidebar item mapping
  const sidebarItems: SidebarItem[] = useMemo(() => {
    return groupedMovies.map(movie => {
      const totalCount = movie.files.length;
      const hasSubCount = movie.files.filter(f => f.has_subtitle).length;
      return {
        title: movie.title,
        year: movie.year,
        totalCount,
        hasSubCount
      };
    });
  }, [groupedMovies]);

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
      />

      <div className="flex gap-6 h-[calc(100vh-160px)] min-h-[600px]">
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
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6 custom-scrollbar pr-2">
            <MediaInfoCard 
              title={selectedMovie.title}
              year={selectedMovie.year}
              path={selectedMovie.files[0]?.file_path}
            />

            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-slate-900">本地视频文件 ({selectedMovie.files.length})</h3>
              <div className="flex flex-col gap-3">
                {selectedMovie.files.map(file => {
                  const isMatching = status.matching_files.includes(file.id);
                  return (
                    <div key={file.id} className="bg-white p-4 rounded-xl flex items-center justify-between border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <FolderOpen className="w-5 h-5 text-slate-400 shrink-0" />
                        <div className="text-sm font-medium text-slate-700 truncate" title={file.filename}>
                          {file.filename}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        {isMatching ? (
                          <div className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            搜索中
                          </div>
                        ) : file.has_subtitle ? (
                          <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium">已匹配字幕</div>
                        ) : (
                          <div className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded font-medium">缺字幕</div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {!file.has_subtitle && !isMatching && (
                            <button 
                              onClick={() => handleAutoSearch(file.id)}
                              className="bg-emerald-50 text-emerald-600 text-xs px-3 py-1.5 rounded-md font-medium hover:bg-emerald-100 transition-colors"
                            >
                              自动搜索
                            </button>
                          )}
                          <button 
                            onClick={() => handleManualSearch(file.extracted_title || file.filename)}
                            className="bg-blue-50 text-blue-600 text-xs px-3 py-1.5 rounded-md font-medium hover:bg-blue-100 transition-colors"
                          >
                            手动搜索
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <EmptySelectionState typeName="电影" />
        )}
      </div>
    </div>
  );
}
