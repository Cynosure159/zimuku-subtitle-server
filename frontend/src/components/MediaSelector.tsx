import { useState, useEffect, useMemo } from 'react';
import { Film, Tv, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listScannedFiles, type ScannedFile, type MediaSelection } from '../api';

export type { MediaSelection };

interface MediaItem {
  id: number | string;
  title: string;
  path: string;
  path_type: 'movie' | 'tv';
  year?: number;
  episode_count?: number;
  seasons?: number[];
  seasonEpisodes?: Record<number, number[]>;
}

interface MediaSelectorProps {
  onSelect: (media: MediaSelection) => void;
  defaultType?: 'movie' | 'tv';
}

export default function MediaSelector({ onSelect, defaultType = 'movie' }: MediaSelectorProps) {
  const { t } = useTranslation();
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

  const mediaItems = useMemo(() => {
    if (mediaType === 'movie') {
      return rawData.map(file => ({
        id: file.id,
        title: file.extracted_title || file.filename,
        path: file.file_path,
        path_type: file.type as 'movie' | 'tv',
        year: file.year ? parseInt(file.year) : undefined,
        episode_count: undefined,
        seasons: undefined,
        seasonEpisodes: undefined,
      }));
    }

    const grouped = new Map<string, MediaItem>();
    for (const file of rawData) {
      const title = file.extracted_title || file.filename;
      if (!grouped.has(title)) {
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
      const season = file.season;
      if (season !== null && season !== undefined) {
        if (!item.seasons!.includes(season)) {
          item.seasons!.push(season);
        }
        const episode = file.episode;
        if (episode !== null && episode !== undefined) {
          if (!item.seasonEpisodes![season]) {
            item.seasonEpisodes![season] = [];
          }
          if (!item.seasonEpisodes![season].includes(episode)) {
            item.seasonEpisodes![season].push(episode);
          }
        }
      }
      item.episode_count = (item.episode_count || 0) + 1;
    }

    for (const item of grouped.values()) {
      item.seasons?.sort((a, b) => a - b);
      if (item.seasonEpisodes) {
        for (const season of Object.keys(item.seasonEpisodes)) {
          item.seasonEpisodes[parseInt(season)].sort((a, b) => a - b);
        }
      }
    }
    return Array.from(grouped.values());
  }, [rawData, mediaType]);

  const toggleExpand = (id: number | string) => {
    setExpandedItems(prev => {
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
    return <div className="text-sm text-slate-500 py-4">{t('mediaSelector.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex bg-surface-container-highest/10 p-1 rounded-xl border border-outline-variant/5">
        <button
          onClick={() => setMediaType('movie')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-label font-bold uppercase tracking-wider transition-all duration-300 ${
            mediaType === 'movie' 
              ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/20'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          {t('mediaSelector.movie')}
        </button>
        <button
          onClick={() => setMediaType('tv')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-label font-bold uppercase tracking-wider transition-all duration-300 ${
            mediaType === 'tv' 
              ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/20'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          {t('mediaSelector.tv')}
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
        {mediaItems.length === 0 ? (
          <div className="p-6 text-[11px] text-on-surface-variant text-center font-body opacity-40 italic">
            {mediaType === 'movie' ? t('mediaSelector.notFound') : t('mediaSelector.notFoundTv')}
          </div>
        ) : (
          <div className="space-y-0.5">
            {mediaItems.map(item => (
              <div key={item.id} className="group">
                <button
                  onClick={() => (item.path_type === 'tv' ? toggleExpand(item.id) : handleSelect(item))}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-highest/20 transition-all duration-200 text-left border border-transparent hover:border-outline-variant/5"
                >
                  <div className="w-7 h-7 rounded-md bg-surface-container-high flex items-center justify-center shrink-0 text-on-surface-variant group-hover:text-primary transition-colors">
                    {item.path_type === 'tv' ? (
                      expandedItems.has(item.id) ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )
                    ) : (
                      <Film className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-headline font-bold text-on-surface text-sm truncate leading-tight">{item.title}</div>
                    <div className="text-[10px] font-label font-bold uppercase tracking-wider text-on-surface-variant/40 mt-0.5">
                      {item.path_type === 'movie' && item.year && `${item.year}`}
                      {item.path_type === 'tv' &&
                        item.episode_count &&
                        t('mediaSelector.episodes', { count: item.episode_count })}
                    </div>
                  </div>
                </button>

                {item.path_type === 'tv' && expandedItems.has(item.id) && item.seasons && (
                  <div className="pl-12 pr-4 pb-2 pt-0.5 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1">
                    {item.seasons.map(season => (
                      <button
                        key={season}
                        onClick={() => handleSelect(item, season)}
                        className="px-3 py-1 bg-surface-container-highest/30 text-on-surface-variant rounded-md text-[10px] font-bold font-label tracking-wider hover:bg-primary hover:text-on-primary transition-all duration-200"
                      >
                        {t('episodeSelector.season', { n: season })}
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
