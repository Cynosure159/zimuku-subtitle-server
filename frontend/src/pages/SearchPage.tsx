import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { searchSubtitles, type SearchResult as SearchResultType } from '../api';
import SearchResultRow from '../components/SearchResultRow';
import DownloadModal from '../components/DownloadModal';

export default function SearchPage() {
  const [activeFilter, setActiveFilter] = useState('全部');
  const filters = ['全部', '简体', '繁体', '英文', '双语'];
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedSubtitle, setSelectedSubtitle] = useState<SearchResultType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await searchSubtitles(query);
      setResults(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || '搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (item: SearchResultType) => {
    setSelectedSubtitle(item);
    setModalOpen(true);
  };

  const handleDownloadConfirm = async () => {
    // The actual download is handled in DownloadModal
    // This callback is for showing success feedback
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedSubtitle(null);
  };

  const handleToggle = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
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
          <SearchResultRow
            key={index}
            item={item}
            isExpanded={expandedIndex === index}
            onToggle={() => handleToggle(index)}
            onDownload={handleDownload}
          />
        ))}
        {results.length > 0 && filteredResults.length === 0 && (
          <div className="text-slate-500 text-sm py-4 text-center">当前筛选条件下没有结果</div>
        )}
      </div>

      <DownloadModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        subtitle={selectedSubtitle}
        onDownload={handleDownloadConfirm}
      />
    </div>
  );
}
