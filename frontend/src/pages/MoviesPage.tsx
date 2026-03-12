import { useMemo, useState, useEffect } from 'react';
import { MediaConfigPanel } from '../components/MediaConfigPanel';
import { MediaSidebar, type SidebarItem } from '../components/MediaSidebar';
import { MediaInfoCard } from '../components/MediaInfoCard';
import { EmptySelectionState } from '../components/EmptySelectionState';
import { MediaList } from '../components/MediaList';
import { useMediaPolling, type ScannedFile } from '../hooks/useMediaPolling';

export default function MoviesPage() {
  const { paths, files, status, fetchData } = useMediaPolling('movie');
  
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
              <MediaList files={selectedMovie.files} status={status} />
            </div>
          </div>
        ) : (
          <EmptySelectionState typeName="电影" />
        )}
      </div>
    </div>
  );
}
