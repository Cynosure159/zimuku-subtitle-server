import { useState } from 'react';
import { Settings, Play, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { addMediaPath, deleteMediaPath, updateMediaPath, triggerMediaMatch } from '../api';
import { type MediaPath } from '../hooks/useMediaPolling';

interface MediaConfigPanelProps {
  type: 'movie' | 'tv';
  paths: MediaPath[];
  isScanning: boolean;
  onRefreshData: () => void;
  title: string;
  setIsScanningOptimistic?: (value: boolean) => void;
}

export function MediaConfigPanel({ type, paths, isScanning, onRefreshData, title, setIsScanningOptimistic }: MediaConfigPanelProps) {
  const { t } = useTranslation();
  const [showConfig, setShowConfig] = useState(false);
  const [newPath, setNewPath] = useState('');

  const handleAdd = async () => {
    if (!newPath.trim()) return;
    try {
      await addMediaPath(newPath, type);
      setNewPath('');
      onRefreshData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(t('mediaConfig.addFailed') + ': ' + message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('confirm.deletePath'))) return;
    await deleteMediaPath(id);
    onRefreshData();
  };

  const handleToggle = async (id: number, current: boolean) => {
    await updateMediaPath(id, !current);
    onRefreshData();
  };

  const handleMatch = async () => {
    try {
      // Optimistic update for immediate UI feedback
      if (setIsScanningOptimistic) {
        setIsScanningOptimistic(true);
        // Fallback to clear state after 3 seconds
        setTimeout(() => setIsScanningOptimistic(false), 3000);
      }
      await triggerMediaMatch(type);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(t('mediaConfig.triggerFailed') + ': ' + message);
      // Revert optimistic state on error
      if (setIsScanningOptimistic) {
        setIsScanningOptimistic(false);
      }
    }
  };

  const pathPlaceholder = type === 'movie' ? t('mediaConfig.inputPathPlaceholder') : t('mediaConfig.inputTvPathPlaceholder');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="bg-slate-100 text-slate-600 text-sm px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 font-medium"
          >
            <Settings className="w-4 h-4" />
            {t('mediaConfig.directoryConfig')}
          </button>
          <button
            onClick={handleMatch}
            disabled={isScanning}
            className={`${isScanning ? 'bg-slate-300' : 'bg-emerald-500 hover:bg-emerald-600'} text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium`}
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isScanning ? t('mediaConfig.refreshing') : (type === 'movie' ? t('mediaConfig.refreshMovie') : t('mediaConfig.refreshTv'))}
          </button>
        </div>
      </div>

      {/* Path Config Modal/Section */}
      {showConfig && (
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-6 border border-slate-100 mb-2">
          <h2 className="text-lg font-bold text-slate-900">{t('mediaConfig.scanDirectoryConfig')}</h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={pathPlaceholder}
              className="flex-1 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:bg-white transition-colors"
            />
            <button
              onClick={handleAdd}
              className="bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              {t('mediaConfig.addPath')}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {paths.map(path => (
              <div key={path.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50">
                <div className="text-sm font-medium text-slate-900">{path.path}</div>
                <div className="flex items-center gap-4">
                  <input type="checkbox" checked={path.enabled} onChange={() => handleToggle(path.id, path.enabled)} className="w-4 h-4 cursor-pointer" />
                  <button onClick={() => handleDelete(path.id)} className="text-red-500 text-sm hover:underline">{t('action.delete')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
