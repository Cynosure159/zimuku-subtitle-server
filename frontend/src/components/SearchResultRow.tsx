import { useTranslation } from 'react-i18next';
import type { SearchResult } from '../api';

interface SearchResultRowProps {
  item: SearchResult;
  onDownload: (item: SearchResult) => void;
}

export default function SearchResultRow({ item, onDownload }: SearchResultRowProps) {
  const { t } = useTranslation();

  return (
    <div className="group flex flex-col lg:flex-row items-start lg:items-center justify-between p-6 rounded-2xl bg-surface-container border border-outline-variant/5 hover:bg-surface-container-highest hover:-translate-y-1 transition-all duration-300 gap-4">
      <div className="flex items-start gap-4 md:gap-5 w-full lg:w-auto lg:flex-1 min-w-0">
        <div className="hidden sm:flex shrink-0 w-12 h-12 items-center justify-center rounded-xl bg-surface-container-low text-primary-dim">
          <span className="material-symbols-outlined text-3xl">description</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-headline font-bold text-on-surface text-lg truncate mb-1" title={item.title}>
            {item.title}
          </h4>
          <div className="flex flex-wrap items-center gap-3">
            {item.lang && item.lang.length > 0 && item.lang.map((lang, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-surface-container-highest border border-outline-variant/20 text-[10px] font-bold text-primary-fixed uppercase tracking-wider shadow-[0_0_8px_rgba(189,194,255,0.15)]"
              >
                {lang}
              </span>
            ))}

            {item.format && (
              <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant/10">
                {item.format}
              </span>
            )}

            <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">source</span> Zimuku
            </span>
            {item.download_count && (
              <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">download</span> {t('downloadCount', { count: Number(item.download_count) })}
              </span>
            )}
            {item.author && (
              <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">person</span> {t('author')}: {item.author}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4 lg:mt-0 w-full lg:w-auto justify-end shrink-0">
        <button
          onClick={() => onDownload(item)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary hover:text-on-primary transition-all whitespace-nowrap"
        >
          <span className="material-symbols-outlined">download</span>
          <span className="text-sm">{t('action.download')}</span>
        </button>
      </div>
    </div>
  );
}
