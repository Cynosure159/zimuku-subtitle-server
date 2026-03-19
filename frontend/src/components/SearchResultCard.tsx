import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SearchResult } from '../api';

interface SearchResultCardProps {
  item: SearchResult;
  onDownload: (item: SearchResult) => void;
}

const languageColors: Record<string, string> = {
  '简体': 'bg-green-100 text-green-700',
  '繁体': 'bg-orange-100 text-orange-700',
  '英文': 'bg-blue-100 text-blue-700',
  '双语': 'bg-purple-100 text-purple-700',
};

export default function SearchResultCard({ item, onDownload }: SearchResultCardProps) {
  const { t } = useTranslation();
  const getLanguageClass = (lang: string) => {
    return languageColors[lang] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="group bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-3">
        {/* Title */}
        <div className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
          {item.title}
        </div>

        {/* Language tags */}
        <div className="flex flex-wrap gap-2">
          {item.lang && item.lang.length > 0 && item.lang.map((lang, idx) => (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-xs font-medium ${getLanguageClass(lang)}`}
            >
              {lang}
            </span>
          ))}
        </div>

        {/* Info row: format, fps, rating, download count */}
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
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
          {item.rating && (
            <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
              {item.rating}
            </span>
          )}
          {item.download_count && (
            <span className="text-slate-500 px-1">
              {t('downloadCount', { count: Number(item.download_count) })}
            </span>
          )}
        </div>

        {/* Download button - shows on hover */}
        <button
          onClick={() => onDownload(item)}
          className="opacity-0 group-hover:opacity-100 transition-opacity self-start mt-1 text-blue-500 text-sm px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          {t('action.download')}
        </button>
      </div>
    </div>
  );
}
