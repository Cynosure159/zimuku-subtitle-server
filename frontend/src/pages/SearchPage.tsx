import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { searchSubtitles, type SearchResult } from '../api';
import SearchResultRow from '../components/SearchResultRow';
import DownloadModal from '../components/DownloadModal';

export default function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState(t('searchFilter.all'));
  const filters = [
    t('searchFilter.all'),
    t('searchFilter.simplified'),
    t('searchFilter.traditional'),
    t('searchFilter.english'),
    t('searchFilter.bilingual'),
  ];

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSubtitle, setSelectedSubtitle] = useState<SearchResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam) {
      setQuery(qParam);
      const doSearch = async () => {
        setLoading(true);
        setError('');
        try {
          const data = await searchSubtitles(qParam);
          setResults(data);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message || t('page.search.searchFailed') || 'Search failed');
        } finally {
          setLoading(false);
        }
      };
      doSearch();
      setSearchParams(new URLSearchParams(), { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await searchSubtitles(query);
      setResults(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || t('page.search.searchFailed') || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (item: SearchResult) => {
    setSelectedSubtitle(item);
    setModalOpen(true);
  };

  const handleDownloadConfirm = () => {
    // The actual download is handled in DownloadModal
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedSubtitle(null);
  };

  const getFilterLabel = (filter: string) => {
    const filterMap: Record<string, string> = {
      [t('searchFilter.all')]: t('searchFilter.all'),
      [t('searchFilter.simplified')]: t('searchFilter.simplified_short', { defaultValue: '简体' }),
      [t('searchFilter.traditional')]: t('searchFilter.traditional_short', { defaultValue: '繁体' }),
      [t('searchFilter.english')]: t('searchFilter.english_short', { defaultValue: '英文' }),
      [t('searchFilter.bilingual')]: t('searchFilter.bilingual_short', { defaultValue: '双语' }),
    };
    return filterMap[filter] || filter;
  };

  const filteredResults = results.filter(item => {
    const filterLabel = getFilterLabel(activeFilter);
    if (filterLabel === t('searchFilter.all')) return true;
    if (!item.lang) return true;
    return item.lang.some(lang => lang.includes(filterLabel));
  });

  return (
    <div className="flex flex-col w-full h-full max-w-[1800px] overflow-y-auto custom-scrollbar px-4 pb-12">
      <div className="sticky top-0 z-30 pt-8 pb-6 bg-background/80 backdrop-blur-xl -mx-4 px-4">
        <div className="max-w-5xl w-full mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
              {t('page.search.title')}
            </h2>
          </div>

          <div className="relative group mx-auto max-w-3xl w-full">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-tertiary/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition duration-500" />
            <div className="relative flex items-center bg-surface-container-low border border-outline-variant/10 rounded-2xl p-2 shadow-2xl backdrop-blur-3xl focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/20 transition-all">
              <span className="material-symbols-outlined ml-4 text-on-surface-variant text-2xl">search</span>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={t('page.search.placeholder')}
                className="w-full bg-transparent border-none focus:ring-0 text-lg font-body text-on-surface placeholder:text-outline/50 px-4 py-4 outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-3 rounded-xl font-headline font-bold text-sm shadow-lg hover:shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('page.search.button')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
            {filters.map(filter => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-label font-medium text-xs transition-all ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'bg-surface-container-highest border border-outline-variant/15 text-on-surface-variant hover:text-primary hover:bg-surface-bright'
                  }`}
                >
                  {filter === t('searchFilter.all') && <span className="material-symbols-outlined text-xs">language</span>}
                  {filter === t('searchFilter.simplified') && <span className="material-symbols-outlined text-xs">translate</span>}
                  {filter === t('searchFilter.traditional') && <span className="material-symbols-outlined text-xs">history_edu</span>}
                  {filter === t('searchFilter.english') && <span className="material-symbols-outlined text-xs">abc</span>}
                  {filter === t('searchFilter.bilingual') && <span className="material-symbols-outlined text-xs">layers</span>}
                  <span>{filter}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section className="max-w-5xl mx-auto w-full mt-10">
        {(results.length > 0 || error) && (
          <div className="flex items-baseline justify-between mb-8 px-4">
            <h3 className="font-headline text-xl font-bold text-indigo-100 flex items-center gap-2">
              Results
              {results.length > 0 && (
                <span className="text-sm font-medium text-outline/60 ml-2">
                  Found {filteredResults.length} matches
                </span>
              )}
            </h3>
          </div>
        )}

        {error && (
          <div className="text-error text-center py-4 bg-error-container/20 border border-error/20 rounded-xl mb-6">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {filteredResults.map((item, index) => (
            <SearchResultRow key={index} item={item} onDownload={handleDownload} />
          ))}
          {results.length > 0 && filteredResults.length === 0 && (
            <div className="text-on-surface-variant text-sm py-12 text-center bg-surface-container rounded-2xl border border-outline-variant/10">
              {t('page.search.noResults')}
            </div>
          )}
        </div>
      </section>

      <DownloadModal isOpen={modalOpen} onClose={handleModalClose} subtitle={selectedSubtitle} onDownload={handleDownloadConfirm} />
    </div>
  );
}
