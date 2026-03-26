import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMediaFilesQuery } from '../hooks/queries';
import { getMediaSeasonNumber, getMediaTitle } from '../lib/mediaUtils';
import { buildHomeStats, buildRecentMedia } from '../selectors/home';
import type { ScannedFile } from '../types/api';

const EMPTY_FILES: ScannedFile[] = [];

function getCoveragePercent(hasSubtitle: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((hasSubtitle / total) * 100);
}

function getCoverageWidth(hasSubtitle: number, total: number): string {
  if (total === 0) {
    return '0%';
  }

  return `${(hasSubtitle / total) * 100}%`;
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const movieFilesQuery = useMediaFilesQuery('movie');
  const tvFilesQuery = useMediaFilesQuery('tv');
  const movieFiles = movieFilesQuery.data ?? EMPTY_FILES;
  const tvFiles = tvFilesQuery.data ?? EMPTY_FILES;
  const loading = movieFilesQuery.isLoading || tvFilesQuery.isLoading;

  const stats = useMemo(() => buildHomeStats(movieFiles, tvFiles), [movieFiles, tvFiles]);
  const recentFiles = useMemo(() => buildRecentMedia(movieFiles, tvFiles), [movieFiles, tvFiles]);
  const coveragePercent = getCoveragePercent(stats.hasSubtitle, stats.totalFiles);

  const handleRecentFileClick = (file: ScannedFile): void => {
    const searchParams = new URLSearchParams();
    searchParams.set('title', file.extracted_title || '');

    if (file.type === 'tv' && file.season) {
      searchParams.set('season', file.season.toString());
    }

    navigate({
      pathname: file.type === 'movie' ? '/movies' : '/series',
      search: searchParams.toString(),
    });
  };

  return (
    <div className="flex flex-col w-full h-full max-w-[1400px] mx-auto overflow-y-auto custom-scrollbar px-8 py-10 gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface leading-none">
          {t('nav.home')}
        </h1>
      </div>

      {loading ? (
        <div className="flex gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-32 rounded-2xl bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="col-span-1 sm:col-span-1 p-6 rounded-2xl bg-surface-container border border-outline-variant/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant text-xs font-label uppercase tracking-widest">
                {t('home.totalFiles')}
              </span>
              <span className="material-symbols-outlined text-primary-dim text-lg">folder_open</span>
            </div>
            <div className="text-5xl font-headline font-extrabold text-on-surface">{stats.totalFiles}</div>
            <div className="flex gap-3 text-xs font-label">
              <span className="flex items-center gap-1 text-primary">
                <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                {stats.hasSubtitle} {t('home.matched')}
              </span>
              <span className="flex items-center gap-1 text-error-dim">
                <span className="w-2 h-2 rounded-full bg-error-dim inline-block" />
                {stats.missingSubtitle} {t('home.missing')}
              </span>
            </div>
          </div>

          <div
            className="p-6 rounded-2xl bg-surface-container border border-outline-variant/5 cursor-pointer hover:bg-surface-container-highest hover:-translate-y-1 transition-all duration-300"
            onClick={() => navigate('/movies')}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-on-surface-variant text-xs font-label uppercase tracking-widest">
                {t('movie')}
              </span>
              <span className="material-symbols-outlined text-primary-dim text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                movie
              </span>
            </div>
            <div className="text-5xl font-headline font-extrabold text-on-surface mb-4">{stats.totalMovies}</div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-label text-on-surface-variant">
                <span>{t('home.coverageRate')}</span>
                <span className="text-primary font-bold">
                  {getCoveragePercent(stats.hasSubtitleMovies, stats.totalMovies)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-1000"
                  style={{ width: getCoverageWidth(stats.hasSubtitleMovies, stats.totalMovies) }}
                />
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-2xl bg-surface-container border border-outline-variant/5 cursor-pointer hover:bg-surface-container-highest hover:-translate-y-1 transition-all duration-300"
            onClick={() => navigate('/series')}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-on-surface-variant text-xs font-label uppercase tracking-widest">{t('tv')}</span>
              <span className="material-symbols-outlined text-tertiary-dim text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                tv
              </span>
            </div>
            <div className="text-5xl font-headline font-extrabold text-on-surface mb-4">{stats.totalSeries}</div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-label text-on-surface-variant">
                <span>{t('home.coverageRate')}</span>
                <span className="text-tertiary font-bold">
                  {getCoveragePercent(stats.hasSubtitleSeries, stats.totalSeries)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-tertiary to-tertiary-container rounded-full transition-all duration-1000"
                  style={{ width: getCoverageWidth(stats.hasSubtitleSeries, stats.totalSeries) }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-surface-container border border-outline-variant/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-headline font-bold text-on-surface text-lg">{t('home.globalHealth')}</p>
            <p className="text-on-surface-variant text-xs font-label mt-0.5">{t('home.globalHealthDesc')}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-headline font-extrabold text-on-surface">{coveragePercent}%</p>
            <p className="text-xs text-on-surface-variant font-label">{t('home.subtitleCoverage')}</p>
          </div>
        </div>
        <div className="h-3 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-fixed-dim rounded-full relative transition-all duration-1000 ease-out"
            style={{ width: `${coveragePercent}%` }}
          >
            <div className="absolute inset-0 bg-white/10 animate-pulse rounded-full" />
          </div>
        </div>
        <div className="flex justify-between mt-3 text-xs font-label text-on-surface-variant">
          <span>{stats.hasSubtitle} {t('home.matched')}</span>
          <span>{stats.missingSubtitle} {t('home.missing')}</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline font-bold text-on-surface text-xl">{t('home.recentlyAdded')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentFiles.map(file => (
            <div
              key={`${file.type}-${file.id}`}
              onClick={() => handleRecentFileClick(file)}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-surface-container border border-outline-variant/5 cursor-pointer hover:bg-surface-container-highest hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0">
                <span
                  className="material-symbols-outlined text-2xl"
                  style={{
                    fontVariationSettings: "'FILL' 1",
                    color: file.type === 'movie' ? 'var(--primary-dim)' : 'var(--tertiary-dim, #be83fa)',
                  }}
                >
                  {file.type === 'movie' ? 'movie' : 'tv'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-on-surface text-sm truncate" title={file.extracted_title || ''}>
                  {getMediaTitle(file, '')}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-on-surface-variant font-label">
                    {file.type === 'movie'
                      ? file.year || '—'
                      : `S${String(getMediaSeasonNumber(file.season)).padStart(2, '0')} E${String(file.episode || 1).padStart(2, '0')}`}
                    {' • '}
                    {file.type === 'movie' ? t('home.typeMovie') : t('home.typeSeries')}
                  </span>
                  {file.has_subtitle ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20">
                      {t('home.hasSubtitle')}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-error-dim/10 text-error-dim border border-error-dim/20">
                      {t('home.noSubtitle')}
                    </span>
                  )}
                </div>
              </div>
              <span className="material-symbols-outlined text-outline/40 group-hover:text-primary group-hover:translate-x-1 transition-all">
                chevron_right
              </span>
            </div>
          ))}
          {recentFiles.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-on-surface-variant text-sm font-label opacity-70">
              {t('home.noRecentMedia')}
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-headline font-bold text-on-surface text-xl mb-5">{t('home.quickActions')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: 'search', label: t('nav.search'), path: '/search', color: 'text-primary' },
            { icon: 'movie', label: t('nav.movies'), path: '/movies', color: 'text-primary-dim' },
            { icon: 'tv', label: t('nav.series'), path: '/series', color: 'text-[#be83fa]' },
            { icon: 'task', label: t('nav.tasks'), path: '/tasks', color: 'text-on-surface-variant' },
          ].map(action => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-surface-container border border-outline-variant/5 hover:bg-surface-container-highest hover:-translate-y-1 transition-all duration-300"
            >
              <span className={`material-symbols-outlined text-3xl ${action.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {action.icon}
              </span>
              <span className="text-sm font-label font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
