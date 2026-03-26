import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EpisodeSelectorProps {
  seriesTitle: string;
  season: number;
  episodes: number[];
  onSelect: (episode: number) => void;
  onBack: () => void;
}

function buildDisplayEpisodes(episodes: number[]): number[] {
  if (episodes.length > 0) {
    return episodes;
  }

  return Array.from({ length: 24 }, (_, index) => index + 1);
}

export default function EpisodeSelector({
  seriesTitle,
  season,
  episodes,
  onSelect,
  onBack,
}: EpisodeSelectorProps): React.JSX.Element {
  const { t } = useTranslation();
  const displayEpisodes = buildDisplayEpisodes(episodes);

  return (
    <div className="flex flex-col gap-3 p-3 animate-in fade-in slide-in-from-left-1 duration-300">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg bg-surface-container-highest/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/40 transition-all duration-300 border border-outline-variant/5"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <div className="font-headline font-bold text-on-surface text-sm truncate leading-tight">{seriesTitle}</div>
          <div className="text-[10px] font-label font-bold uppercase tracking-wider text-primary mt-0.5">{t('episodeSelector.season', { n: season })}</div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-0.5">
        {displayEpisodes.map(episode => (
          <button
            key={episode}
            onClick={() => onSelect(episode)}
            className="px-1.5 py-1.5 bg-surface-container-highest/20 text-on-surface-variant rounded-lg text-[11px] font-label font-bold tracking-wider border border-outline-variant/5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-200"
          >
            E{episode.toString().padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  );
}
