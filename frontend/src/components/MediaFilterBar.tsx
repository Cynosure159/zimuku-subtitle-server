import { ArrowDown, ArrowUp, Filter, SortAsc } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

export function MediaFilterBar({
  filter,
  setFilter,
  sortBy,
  setSortBy,
  sortDesc,
  setSortDesc,
  counts
}: MediaFilterBarProps) {
  const { t } = useTranslation();

  const filterLabels: Record<FilterOption, string> = {
    all: t('filter.all'),
    has: t('filter.has'),
    missing: t('filter.missing')
  };

  const sortLabels: Record<SortOption, string> = {
    name: t('sort.name'),
    year: t('sort.year'),
    created: t('sort.created'),
    subtitle_status: t('sort.subtitleStatus')
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      {/* Filter Dropdown */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterOption)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        >
          <option value="all">{filterLabels.all} ({counts.all})</option>
          <option value="has">{filterLabels.has} ({counts.has})</option>
          <option value="missing">{filterLabels.missing} ({counts.missing})</option>
        </select>
      </div>

      {/* Sort Dropdown + Direction Toggle */}
      <div className="flex items-center gap-2">
        <SortAsc className="w-4 h-4 text-slate-500" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        >
          <option value="name">{sortLabels.name}</option>
          <option value="year">{sortLabels.year}</option>
          <option value="created">{sortLabels.created}</option>
          <option value="subtitle_status">{sortLabels.subtitle_status}</option>
        </select>
        <button
          onClick={() => setSortDesc(!sortDesc)}
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          title={sortDesc ? t('sort.ascending') : t('sort.descending')}
        >
          {sortDesc ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
