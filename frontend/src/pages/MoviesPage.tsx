import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Settings, Search, Image as ImageIcon, FolderOpen, Loader2 } from 'lucide-react';
import { listMediaPaths, addMediaPath, deleteMediaPath, updateMediaPath, triggerMediaMatch, listScannedFiles, autoMatchFile, getMediaStatus } from '../api';

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
  has_subtitle: boolean;
  created_at: string;
}

interface MediaStatus {
  is_scanning: boolean;
  matching_files: number[];
  matching_seasons: { title: string; season: number }[];
}

export default function MoviesPage() {
  const navigate = useNavigate();
  const [paths, setPaths] = useState<MediaPath[]>([]);
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovieTitle, setSelectedMovieTitle] = useState<string | null>(null);
  const [status, setStatus] = useState<MediaStatus>({ is_scanning: false, matching_files: [], matching_seasons: [] });

  const fetchData = async () => {
    try {
      const [pathsData, filesData, statusData] = await Promise.all([
        listMediaPaths(),
        listScannedFiles('movie'),
        getMediaStatus()
      ]);
      setPaths(pathsData.filter((p: MediaPath) => p.type === 'movie'));
      setFiles(filesData);
      setStatus(statusData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let timer: any;
    const poll = async () => {
      try {
        const [pathsData, filesData, statusData] = await Promise.all([
          listMediaPaths(),
          listScannedFiles('movie'),
          getMediaStatus()
        ]);
        setPaths(pathsData.filter((p: MediaPath) => p.type === 'movie'));
        setFiles(filesData);
        setStatus(statusData);

        // 根据是否有活动任务决定下一次轮询时间
        const hasTasks = statusData.is_scanning || statusData.matching_files.length > 0;
        timer = setTimeout(poll, hasTasks ? 2000 : 10000);
      } catch (err) {
        console.error(err);
        timer = setTimeout(poll, 10000); // 10s 后重试
      }
    };
    
    poll();
    return () => clearTimeout(timer);
  }, []);

  const handleAdd = async () => {
    if (!newPath.trim()) return;
    try {
      await addMediaPath(newPath, 'movie');
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
      await triggerMediaMatch('movie');
    } catch (err: any) {
      alert('触发失败: ' + err.message);
    }
  };

  const handleAutoSearch = async (fileId: number) => {
    try {
      await autoMatchFile(fileId);
    } catch (err: any) {
      alert('自动搜索触发失败: ' + err.message);
    }
  };

  const handleManualSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  // Group files by extracted_title
  const groupedMovies = useMemo(() => {
    const groups: Record<string, { title: string; year?: string; files: ScannedFile[] }> = {};
    files.forEach(file => {
      const title = file.extracted_title || '未知电影';
      if (!groups[title]) {
        groups[title] = { title, year: file.year, files: [] };
      }
      groups[title].files.push(file);
    });
    
    return Object.values(groups).filter(m => 
      m.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.title.localeCompare(b.title));
  }, [files, searchTerm]);

  // Auto-select first movie if none selected
  useEffect(() => {
    if (groupedMovies.length > 0 && (!selectedMovieTitle || !groupedMovies.find(m => m.title === selectedMovieTitle))) {
      setSelectedMovieTitle(groupedMovies[0].title);
    }
  }, [groupedMovies, selectedMovieTitle]);

  const selectedMovie = groupedMovies.find(m => m.title === selectedMovieTitle);

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">电影管理</h1>
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
            disabled={status.is_scanning}
            className={`${status.is_scanning ? 'bg-slate-300' : 'bg-emerald-500 hover:bg-emerald-600'} text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium`}
          >
            {status.is_scanning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {status.is_scanning ? '刷新中...' : '刷新电影'}
          </button>
        </div>
      </div>

      {/* Path Config Modal/Section */}
      {showConfig && (
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-6 border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">扫描目录配置</h2>
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="输入电影文件夹的绝对路径，例如：/mnt/media/movies" 
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
              placeholder="搜索电影..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm flex-1 text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {groupedMovies.map(movie => (
              <div 
                key={movie.title}
                onClick={() => setSelectedMovieTitle(movie.title)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedMovieTitle === movie.title ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'}`}
              >
                <div className="w-12 h-16 bg-slate-300 rounded flex items-center justify-center shrink-0">
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  <div className="text-sm font-semibold text-slate-900 truncate">{movie.title}</div>
                  <div className="text-xs text-slate-500">{movie.year || '未知年份'}</div>
                </div>
              </div>
            ))}
            {groupedMovies.length === 0 && (
              <div className="text-center text-sm text-slate-400 py-10">未找到电影</div>
            )}
          </div>
        </div>

        {/* Right Detail */}
        {selectedMovie ? (
          <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6">
            {/* Path section */}
            <div className="bg-slate-50 rounded-xl p-5 flex flex-col gap-3 border border-slate-100">
              <div className="text-sm font-semibold text-slate-600">电影扫描目录</div>
              <div className="bg-white px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 break-all">
                {selectedMovie.files[0]?.file_path.split('\\').slice(0, -1).join('\\') || 
                 selectedMovie.files[0]?.file_path.split('/').slice(0, -1).join('/')}
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm flex gap-8 border border-slate-100">
              <div className="w-36 h-[216px] bg-slate-200 rounded-xl flex items-center justify-center shrink-0">
                <ImageIcon className="w-12 h-12 text-slate-400" />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h2 className="text-2xl font-bold text-slate-900">{selectedMovie.title}</h2>
                  <div className="text-sm text-slate-500">{selectedMovie.year || '未知年份'}</div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  暂无简介信息。后续将通过刮削器自动补充影片详细信息。
                </p>
              </div>
            </div>

            {/* File List */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-slate-900">本地视频文件 ({selectedMovie.files.length})</h3>
              <div className="flex flex-col gap-3">
                {selectedMovie.files.map(file => {
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
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
            <div className="text-slate-400">请选择左侧电影查看详情</div>
          </div>
        )}
      </div>
    </div>
  );
}
