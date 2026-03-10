import { useState } from 'react';
import { Settings, Play, Loader2 } from 'lucide-react';
import { addMediaPath, deleteMediaPath, updateMediaPath, triggerMediaMatch } from '../api';
import { type MediaPath } from '../hooks/useMediaPolling';

interface MediaConfigPanelProps {
  type: 'movie' | 'tv';
  paths: MediaPath[];
  isScanning: boolean;
  onRefreshData: () => void;
  title: string;
}

export function MediaConfigPanel({ type, paths, isScanning, onRefreshData, title }: MediaConfigPanelProps) {
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
      alert('添加失败: ' + message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除此路径吗？（相关的扫描记录也会被删除）')) return;
    await deleteMediaPath(id);
    onRefreshData();
  };

  const handleToggle = async (id: number, current: boolean) => {
    await updateMediaPath(id, !current);
    onRefreshData();
  };

  const handleMatch = async () => {
    try {
      await triggerMediaMatch(type);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert('触发失败: ' + message);
    }
  };

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
            目录配置
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
            {isScanning ? '刷新中...' : `刷新${type === 'movie' ? '电影' : '剧集'}`}
          </button>
        </div>
      </div>

      {/* Path Config Modal/Section */}
      {showConfig && (
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-6 border border-slate-100 mb-2">
          <h2 className="text-lg font-bold text-slate-900">扫描目录配置</h2>
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={`输入${type === 'movie' ? '电影' : '剧集'}文件夹的绝对路径，例如：/mnt/media/${type === 'movie' ? 'movies' : 'tv'}`} 
              className="flex-1 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:bg-white transition-colors"
            />
            <button 
              onClick={handleAdd}
              className="bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              添加路径
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {paths.map(path => (
              <div key={path.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50">
                <div className="text-sm font-medium text-slate-900">{path.path}</div>
                <div className="flex items-center gap-4">
                  <input type="checkbox" checked={path.enabled} onChange={() => handleToggle(path.id, path.enabled)} className="w-4 h-4 cursor-pointer" />
                  <button onClick={() => handleDelete(path.id)} className="text-red-500 text-sm hover:underline">删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
