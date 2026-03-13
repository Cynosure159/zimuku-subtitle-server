import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import type { SearchResult } from '../api';
import SearchResultDetails from './SearchResultDetails';

interface SearchResultRowProps {
  item: SearchResult;
  isExpanded: boolean;
  onToggle: () => void;
  onDownload: (item: SearchResult) => void;
}

export default function SearchResultRow({ item, isExpanded, onToggle, onDownload }: SearchResultRowProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="text-base font-bold text-slate-900 leading-snug truncate">
            {item.title}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {item.langs && item.langs.length > 0 && (
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {item.langs.join(', ')}
              </span>
            )}
            {item.format && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {item.format}
              </span>
            )}
            {item.fps && (
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                {item.fps}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6">
            <SearchResultDetails item={item} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(item);
              }}
              className="mt-4 text-blue-500 text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              下载
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
