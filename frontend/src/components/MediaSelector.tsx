import { useState, useEffect } from 'react';
import { Film, Tv, ChevronRight, ChevronDown } from 'lucide-react';
import { listScannedFiles } from '../api';

interface MediaItem {
  id: number;
  title: string;
  path: string;
  path_type: 'movie' | 'tv';
  year?: number;
  episode_count?: number;
  seasons?: number[];
}

interface MediaSelectorProps {
  onSelect: (media: MediaSelection) => void;
}

export interface MediaSelection {
  id: number;
  title: string;
  type: 'movie' | 'tv';
  path: string;
  year?: number;
  episode_count?: number;
  season?: number;
}

export default function MediaSelector({ onSelect }: MediaSelectorProps) {
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      try {
        const data = await listScannedFiles(mediaType);
        setMediaItems(data);
      } catch (err) {
        console.error('Failed to fetch media:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, [mediaType]);

  const toggleExpand = (id: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (item: MediaItem, season?: number) => {
    onSelect({
      id: item.id,
      title: item.title,
      type: item.path_type,
      path: item.path,
      year: item.year,
      episode_count: item.episode_count,
      season,
    });
  };

  if (loading) {
    return <div className="text-sm text-slate-500 py-4">加载媒体库...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={() => setMediaType('movie')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mediaType === 'movie'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Film className="w-4 h-4" />
          电影
        </button>
        <button
          onClick={() => setMediaType('tv')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mediaType === 'tv'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Tv className="w-4 h-4" />
          剧集
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
        {mediaItems.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 text-center">
            未找到{mediaType === 'movie' ? '电影' : '剧集'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {mediaItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => item.path_type === 'tv' ? toggleExpand(item.id) : handleSelect(item)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  {item.path_type === 'tv' ? (
                    expandedItems.has(item.id) ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )
                  ) : (
                    <Film className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">{item.title}</div>
                    <div className="text-sm text-slate-500">
                      {item.year && `${item.year} · `}
                      {item.episode_count ? `${item.episode_count} 集` : ''}
                    </div>
                  </div>
                </button>

                {item.path_type === 'tv' && expandedItems.has(item.id) && item.seasons && (
                  <div className="pl-10 pr-4 pb-3 flex flex-wrap gap-2">
                    {item.seasons.map((season) => (
                      <button
                        key={season}
                        onClick={() => handleSelect(item, season)}
                        className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-blue-500 hover:text-white transition-colors"
                      >
                        第 {season} 季
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
