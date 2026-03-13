import type { SearchResult } from '../api';

interface SearchResultDetailsProps {
  item: SearchResult;
}

export default function SearchResultDetails({ item }: SearchResultDetailsProps) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <div className="flex flex-wrap gap-2 mb-3">
        {item.format && (
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
            {item.format}
          </span>
        )}
        {item.fps && (
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
            {item.fps}
          </span>
        )}
        {item.rating && (
          <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded">
            {item.rating}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        {item.author && <span>作者: {item.author}</span>}
        {item.download_count && <span>下载: {item.download_count}</span>}
      </div>
    </div>
  );
}
