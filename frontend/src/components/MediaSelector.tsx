import { useState, useEffect, useMemo } from 'react';
import { Film, Tv, ChevronRight, ChevronDown } from 'lucide-react';
import { listScannedFiles } from '../api';

interface ScannedFile {
  id: number;
  type: string;
  file_path: string;
  filename: string;
  extracted_title: string | null;
  year: string | null;
  season: number | null;
  episode: number | null;
}

interface MediaItem {
  id: number | string;
  title: string;
  path: string;
  path_type: 'movie' | 'tv';
  year?: number;
  episode_count?: number;
  seasons?: number[];
  seasonEpisodes?: Record<number, number[]>; // season -> episodes
}

interface MediaSelectorProps {
  onSelect: (media: MediaSelection) => void;
  defaultType?: 'movie' | 'tv';
}

export interface MediaSelection {
  id: number | string;
  title: string;
  type: 'movie' | 'tv';
  path: string;
  year?: number;
  episode_count?: number;
  season?: number;
  episodes?: number[];
}

export default function MediaSelector({ onSelect, defaultType = 'movie' }: MediaSelectorProps) {
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>(defaultType);
  const [rawData, setRawData] = useState<ScannedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<number | string>>(new Set());

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      try {
        const data = await listScannedFiles(mediaType);
        setRawData(data);
      } catch (err) {
        console.error('Failed to fetch media:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, [mediaType]);

  // Group and aggregate data by title
  const mediaItems = useMemo(() => {
    if (mediaType === 'movie') {
      // For movies, each file is a separate item
      return rawData.map((file) => ({
        id: file.id,
        title: file.extracted_title || file.filename,
        path: file.file_path,
        path_type: file.type as 'movie' | 'tv',
        year: file.year ? parseInt(file.year) : undefined,
      }));
    } else {
      // For TV, group by title and collect seasons and episodes
      const grouped = new Map<string, MediaItem>();
      for (const file of rawData) {
        const title = file.extracted_title || file.filename;
        if (!grouped.has(title)) {
          // Use title as id for grouped items to ensure consistency
          grouped.set(title, {
            id: title.split('').reduce((a, c) => a + c.charCodeAt(0), 0),
            title,
            path: file.file_path,
            path_type: 'tv',
            seasons: [],
            episode_count: 0,
            seasonEpisodes: {},
          });
        }
        const item = grouped.get(title)!;
        if (file.season !== null) {
          if (!item.seasons!.includes(file.season)) {
            item.seasons!.push(file.season);
          }
          // Track episodes per season
          if (file.episode !== null) {
            if (!item.seasonEpisodes![file.season]) {
              item.seasonEpisodes![file.season] = [];
            }
            if (!item.seasonEpisodes![file.season].includes(file.episode)) {
              item.seasonEpisodes![file.season].push(file.episode);
            }
          }
        }
        item.episode_count = (item.episode_count || 0) + 1;
      }
      // Sort seasons and episodes
      for (const item of grouped.values()) {
        item.seasons?.sort((a, b) => a - b);
        if (item.seasonEpisodes) {
          for (const season of Object.keys(item.seasonEpisodes)) {
            item.seasonEpisodes[parseInt(season)].sort((a, b) => a - b);
          }
        }
      }
      return Array.from(grouped.values());
    }
  }, [rawData, mediaType]);

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
    // Find the first file for this title to get the id and path
    const file = rawData.find(f => (f.extracted_title || f.filename) === item.title);
    onSelect({
      id: file?.id || item.id,
      title: item.title,
      type: item.path_type,
      path: file?.file_path || item.path,
      year: item.year,
      episode_count: item.episode_count,
      season,
      episodes: season && item.seasonEpisodes ? item.seasonEpisodes[season] : undefined,
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
                  <div className="flex-1 min-w-0 flex items-center justify-between">
                    <div className="font-medium text-slate-900 truncate">{item.title}</div>
                    <div className="text-sm text-slate-500 shrink-0 ml-2">
                      {item.path_type === 'movie' && item.year && `${item.year}`}
                      {item.path_type === 'tv' && item.episode_count && `${item.episode_count} 集`}
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
