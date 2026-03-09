import { useState } from 'react';
import { Search, Download, Loader2 } from 'lucide-react';
import { searchSubtitles, createDownloadTask } from '../api';

interface SearchResult {
  title: string;
  detail_url: string;
  download_count?: string;
  author?: string;
  langs?: string[];
}

export default function SearchPage() {
  const [activeFilter, setActiveFilter] = useState('全部');
  const filters = ['全部', '简体', '繁体', '英文', '双语'];
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await searchSubtitles(query);
      setResults(data);
    } catch (err: any) {
      setError(err.message || '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (item: SearchResult) => {
    try {
      await createDownloadTask(item.title, item.detail_url);
      alert('已添加到下载任务');
    } catch (err: any) {
      alert('添加下载任务失败: ' + err.message);
    }
  };

  const filteredResults = results.filter(item => {
    if (activeFilter === '全部') return true;
    if (!item.langs) return true; // If no langs parsed, show it anyway
    return item.langs.some(lang => lang.includes(activeFilter));
  });

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900">搜索字幕</h1>

      <div className="bg-white rounded-2xl p-5 flex items-center gap-3 w-full shadow-sm">
        <Search className="w-5 h-5 text-slate-400 shrink-0" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="输入名称..." 
          className="flex-1 outline-none text-sm text-slate-900 placeholder:text-slate-400 bg-transparent"
        />
        <button 
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-500 text-white text-sm px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          搜索
        </button>
      </div>

      <div className="flex gap-2">
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              activeFilter === filter
                ? 'bg-blue-500 text-white'
                : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div className="flex flex-col gap-5">
        {filteredResults.map((item, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 flex items-center justify-between shadow-sm">
            <div className="flex flex-col gap-2">
              <div className="text-base font-bold text-slate-900 leading-snug">
                {item.title}
              </div>
              <div className="flex gap-3 text-xs text-slate-500">
                {item.langs && item.langs.length > 0 && (
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                    {item.langs.join(', ')}
                  </span>
                )}
                {item.author && <span>作者: {item.author}</span>}
                {item.download_count && <span>下载: {item.download_count}</span>}
              </div>
            </div>
            <button 
              onClick={() => handleDownload(item)}
              className="text-blue-500 text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1 shrink-0"
            >
              <Download className="w-4 h-4" />
              下载
            </button>
          </div>
        ))}
        {results.length > 0 && filteredResults.length === 0 && (
          <div className="text-slate-500 text-sm py-4 text-center">当前筛选条件下没有结果</div>
        )}
      </div>
    </div>
  );
}
