import { ArrowDown, ArrowUp, Filter, SortAsc } from 'lucide-react';

export type FilterOption = 'all' | 'has' | 'missing';
export type SortOption = 'name' | 'year' | 'created' | 'subtitle_status';

export interface FilterCounts {
  all: number;
  has: number;
  missing: number;
}

interface MediaFilterBarProps {
  filter: FilterOption;
  setFilter: (filter: FilterOption) => void;
  sortBy: SortOption;
  setSortBy: (sortBy: SortOption) => void;
  sortDesc: boolean;
  setSortDesc: (desc: boolean) => void;
  counts: FilterCounts;
}

const FILTER_LABELS: Record<FilterOption, string> = {
  all: '全部',
  has: '有字幕',
  missing: '无字幕'
};

const SORT_LABELS: Record<SortOption, string> = {
  name: '名称',
  year: '年份',
  created: '添加时间',
  subtitle_status: '字幕状态'
};

export function MediaFilterBar({
  filter,
  setFilter,
  sortBy,
  setSortBy,
  sortDesc,
  setSortDesc,
  counts
}: MediaFilterBarProps) {
  const handleSortClick = (option: SortOption) => {
    if (sortBy === option) {
      // Toggle direction when clicking same option
      setSortDesc(!sortDesc);
    } else {
      setSortBy(option);
      setSortDesc(false); // Reset to ascending when changing sort option
    }
  };

  return (
    <div className="flex items-center gap-4 mb-4">
      {/* Filter Dropdown */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterOption)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        >
          <option value="all">{FILTER_LABELS.all} ({counts.all})</option>
          <option value="has">{FILTER_LABELS.has} ({counts.has})</option>
          <option value="missing">{FILTER_LABELS.missing} ({counts.missing})</option>
        </select>
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <SortAsc className="w-4 h-4 text-slate-500" />
        <div className="flex items-center gap-1">
          {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
            <button
              key={option}
              onClick={() => handleSortClick(option)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors flex items-center gap-1.5 ${
                sortBy === option
                  ? 'bg-blue-50 border-blue-200 text-blue-600 font-medium'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {SORT_LABELS[option]}
              {sortBy === option && (
                sortDesc ? (
                  <ArrowDown className="w-3.5 h-3.5" />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5" />
                )
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
