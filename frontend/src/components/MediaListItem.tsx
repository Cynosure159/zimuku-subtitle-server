import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { autoMatchFile } from '../api';
import type { ScannedFile, TaskStatus } from '../hooks/useMediaPolling';

interface MediaListItemProps {
  file: ScannedFile;
  status: TaskStatus;
  showEpisode?: boolean;
  onAutoSearch?: (fileId: number) => Promise<void>;
}

export function MediaListItem({ file, status, showEpisode = false, onAutoSearch }: MediaListItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMatching = status.matching_files.includes(file.id);

  const handleAutoSearch = async () => {
    if (onAutoSearch) {
      await onAutoSearch(file.id);
      return;
    }
    try {
      await autoMatchFile(file.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(t('mediaConfig.triggerFailed') + ': ' + message);
    }
  };

  const handleManualSearch = () => {
    navigate(`/search?q=${encodeURIComponent(file.extracted_title || file.filename)}`);
  };

  return (
    <div className="flex items-center px-5 py-4 border-b border-slate-50 last:border-b-0 transition-all duration-200 hover:bg-slate-50/50">
      <div className="flex-1 flex items-center gap-3 overflow-hidden">
        {showEpisode && (
          <div className="w-10 text-sm font-bold text-slate-400 shrink-0">
            E{file.episode?.toString().padStart(2, '0') || '??'}
          </div>
        )}
        <div className="text-sm text-slate-700 truncate" title={file.filename}>
          {file.filename}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {isMatching ? (
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {t('status.searching')}
          </span>
        ) : file.has_subtitle ? (
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium">{t('status.matched')}</span>
        ) : (
          <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded font-medium">{t('status.missing')}</span>
        )}

        <div className="flex items-center gap-2">
          {!file.has_subtitle && !isMatching && (
            <button
              onClick={handleAutoSearch}
              className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-1 rounded-md font-medium hover:bg-emerald-100 transition-colors duration-150 hover:shadow-sm"
            >
              {t('action.autoSearch')}
            </button>
          )}
          <button
            onClick={handleManualSearch}
            className="bg-blue-50 text-blue-600 text-[10px] px-2 py-1 rounded-md font-medium hover:bg-blue-100 transition-colors duration-150 hover:shadow-sm"
          >
            {t('action.manualSearch')}
          </button>
        </div>
      </div>
    </div>
  );
}
