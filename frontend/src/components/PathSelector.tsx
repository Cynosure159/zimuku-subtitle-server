import { useState, useEffect } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listMediaPaths } from '../api';
import { useUIStore } from '../stores/useUIStore';

interface PathSelectorProps {
  onSelect: (path: string) => void;
}

interface MediaPath {
  id: number;
  path: string;
  path_type: string;
  enabled: boolean;
}

export default function PathSelector({ onSelect }: PathSelectorProps) {
  const { t } = useTranslation();
  const [paths, setPaths] = useState<MediaPath[]>([]);
  const [customPath, setCustomPath] = useState('');
  const [loading, setLoading] = useState(true);
  const { lastDownloadPath, setLastDownloadPath } = useUIStore();

  useEffect(() => {
    const fetchPaths = async () => {
      try {
        const data = await listMediaPaths();
        setPaths(data);
      } catch (err) {
        console.error('Failed to fetch media paths:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPaths();
  }, []);

  const handlePathClick = (path: string) => {
    setLastDownloadPath(path);
    onSelect(path);
  };

  const handleCustomPathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPath.trim()) {
      setLastDownloadPath(customPath.trim());
      onSelect(customPath.trim());
      setCustomPath('');
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-500">{t('page.settings.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">{t('download.selectTargetMedia')}</label>
        <div className="flex flex-wrap gap-2">
          {paths.map((mediaPath) => (
            <button
              key={mediaPath.id}
              onClick={() => handlePathClick(mediaPath.path)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                lastDownloadPath === mediaPath.path
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span className="truncate max-w-[200px]">{mediaPath.path}</span>
            </button>
          ))}
          {paths.length === 0 && (
            <div className="text-sm text-slate-500">{t('download.customPathNote')}</div>
          )}
        </div>
      </div>

      <form onSubmit={handleCustomPathSubmit} className="flex gap-2">
        <input
          type="text"
          value={customPath}
          onChange={(e) => setCustomPath(e.target.value)}
          placeholder={t('download.customPathPlaceholder')}
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!customPath.trim()}
          className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          {t('action.add')}
        </button>
      </form>

      {lastDownloadPath && (
        <div className="text-sm text-slate-500">
          {t('download.selectTargetMedia')}: <span className="text-slate-700 font-medium">{lastDownloadPath}</span>
        </div>
      )}
    </div>
  );
}
