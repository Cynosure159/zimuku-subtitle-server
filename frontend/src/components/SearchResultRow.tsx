import { Download } from 'lucide-react';
import type { SearchResult } from '../api';

interface SearchResultRowProps {
  item: SearchResult;
  onDownload: (item: SearchResult) => void;
}

const languageColors: Record<string, string> = {
  '简体': 'bg-green-100 text-green-700',
  '繁体': 'bg-orange-100 text-orange-700',
  '英文': 'bg-blue-100 text-blue-700',
  '双语': 'bg-purple-100 text-purple-700',
};

export default function SearchResultRow({ item, onDownload }: SearchResultRowProps) {
  const getLanguageClass = (lang: string) => {
    return languageColors[lang] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-900 leading-snug truncate">
          {item.title}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Language tags */}
          {item.lang && item.lang.length > 0 && item.lang.map((lang, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-xs font-medium ${getLanguageClass(lang)}`}
            >
              {lang}
            </span>
          ))}
          {/* Info tags */}
          {item.format && (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
              {item.format}
            </span>
          )}
          {item.fps && (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
              {item.fps}
            </span>
          )}
          {item.rating && (
            <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">
              {item.rating}
            </span>
          )}
          {item.download_count && (
            <span className="text-slate-400 text-xs">
              {item.download_count} 次下载
            </span>
          )}
          {item.author && (
            <span className="text-slate-400 text-xs">
              作者: {item.author}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDownload(item)}
        className="text-blue-500 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1 shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
        下载
      </button>
    </div>
  );
}
