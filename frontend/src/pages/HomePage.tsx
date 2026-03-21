import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const API_BASE = 'http://127.0.0.1:8000';

interface MediaFile {
  id: number;
  extracted_title: string;
  type: 'movie' | 'tv';
  has_subtitle: boolean;
  created_at: string;
  year?: string | null;
  season?: number | null;
  episode?: number | null;
}

interface Stats {
  totalFiles: number;
  hasSubtitle: number;
  missingSubtitle: number;
  totalMovies: number;
  hasSubtitleMovies: number;
  missingMovies: number;
  totalSeries: number;
  hasSubtitleSeries: number;
  missingSeries: number;
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentFiles, setRecentFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [movieFiles, tvFiles] = await Promise.all([
          axios.get<MediaFile[]>(`${API_BASE}/media/files?path_type=movie`),
          axios.get<MediaFile[]>(`${API_BASE}/media/files?path_type=tv`),
        ]);

        const movies = movieFiles.data;
        const tvShows = tvFiles.data;
        const all = [...movies, ...tvShows];

        // Compute stats
        const totalMovies = movies.length;
        const hasSubtitleMovies = movies.filter(f => f.has_subtitle).length;
        const totalTv = tvShows.length;
        const hasSubtitleTv = tvShows.filter(f => f.has_subtitle).length;

        setStats({
          totalFiles: all.length,
          hasSubtitle: hasSubtitleMovies + hasSubtitleTv,
          missingSubtitle: (totalMovies - hasSubtitleMovies) + (totalTv - hasSubtitleTv),
          totalMovies,
          hasSubtitleMovies,
          missingMovies: totalMovies - hasSubtitleMovies,
          totalSeries: totalTv,
          hasSubtitleSeries: hasSubtitleTv,
          missingSeries: totalTv - hasSubtitleTv,
        });

        // Get recently added - dedupe by title and take latest 6
        const titlesSeen = new Set<string>();
        const recent: MediaFile[] = [];
        const sorted = all.sort((a, b) => b.created_at.localeCompare(a.created_at));
        for (const f of sorted) {
          const key = `${f.type}:${f.extracted_title}`;
          if (!titlesSeen.has(key)) {
            titlesSeen.add(key);
            recent.push(f);
          }
          if (recent.length >= 6) break;
        }
        setRecentFiles(recent);
      } catch (e) {
        console.error('Failed to fetch dashboard data', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const coveragePercent = stats && stats.totalFiles > 0
    ? Math.round((stats.hasSubtitle / stats.totalFiles) * 100)
    : 0;

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto custom-scrollbar px-6 py-8 gap-10">
      {/* Header */}
      <div>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
          {t('nav.home')}
        </h1>
      </div>

      {/* Stats Bar */}
      {loading ? (
        <div className="flex gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-32 rounded-2xl bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Coverage */}
          <div className="col-span-1 sm:col-span-1 p-6 rounded-2xl bg-surface-container border border-outline-variant/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-on-surface-variant text-xs font-label uppercase tracking-widest">{t('home.totalFiles')}</span>
              <span className="material-symbols-outlined text-primary-dim text-lg">folder_open</span>
            </div>
            <div className="text-5xl font-headline font-extrabold text-on-surface">{stats.totalFiles}</div>
            <div className="flex gap-3 text-xs font-label">
              <span className="flex items-center gap-1 text-primary"><span className="w-2 h-2 rounded-full bg-primary inline-block" />{stats.hasSubtitle} {t('home.matched')}</span>
              <span className="flex items-center gap-1 text-error-dim"><span className="w-2 h-2 rounded-full bg-error-dim inline-block" />{stats.missingSubtitle} {t('home.missing')}</span>
            </div>
          </div>

          {/* Movies */}
          <div
            className="p-6 rounded-2xl bg-surface-container border border-outline-variant/5 cursor-pointer hover:bg-surface-container-highest hover:-translate-y-1 transition-all duration-300"
            onClick={() => navigate('/movies')}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-on-surface-variant text-xs font-label uppercase tracking-widest">{t('movie')}</span>
              <span className="material-symbols-outlined text-primary-dim text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>movie</span>
            </div>
            <div className="text-5xl font-headline font-extrabold text-on-surface mb-4">{stats.totalMovies}</div>
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-label text-on-surface-variant">
                <span>{t('home.coverageRate')}</span>
                <span className="text-primary font-bold">{stats.totalMovies > 0 ? Math.round(stats.hasSubtitleMovies / stats.totalMovies * 100) : 0}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-1000"
                  style={{ width: `${stats.totalMovies > 0 ? (stats.hasSubtitleMovies / stats.totalMovies * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Series */}
          <div
            className="p-6 rounded-2xl bg-surface-container border border-outline-variant/5 cursor-pointer hover:bg-surface-container-highest hover:-translate-y-1 transition-all duration-300"
            onClick={() => navigate('/series')}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-on-surface-variant text-xs font-label uppercase tracking-widest">{t('tv')}</span>
              <span className="material-symbols-outlined text-tertiary-dim text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>tv</span>
            </div>
            <div className="text-5xl font-headline font-extrabold text-on-surface mb-4">{stats.totalSeries}</div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-label text-on-surface-variant">
                <span>{t('home.coverageRate')}</span>
                <span className="text-tertiary font-bold">{stats.totalSeries > 0 ? Math.round(stats.hasSubtitleSeries / stats.totalSeries * 100) : 0}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-tertiary to-tertiary-container rounded-full transition-all duration-1000"
                  style={{ width: `${stats.totalSeries > 0 ? (stats.hasSubtitleSeries / stats.totalSeries * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Global Health / Coverage Bar */}
      {stats && (
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
      )}

      {/* Recently Added */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline font-bold text-on-surface text-xl">{t('home.recentlyAdded')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentFiles.map((file) => (
            <div
              key={`${file.type}-${file.id}`}
              onClick={() => navigate(file.type === 'movie' ? '/movies' : '/series')}
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
                <p className="font-headline font-bold text-on-surface text-sm truncate" title={file.extracted_title}>
                  {file.extracted_title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-on-surface-variant font-label">
                    {file.type === 'movie' 
                      ? (file.year || '—') 
                      : `S${String(file.season || 1).padStart(2, '0')} E${String(file.episode || 1).padStart(2, '0')}`}
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
              <span className="material-symbols-outlined text-outline/40 group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
            </div>
          ))}
          {recentFiles.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-on-surface-variant text-sm font-label opacity-70">
              {t('home.noRecentMedia')}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
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
