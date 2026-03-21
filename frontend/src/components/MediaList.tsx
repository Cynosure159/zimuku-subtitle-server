import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { autoMatchFile } from '../api';
import type { ScannedFile, TaskStatus } from '../hooks/useMediaPolling';

interface MediaListProps {
  files: ScannedFile[];
  status: TaskStatus;
  onAutoSearch?: (fileId: number) => Promise<void>;
  setMatchingFileOptimistic?: (fileId: number, isMatching: boolean) => void;
}

export function MediaList({ files, status, onAutoSearch, setMatchingFileOptimistic }: MediaListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleAutoSearch = async (fileId: number) => {
    if (setMatchingFileOptimistic) {
      setMatchingFileOptimistic(fileId, true);
      setTimeout(() => setMatchingFileOptimistic(fileId, false), 3000);
    }
    try {
      if (onAutoSearch) {
        await onAutoSearch(fileId);
        return;
      }
      await autoMatchFile(fileId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(t('mediaConfig.triggerFailed') + ': ' + message);
      if (setMatchingFileOptimistic) {
        setMatchingFileOptimistic(fileId, false);
      }
    }
  };

  const handleManualSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {files.map(file => {
        const isMatching = status.matching_files.includes(file.id);
        const hasSub = file.has_subtitle;
        
        const bgColor = hasSub || isMatching ? 'bg-surface-container-high' : 'bg-surface-container-high/60';
        const borderColor = hasSub || isMatching ? 'hover:border-primary/20' : 'hover:border-error-dim/20';
        const iconColor = hasSub || isMatching ? 'text-primary' : 'text-error';
        const badgeClass = isMatching
          ? 'bg-primary/10 text-primary border border-primary/20'
          : hasSub
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'bg-error-dim/10 text-error-dim border border-error-dim/20';
          
        const badgeLabel = isMatching ? t('status.searching') : (hasSub ? 'Matched' : 'Missing');

        return (
          <div key={file.id} className={`grid xl:grid-cols-12 grid-cols-1 items-center gap-4 ${bgColor} p-4 rounded-2xl hover:bg-surface-bright/40 transition-colors border border-transparent ${borderColor} group`}>
            
            <div className="xl:col-span-8 flex items-center gap-5 w-full overflow-hidden">
              <div className={`w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center ${iconColor} shadow-sm shrink-0 ${!hasSub && !isMatching ? 'opacity-80' : ''}`}>
                {isMatching ? (
                  <span className="material-symbols-outlined text-2xl animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>movie</span>
                )}
              </div>
              <div className="min-w-0 pr-2 overflow-hidden flex-1">
                <p className="font-bold text-on-surface truncate" title={file.filename}>{file.filename}</p>
              </div>
            </div>

            <div className="xl:col-span-4 flex items-center justify-start xl:justify-end gap-4 mt-2 xl:mt-0">
              <div className="flex items-center bg-surface-container rounded-lg p-0.5 border border-outline-variant/10">
                <button
                  onClick={() => handleManualSearch(file.extracted_title || file.filename)}
                  className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors tooltip"
                  title="Manual Search"
                >
                  <span className="material-symbols-outlined text-xl">search</span>
                </button>
                {!hasSub && !isMatching && (
                  <button
                    onClick={() => handleAutoSearch(file.id)}
                    className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-colors tooltip"
                    title="Auto Match"
                  >
                    <span className="material-symbols-outlined text-xl">download</span>
                  </button>
                )}
              </div>
              
              <span className={`min-w-[84px] text-center px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${badgeClass}`}>
                {badgeLabel}
              </span>
            </div>
            
          </div>
        );
      })}
    </div>
  );
}
