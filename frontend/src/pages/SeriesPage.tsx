import { useEffect, useState, useMemo } from 'react';
import { Play, Settings, Search, Image as ImageIcon, FolderOpen } from 'lucide-react';
import { listMediaPaths, addMediaPath, deleteMediaPath, updateMediaPath, triggerMediaMatch, listScannedFiles } from '../api';

interface MediaPath {
  id: number;
  path: string;
  type: string;
  enabled: boolean;
  last_scanned_at?: string;
}

interface ScannedFile {
  id: number;
  filename: string;
  extracted_title: string;
  file_path: string;
  year?: string;
  season?: number;
  episode?: number;
  has_subtitle: boolean;
  created_at: string;
}

export default function SeriesPage() {
  const [paths, setPaths] = useState<MediaPath[]>([]);
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeriesTitle, setSelectedSeriesTitle] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  const fetchData = async () => {
    try {
      const [pathsData, filesData] = await Promise.all([
        listMediaPaths(),
        listScannedFiles('tv')
      ]);
      setPaths(pathsData.filter((p: MediaPath) => p.type === 'tv'));
      setFiles(filesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAdd = async () => {
    if (!newPath.trim()) return;
    try {
      await addMediaPath(newPath, 'tv');
      setNewPath('');
      fetchData();
    } catch (err: any) {
      alert('添加失败: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除此路径吗？（相关的扫描记录也会被删除）')) return;
    await deleteMediaPath(id);
    fetchData();
  };

  const handleToggle = async (id: number, current: boolean) => {
    await updateMediaPath(id, !current);
    fetchData();
  };

  const handleMatch = async () => {
    try {
      await triggerMediaMatch();
      alert('已在后台触发智能关联任务！');
    } catch (err: any) {
      alert('触发失败: ' + err.message);
    }
  };

  // Group files by extracted_title and season
  const groupedSeries = useMemo(() => {
    const groups: Record<string, { 
      title: string; 
      year?: string; 
      totalCount: number;
      hasSubCount: number;
      firstPath: string;
      seasons: Record<number, ScannedFile[]> 
    }> = {};
    
    files.forEach(file => {
      const title = file.extracted_title || '未知剧集';
      if (!groups[title]) {
        groups[title] = { 
          title, 
          year: file.year, 
          totalCount: 0, 
          hasSubCount: 0, 
          firstPath: file.file_path,
          seasons: {} 
        };
      }
      const s = file.season || 1;
      if (!groups[title].seasons[s]) {
        groups[title].seasons[s] = [];
      }
      groups[title].seasons[s].push(file);
      // Sort episodes inside season
      groups[title].seasons[s].sort((a, b) => (a.episode || 0) - (b.episode || 0));
      
      groups[title].totalCount++;
      if (file.has_subtitle) groups[title].hasSubCount++;
    });
    
    return Object.values(groups).filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  // Auto-select first series
  useEffect(() => {
    if (groupedSeries.length > 0 && (!selectedSeriesTitle || !groupedSeries.find(s => s.title === selectedSeriesTitle))) {
      const first = groupedSeries[0];
      setSelectedSeriesTitle(first.title);
      const availableSeasons = Object.keys(first.seasons).map(Number).sort((a, b) => a - b);
      if (availableSeasons.length > 0) {
        setSelectedSeason(availableSeasons[0]);
      }
    }
  }, [groupedSeries, selectedSeriesTitle]);

  const selectedSeries = groupedSeries.find(s => s.title === selectedSeriesTitle);
  const availableSeasons = selectedSeries ? Object.keys(selectedSeries.seasons).map(Number).sort((a, b) => a - b) : [];
  
  // Update season when selected series changes
  useEffect(() => {
    if (selectedSeries && !availableSeasons.includes(selectedSeason)) {
      if (availableSeasons.length > 0) {
        setSelectedSeason(availableSeasons[0]);
      }
    }
  }, [selectedSeriesTitle, selectedSeries, availableSeasons, selectedSeason]);

  const currentSeasonFiles = selectedSeries?.seasons[selectedSeason] || [];

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">剧集管理</h1>
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
            className="bg-emerald-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 font-medium"
          >
            <Play className="w-4 h-4" />
            刷新剧集
          </button>
        </div>
      </div>

      {/* Path Config Section */}
      {showConfig && (
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-6 border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">扫描目录配置</h2>
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="输入剧集文件夹的绝对路径，例如：/mnt/media/tv" 
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
                  <input type="checkbox" checked={path.enabled} onChange={() => handleToggle(path.id, path.enabled)} className="w-4 h-4" />
                  <button onClick={() => handleDelete(path.id)} className="text-red-500 text-sm hover:underline">删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content: 2 Columns */}
      <div className="flex gap-6 h-[calc(100vh-160px)] min-h-[600px]">
        {/* Left Sidebar */}
        <div className="w-80 bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-4 overflow-hidden border border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜索剧集..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {groupedSeries.map(series => (
              <div 
                key={series.title}
                onClick={() => setSelectedSeriesTitle(series.title)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedSeriesTitle === series.title ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'}`}
              >
                <div className="w-12 h-16 bg-slate-300 rounded flex items-center justify-center shrink-0">
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                </div>
                <div className="flex flex-col gap-1 overflow-hidden w-full">
                  <div className="text-sm font-semibold text-slate-900 truncate">{series.title}</div>
                  <div className="text-xs text-slate-500">{series.year || '未知年份'}</div>
                  <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded w-fit ${series.totalCount === series.hasSubCount ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {series.hasSubCount}/{series.totalCount} 集有字幕
                  </div>
                </div>
              </div>
            ))}
            {groupedSeries.length === 0 && (
              <div className="text-center text-sm text-slate-400 py-10">未找到剧集</div>
            )}
          </div>
        </div>

        {/* Right Detail */}
        {selectedSeries ? (
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6">
            {/* Path section */}
            <div className="bg-slate-50 rounded-xl p-5 flex flex-col gap-3 border border-slate-100">
              <div className="text-sm font-semibold text-slate-600">剧集扫描目录</div>
              <div className="bg-white px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 break-all">
                {selectedSeries.firstPath.split('\\').slice(0, -1).join('\\') || 
                 selectedSeries.firstPath.split('/').slice(0, -1).join('/')}
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm flex gap-8 border border-slate-100">
              <div className="w-36 h-[216px] bg-slate-200 rounded-xl flex items-center justify-center shrink-0">
                <ImageIcon className="w-12 h-12 text-slate-400" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-bold text-slate-900">{selectedSeries.title}</h2>
                  <div className="text-sm text-slate-500">{selectedSeries.year || '未知年份'}</div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  暂无简介信息。后续将通过刮削器自动补充剧集详细信息。
                </p>
              </div>
            </div>

            {/* Seasons Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {availableSeasons.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedSeason(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedSeason === s ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  第 {s} 季
                </button>
              ))}
            </div>

            {/* File List Table */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center">
                <div className="flex-1">集数与文件名称</div>
                <div className="w-24 text-center">状态</div>
              </div>
              <div className="flex flex-col">
                {currentSeasonFiles.map((file, i) => (
                  <div key={file.id} className={`flex items-center px-5 py-4 ${i !== currentSeasonFiles.length - 1 ? 'border-b border-slate-50' : ''}`}>
                    <div className="flex-1 flex items-center gap-3 overflow-hidden">
                      <div className="w-10 text-sm font-bold text-slate-400 shrink-0">
                        E{file.episode?.toString().padStart(2, '0') || '??'}
                      </div>
                      <div className="text-sm text-slate-700 truncate" title={file.filename}>
                        {file.filename}
                      </div>
                    </div>
                    <div className="w-24 flex items-center justify-center shrink-0">
                      {file.has_subtitle ? (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium">已匹配</span>
                      ) : (
                        <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded font-medium">缺字幕</span>
                      )}
                    </div>
                  </div>
                ))}
                {currentSeasonFiles.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-400">
                    本季暂无视频文件
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
            <div className="text-slate-400">请选择左侧剧集查看详情</div>
          </div>
        )}
      </div>
    </div>
  );
}
