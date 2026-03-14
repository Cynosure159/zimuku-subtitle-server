import { ChevronLeft } from 'lucide-react';

interface EpisodeSelectorProps {
  seriesTitle: string;
  season: number;
  episodes: number[];
  onSelect: (episode: number) => void;
  onBack: () => void;
}

export default function EpisodeSelector({ seriesTitle, season, episodes, onSelect, onBack }: EpisodeSelectorProps) {
  // Use provided episodes or default to 1-24 if empty
  const displayEpisodes = episodes.length > 0 ? episodes : Array.from({ length: 24 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div>
          <div className="font-medium text-slate-900">{seriesTitle}</div>
          <div className="text-sm text-slate-500">第 {season} 季</div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
        {displayEpisodes.map((ep) => (
          <button
            key={ep}
            onClick={() => onSelect(ep)}
            className="px-2 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-blue-500 hover:text-white transition-colors"
          >
            E{ep.toString().padStart(2, '0')}
          </button>
        ))}
      </div>
    </div>
  );
}
