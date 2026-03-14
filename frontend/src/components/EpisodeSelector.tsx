import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { matchTVSeason } from '../api';

interface EpisodeSelectorProps {
  seriesTitle: string;
  season: number;
  onSelect: (episode: number) => void;
  onBack: () => void;
}

export default function EpisodeSelector({ seriesTitle, season, onSelect, onBack }: EpisodeSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<number[]>([]);

  useEffect(() => {
    const fetchEpisodes = async () => {
      setLoading(true);
      try {
        const data = await matchTVSeason(seriesTitle, season);
        if (data && data.episodes) {
          setEpisodes(data.episodes);
        } else {
          // Default to 24 episodes if no data
          setEpisodes(Array.from({ length: 24 }, (_, i) => i + 1));
        }
      } catch (err) {
        console.error('Failed to fetch episodes:', err);
        // Default to 24 episodes on error
        setEpisodes(Array.from({ length: 24 }, (_, i) => i + 1));
      } finally {
        setLoading(false);
      }
    };
    fetchEpisodes();
  }, [seriesTitle, season]);

  if (loading) {
    return <div className="text-sm text-slate-500 py-4">加载剧集...</div>;
  }

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
        {episodes.map((ep) => (
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
