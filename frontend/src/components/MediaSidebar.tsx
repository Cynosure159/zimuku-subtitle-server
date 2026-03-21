import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/useUIStore';

export interface SidebarItem {
  id: string;
  displayTitle: string;
  year?: string;
  totalCount: number;
  hasSubCount: number;
  poster?: string | null;
}

interface MediaSidebarProps {
  items: SidebarItem[];
  searchTerm: string;
  onSearchTermChange: (val: string) => void;
  selectedTitle: string | null;
  onSelectTitle: (title: string) => void;
  searchPlaceholder: string;
  emptyText: string;
}

export function MediaSidebar({
  items,
  searchTerm,
  onSearchTermChange,
  selectedTitle,
  onSelectTitle,
  searchPlaceholder,
  emptyText,
}: MediaSidebarProps) {
  const { t } = useTranslation();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const getSubtitleStatusText = (item: SidebarItem) => {
    if (item.totalCount === 0) return '';
    if (item.hasSubCount === item.totalCount) return 'Matched';
    if (item.hasSubCount === 0) return 'Missing';
    return `${item.hasSubCount}/${item.totalCount} Matched`;
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-surface-container rounded-lg shadow-md border border-outline-variant/10 text-on-surface"
      >
        <span className="material-symbols-outlined">{sidebarOpen ? 'close' : 'menu'}</span>
      </button>

      {/* Sidebar / Left Column */}
      <div
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
            <h1 className="text-2xl font-bold font-headline text-on-surface">Library</h1>
            <button className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface-variant hover:text-primary transition-all">
              <span className="material-symbols-outlined text-xl">refresh</span>
            </button>
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
                    <img src={item.poster} alt={item.displayTitle} className={`w-full h-full object-cover ${isSelected ? '' : 'grayscale group-hover:grayscale-0 transition-all'}`} />
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
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}
