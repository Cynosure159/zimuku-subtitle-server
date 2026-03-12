import { FolderOpen, Loader2 } from 'lucide-react';
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
  const navigate = useNavigate();

  const handleAutoSearch = async (fileId: number) => {
    // Optimistic update for immediate UI feedback
    if (setMatchingFileOptimistic) {
      setMatchingFileOptimistic(fileId, true);
      // Fallback to clear state after 3 seconds
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
      alert('自动搜索触发失败: ' + message);
      // Revert optimistic state on error
      if (setMatchingFileOptimistic) {
        setMatchingFileOptimistic(fileId, false);
      }
    }
  };

  const handleManualSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col gap-3">
      {files.map(file => {
        const isMatching = status.matching_files.includes(file.id);
        return (
          <div key={file.id} className="bg-white p-4 rounded-xl flex items-center justify-between border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 overflow-hidden">
              <FolderOpen className="w-5 h-5 text-slate-400 shrink-0" />
              <div className="text-sm font-medium text-slate-700 truncate" title={file.filename}>
                {file.filename}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              {isMatching ? (
                <div className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  搜索中
                </div>
              ) : file.has_subtitle ? (
                <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium">已匹配字幕</div>
              ) : (
                <div className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded font-medium">缺字幕</div>
              )}

              <div className="flex items-center gap-2">
                {!file.has_subtitle && !isMatching && (
                  <button
                    onClick={() => handleAutoSearch(file.id)}
                    className="bg-emerald-50 text-emerald-600 text-xs px-3 py-1.5 rounded-md font-medium hover:bg-emerald-100 transition-colors"
                  >
                    自动搜索
                  </button>
                )}
                <button
                  onClick={() => handleManualSearch(file.extracted_title || file.filename)}
                  className="bg-blue-50 text-blue-600 text-xs px-3 py-1.5 rounded-md font-medium hover:bg-blue-100 transition-colors"
                >
                  手动搜索
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
