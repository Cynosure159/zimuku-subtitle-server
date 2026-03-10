import { Search, Image as ImageIcon } from 'lucide-react';

export interface SidebarItem {
  title: string;
  year?: string;
  totalCount: number;
  hasSubCount: number;
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
  return (
    <div className="w-80 bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-4 overflow-hidden border border-slate-100 shrink-0">
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
            key={item.title}
            onClick={() => onSelectTitle(item.title)}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedTitle === item.title ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'}`}
          >
            <div className="w-12 h-16 bg-slate-300 rounded flex items-center justify-center shrink-0">
              <ImageIcon className="w-6 h-6 text-slate-400" />
            </div>
            <div className="flex flex-col gap-1 overflow-hidden w-full">
              <div className="text-sm font-semibold text-slate-900 truncate" title={item.title}>{item.title}</div>
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
  );
}
