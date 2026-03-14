import { Search, Image as ImageIcon, Menu, X } from 'lucide-react';
import { useUIStore } from '../stores/useUIStore';

export interface SidebarItem {
  id: string;
  displayTitle: string;
  year?: string;
  totalCount: number;
  hasSubCount: number;
  poster?: string | null;  // URL for poster image
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
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-slate-200"
        aria-label={sidebarOpen ? '关闭侧边栏' : '打开侧边栏'}
      >
        {sidebarOpen ? (
          <X className="w-5 h-5 text-slate-600" />
        ) : (
          <Menu className="w-5 h-5 text-slate-600" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:relative
          z-40 lg:z-auto
          w-80 h-full lg:h-auto
          bg-white rounded-2xl p-5 flex flex-col gap-4 overflow-hidden border border-slate-100 shrink-0
          transition-transform duration-200 ease-in-out
          lg:shadow-sm
        `}
      >
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={e => onSearchTermChange(e.target.value)}
            className="bg-transparent border-none outline-none text-sm flex-1 text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 custom-scrollbar">
          {items.map(item => (
            <div
              key={item.id}
              onClick={() => onSelectTitle(item.id)}
              className={`
                flex items-center gap-3 p-3 rounded-xl cursor-pointer
                transition-all duration-200
                ${selectedTitle === item.id
                  ? 'bg-blue-50 border border-blue-100 shadow-sm'
                  : 'hover:bg-slate-50 hover:shadow-sm border border-transparent'
                }
              `}
            >
              <div className="w-12 h-16 bg-slate-300 rounded flex items-center justify-center shrink-0 overflow-hidden">
                {item.poster ? (
                  <img src={item.poster} alt={item.displayTitle} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex flex-col gap-1 overflow-hidden w-full">
                <div className="text-sm font-semibold text-slate-900 truncate" title={item.displayTitle}>{item.displayTitle}</div>
                <div className="text-xs text-slate-500">{item.year || '未知年份'}</div>
                {item.totalCount > 0 && (
                  <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded w-fit ${item.totalCount === item.hasSubCount ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {item.hasSubCount}/{item.totalCount} 有字幕
                  </div>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center text-sm text-slate-400 py-10">{emptyText}</div>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}
