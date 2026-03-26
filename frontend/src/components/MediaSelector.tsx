import { useMemo, useState } from 'react';
import { Film, Tv, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MediaSelection } from '../api';
import { useMediaFilesQuery } from '../hooks/queries';
import {
  buildMediaSelection,
  buildMediaSelectorItems,
  type MediaSelectorItem,
} from '../selectors/mediaSelector';
import type { ScannedFile } from '../types/api';

export type { MediaSelection };

const EMPTY_FILES: ScannedFile[] = [];

interface MediaSelectorProps {
  onSelect: (media: MediaSelection) => void;
  defaultType?: 'movie' | 'tv';
}

function getMediaTypeButtonClass(currentType: 'movie' | 'tv', buttonType: 'movie' | 'tv'): string {
  if (currentType === buttonType) {
    return 'bg-primary text-on-primary shadow-lg shadow-primary/20';
  }

  return 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/20';
}

function getMediaItemMetaText(
  item: MediaSelectorItem,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (item.path_type === 'movie') {
    return item.year ? `${item.year}` : '';
  }

  if (!item.episode_count) {
    return '';
  }

  return t('mediaSelector.episodes', { count: item.episode_count });
}

function getEmptyStateText(mediaType: 'movie' | 'tv', t: ReturnType<typeof useTranslation>['t']): string {
  return mediaType === 'movie' ? t('mediaSelector.notFound') : t('mediaSelector.notFoundTv');
}

export default function MediaSelector({
  onSelect,
  defaultType = 'movie',
}: MediaSelectorProps): React.JSX.Element {
  const { t } = useTranslation();
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>(defaultType);
  const [expandedItems, setExpandedItems] = useState<Set<number | string>>(new Set());
  const mediaFilesQuery = useMediaFilesQuery(mediaType);
  const rawData = mediaFilesQuery.data ?? EMPTY_FILES;
  const loading = mediaFilesQuery.isLoading;
  const mediaItems = useMemo(() => buildMediaSelectorItems(rawData, mediaType), [rawData, mediaType]);

  const toggleExpand = (id: number | string): void => {
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

  const handleSelect = (item: MediaSelectorItem, season?: number): void => {
    onSelect(buildMediaSelection(item, rawData, season));
  };

  if (loading) {
    return <div className="text-sm text-slate-500 py-4">{t('mediaSelector.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex bg-surface-container-highest/10 p-1 rounded-xl border border-outline-variant/5">
        <button
          onClick={() => setMediaType('movie')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-label font-bold uppercase tracking-wider transition-all duration-300 ${getMediaTypeButtonClass(mediaType, 'movie')}`}
        >
          <Film className="w-3.5 h-3.5" />
          {t('mediaSelector.movie')}
        </button>
        <button
          onClick={() => setMediaType('tv')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-label font-bold uppercase tracking-wider transition-all duration-300 ${getMediaTypeButtonClass(mediaType, 'tv')}`}
        >
          <Tv className="w-3.5 h-3.5" />
          {t('mediaSelector.tv')}
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
        {mediaItems.length === 0 ? (
          <div className="p-6 text-[11px] text-on-surface-variant text-center font-body opacity-40 italic">
            {getEmptyStateText(mediaType, t)}
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
                      {getMediaItemMetaText(item, t)}
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
