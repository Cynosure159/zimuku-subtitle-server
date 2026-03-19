import { useState, useEffect } from 'react';
import { Download, Loader2, ChevronDown, ChevronUp, Film, Tv } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import MediaSelector, { type MediaSelection } from './MediaSelector';
import EpisodeSelector from './EpisodeSelector';
import { createDownloadTask, type SearchResult } from '../api';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitle: SearchResult | null;
  onDownload?: () => void;
}

export default function DownloadModal({ isOpen, onClose, subtitle, onDownload }: DownloadModalProps) {
  const { t } = useTranslation();
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [targetMedia, setTargetMedia] = useState<MediaSelection | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined);
  const [selectedEpisode, setSelectedEpisode] = useState<number | undefined>(undefined);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPath, setCustomPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaSelectorType, setMediaSelectorType] = useState<'movie' | 'tv'>('movie');

  // Reset selections when modal opens with new subtitle
  useEffect(() => {
    if (subtitle) {
      setSelectedLangs(subtitle.lang || []);
      setSelectedFormat(subtitle.format || '');
    }
  }, [subtitle]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTargetMedia(null);
      setSelectedSeason(undefined);
      setSelectedEpisode(undefined);
      setShowAdvanced(false);
      setCustomPath('');
    }
  }, [isOpen]);

  const handleMediaSelect = (media: MediaSelection) => {
    setTargetMedia(media);
    setMediaSelectorType(media.type);
    if (media.type === 'movie') {
      setSelectedSeason(undefined);
      setSelectedEpisode(undefined);
    } else {
      // TV series - always reset episode, keep season if selected
      setSelectedEpisode(undefined);
      if (media.season) {
        setSelectedSeason(media.season);
      } else {
        setSelectedSeason(undefined);
      }
    }
  };

  const handleEpisodeSelect = (episode: number) => {
    setSelectedEpisode(episode);
  };

  const handleDownload = async () => {
    if (!subtitle) return;

    const hasMediaTarget = targetMedia && (targetMedia.type === 'movie' || (selectedSeason && selectedEpisode));
    const hasCustomPath = customPath.trim();

    if (!hasMediaTarget && !hasCustomPath) return;

    setLoading(true);
    try {
      if (hasMediaTarget) {
        await createDownloadTask(
          subtitle.title,
          subtitle.link,
          targetMedia!.path,
          targetMedia!.type as 'movie' | 'tv',
          selectedSeason,
          selectedEpisode,
          selectedLangs[0]
        );
      } else if (hasCustomPath) {
        await createDownloadTask(
          subtitle.title,
          subtitle.link,
          customPath.trim()
        );
      }
      onDownload?.();
      onClose();
      alert(t('download.downloadAdded'));
    } catch (err) {
      console.error('Download failed:', err);
      alert(t('download.downloadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getTargetDisplay = () => {
    if (!targetMedia) return null;
    if (targetMedia.type === 'movie') {
      return `${t('movie')}: ${targetMedia.title}${targetMedia.year ? ` (${targetMedia.year})` : ''}`;
    } else if (selectedSeason && selectedEpisode) {
      return `${t('tv')}: ${targetMedia.title} S${selectedSeason.toString().padStart(2, '0')}E${selectedEpisode.toString().padStart(2, '0')}`;
    } else if (selectedSeason) {
      return `${t('tv')}: ${targetMedia.title} ${t('episodeSelector.season', { n: selectedSeason })}`;
    }
    return null;
  };

  const canDownload = () => {
    if (!subtitle || selectedLangs.length === 0) return false;
    if (customPath.trim()) return true;
    if (!targetMedia) return false;
    if (targetMedia.type === 'movie') return true;
    return selectedSeason !== undefined && selectedEpisode !== undefined;
  };

  if (!subtitle) return null;

  const availableLangs = subtitle.lang || [t('searchFilter.simplified'), t('searchFilter.traditional'), t('searchFilter.english'), t('searchFilter.bilingual')];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('download.title')}>
      <div className="flex flex-col gap-6">
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="font-medium text-slate-900">{subtitle.title}</h3>
          {subtitle.format && (
            <p className="text-sm text-slate-500 mt-1">{t('download.format')}: {subtitle.format}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">{t('download.selectLanguage')}</label>
          <div className="flex flex-wrap gap-2">
            {availableLangs.map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setSelectedLangs((prev) =>
                    prev.includes(lang)
                      ? prev.filter((l) => l !== lang)
                      : [...prev, lang]
                  );
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedLangs.includes(lang)
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {subtitle.format && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">{t('download.format')}</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFormat(subtitle.format || '')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedFormat === subtitle.format
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {subtitle.format}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">{t('download.selectTargetMedia')}</label>
          {targetMedia && targetMedia.type === 'tv' && !selectedEpisode ? (
            <EpisodeSelector
              seriesTitle={targetMedia.title}
              season={selectedSeason || 1}
              episodes={targetMedia.episodes || []}
              onSelect={handleEpisodeSelect}
              onBack={() => {
                setTargetMedia(null);
                setSelectedSeason(undefined);
                setSelectedEpisode(undefined);
                setMediaSelectorType('tv');
              }}
            />
          ) : (
            <MediaSelector onSelect={handleMediaSelect} defaultType={mediaSelectorType} />
          )}
        </div>

        {getTargetDisplay() && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 px-3 py-2 rounded-lg">
            {targetMedia?.type === 'movie' ? (
              <Film className="w-4 h-4" />
            ) : (
              <Tv className="w-4 h-4" />
            )}
            <span>{getTargetDisplay()}</span>
          </div>
        )}

        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {t('download.advancedOptions')}
          </button>

          {showAdvanced && (
            <div className="mt-3">
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder={t('download.customPathPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                {t('download.customPathNote')}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={!canDownload() || loading}
          className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t('download.adding')}
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              {t('download.startDownload')}
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
