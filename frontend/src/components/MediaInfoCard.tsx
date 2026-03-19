import { Image as ImageIcon, Star, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMediaMetadata, useMediaPosterUrl } from '../hooks/useMetadata';

interface MediaInfoCardProps {
  fileId: number;
  title: string;
  year?: string;
  path: string;
}

function SkeletonLoader() {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm flex gap-8 border border-slate-100 animate-pulse">
      <div className="w-36 h-[216px] bg-slate-200 rounded-xl shrink-0" />
      <div className="flex flex-col gap-4 flex-1">
        <div className="flex flex-col gap-2">
          <div className="h-8 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-200 rounded w-16" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-4 bg-slate-200 rounded w-full" />
          <div className="h-4 bg-slate-200 rounded w-full" />
          <div className="h-4 bg-slate-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ title, year, onRetry }: { title: string; year?: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm flex gap-8 border border-slate-100">
      <div className="w-36 h-[216px] bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
        <ImageIcon className="w-12 h-12 text-slate-300" />
      </div>
      <div className="flex flex-col gap-4 flex-1">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <div className="text-sm text-slate-500">{year || t('year.unknown')}</div>
        </div>
        <div className="text-sm text-red-500">
          {t('metadataError')}
          <button
            onClick={onRetry}
            className="ml-2 text-blue-500 hover:underline"
          >
            {t('metadataRetry')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MediaInfoCard({ fileId, title, year, path }: MediaInfoCardProps) {
  const { t } = useTranslation();
  const { data: metadata, isLoading, error, refetch } = useMediaMetadata(fileId);
  const posterUrl = useMediaPosterUrl(metadata?.poster_path ?? null);

  // Determine the show/movie root directory
  // For TV shows: /scan_root/show_title/Season_X/file.mp4 -> show /scan_root/show_title
  // For movies: /scan_root/movie_title/file.mp4 -> show /scan_root/movie_title
  const isWindows = path.includes('\\');
  const separator = isWindows ? '\\' : '/';
  const parts = path.split(separator).filter(Boolean);
  const parentFolder = parts[parts.length - 2] || '';
  // Check if parent looks like a season folder (TV show)
  const isTvShow = /Season|S\d{2}/i.test(parentFolder);
  // For TV shows use grandparent, for movies use parent
  const rootParts = isTvShow ? parts.slice(0, -2) : parts.slice(0, -1);
  const displayPath = rootParts.join(separator);

  // Use metadata from API if available, otherwise fall back to props
  const displayTitle = metadata?.nfo_data?.title || title;
  const displayYear = metadata?.nfo_data?.year || year;
  const plot = metadata?.nfo_data?.plot;
  const rating = metadata?.nfo_data?.rating;
  const genres = metadata?.nfo_data?.genres;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-slate-50 rounded-xl flex flex-col gap-3 border border-slate-100">
          <div className="text-sm font-semibold text-slate-600">{t('association')}</div>
          <div className="bg-white px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 break-all">
            {displayPath}
          </div>
        </div>
        <SkeletonLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div className="bg-slate-50 rounded-xl flex flex-col gap-3 border border-slate-100">
          <div className="text-sm font-semibold text-slate-600">{t('association')}</div>
          <div className="bg-white px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 break-all">
            {displayPath}
          </div>
        </div>
        <ErrorState title={title} year={year} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-50 rounded-xl flex flex-col gap-3 border border-slate-100">
        <div className="text-sm font-semibold text-slate-600">{t('association')}</div>
        <div className="bg-white px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 break-all">
          {displayPath}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm flex gap-8 border border-slate-100 hover:shadow-md transition-shadow duration-200">
        <div className="w-36 h-[216px] bg-slate-200 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={displayTitle}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg class="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
              }}
            />
          ) : (
            <ImageIcon className="w-12 h-12 text-slate-400" />
          )}
        </div>
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-slate-900">{displayTitle}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              {displayYear && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {displayYear}
                </span>
              )}
              {rating && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {rating}
                </span>
              )}
              {!displayYear && !rating && <span>{t('year.unknown')}</span>}
            </div>
            {genres && genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {genres.map((genre, index) => (
                  <span
                    key={index}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-md font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
          {plot ? (
            <p className="text-sm text-slate-600 leading-relaxed">{plot}</p>
          ) : (
            <p className="text-sm text-slate-500 leading-relaxed">
              {t('noPlot')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
