import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/useUIStore';

export interface SidebarItem {
  id: string;
  displayTitle: string;
  year?: string;
  totalCount: number;
  hasSubCount: number;
  poster?: string | null;
  createdAt?: string;
}

export type SortOption = 'name' | 'year' | 'created' | 'status';
export type FilterOption = 'all' | 'missing';
export type SortOrder = 'asc' | 'desc';

interface MediaSidebarProps {
  items: SidebarItem[];
  searchTerm: string;
  onSearchTermChange: (val: string) => void;
  selectedTitle: string | null;
  onSelectTitle: (title: string) => void;
  searchPlaceholder: string;
  emptyText: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  title?: string;
  // New props for sorting and filtering
  sortOption?: SortOption;
  onSortOptionChange?: (opt: SortOption) => void;
  sortOrder?: SortOrder;
  filterOption?: FilterOption;
  onFilterOptionChange?: (opt: FilterOption) => void;
}

export function MediaSidebar({
  items,
  searchTerm,
  onSearchTermChange,
  selectedTitle,
  onSelectTitle,
  searchPlaceholder,
  emptyText,
  onRefresh,
  isRefreshing,
  title = 'Library',
  sortOption = 'name',
  onSortOptionChange,
  sortOrder = 'asc',
  filterOption = 'all',
  onFilterOptionChange
}: MediaSidebarProps) {
  const { t } = useTranslation();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const [isSortOpen, setIsSortOpen] = useState(false);

  const getSubtitleStatusText = (item: SidebarItem) => {
    if (item.totalCount === 0) return '';
    if (item.hasSubCount === item.totalCount) return t('status.matched');
    if (item.hasSubCount === 0) return t('status.missing');
    return t('status.matchedCount', { has: item.hasSubCount, total: item.totalCount });
  };

  const currentSortLabel = useMemo(() => {
    switch(sortOption) {
      case 'name': return t('sort.name');
      case 'year': return t('sort.year');
      case 'created': return t('sort.created');
      case 'status': return t('sort.subtitleStatus');
      default: return '';
    }
  }, [sortOption, t]);

  return (
    <>
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleSidebar}
          className="w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined">{sidebarOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:relative
          z-40 lg:z-auto
          w-full sm:w-[380px] h-full lg:h-auto
          bg-surface-container-low rounded-2xl p-6 flex flex-col gap-5 overflow-hidden border border-outline-variant/5 shrink-0
          transition-transform duration-200 ease-in-out
        `}
      >
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-headline text-on-surface">{title}</h1>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-primary hover:text-surface-container transition-all active:scale-90 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={t('status.rescan')}
            >
              <span className={`material-symbols-outlined text-sm ${isRefreshing ? 'animate-spin' : ''}`}>sync</span>
            </button>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-bold py-2.5 px-4 rounded-xl transition-all border border-outline-variant/10 active:scale-95 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">sort</span>
              <span className="text-xs uppercase tracking-wider">{currentSortLabel}</span>
              <span className={`material-symbols-outlined text-[14px] transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`}>straight</span>
            </button>
            
            {isSortOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-surface-container-high rounded-xl shadow-2xl border border-outline-variant/10 z-50 overflow-hidden backdrop-blur-md">
                {(['name', 'year', 'created', 'status'] as SortOption[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      onSortOptionChange?.(opt);
                      setIsSortOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors hover:bg-primary/10 ${sortOption === opt ? 'text-primary bg-primary/5' : 'text-on-surface-variant'}`}
                  >
                    {opt === 'name' ? t('sort.name') : opt === 'year' ? t('sort.year') : opt === 'created' ? t('sort.created') : t('sort.subtitleStatus')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 px-2">
          <div className="relative group">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={e => onSearchTermChange(e.target.value)}
              className="w-full bg-surface-container rounded-xl py-3 pl-11 pr-4 border-none focus:ring-1 focus:ring-primary/40 text-sm font-body transition-all placeholder:text-outline text-on-surface outline-none"
            />
            <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-outline text-xl group-focus-within:text-primary transition-colors">search</span>
          </div>

          <div className="flex p-1.5 bg-surface-container rounded-2xl border border-outline-variant/5 shadow-inner">
            <button
              onClick={() => onFilterOptionChange?.('all')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                filterOption === 'all'
                  ? 'bg-primary-container text-primary shadow-[0_4px_12px_rgba(189,194,255,0.3)]'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t('filter.all')}
            </button>
            <button
              onClick={() => onFilterOptionChange?.('missing')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                filterOption === 'missing'
                  ? 'bg-primary-container text-primary shadow-[0_4px_12px_rgba(189,194,255,0.3)]'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {t('filter.missing')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {items.map(item => {
            const isSelected = selectedTitle === item.id;
            const isMatched = item.totalCount > 0 && item.hasSubCount === item.totalCount;
            const statusText = getSubtitleStatusText(item);

            return (
              <div
                key={item.id}
                onClick={() => onSelectTitle(item.id)}
                className={`group relative flex gap-4 p-4 rounded-2xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-surface-container-high shadow-lg border border-primary/20'
                    : 'hover:bg-surface-container border border-transparent hover:border-outline-variant/10'
                }`}
              >
                {isSelected && <div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-l-2xl"></div>}
                
                <div className={`w-16 h-24 rounded-lg bg-surface-container-highest flex-shrink-0 overflow-hidden ${isSelected ? 'shadow-md' : 'opacity-70 group-hover:opacity-100 transition-opacity'}`}>
                  {item.poster ? (
                    <img src={item.poster} alt={item.displayTitle} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline">movie</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <h3 className={`font-headline font-bold text-on-surface leading-tight truncate ${isSelected ? '' : 'opacity-80 group-hover:opacity-100 transition-opacity'}`} title={item.displayTitle}>
                    {item.displayTitle}
                  </h3>
                  <p className="text-xs font-label text-on-surface-variant mt-1">{item.year || t('year.unknown')}</p>
                  
                  {item.totalCount > 0 && (
                    <div className="mt-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border ${
                        isMatched 
                          ? 'bg-primary/10 text-primary border-primary/20' 
                          : 'bg-error-dim/10 text-error-dim border-error-dim/20'
                      }`}>
                        {statusText}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {items.length === 0 && (
            <div className="text-center text-sm text-on-surface-variant font-label py-10 opacity-70">{emptyText}</div>
          )}
        </div>
      </aside>
    </>
  );
}

