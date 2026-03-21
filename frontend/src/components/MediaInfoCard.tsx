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
    <div className="h-[260px] relative overflow-hidden flex-shrink-0 animate-pulse bg-surface-container-low">
      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/60 to-transparent"></div>
      <div className="absolute bottom-8 left-10 right-10 flex justify-between items-end">
        <div className="flex gap-8 items-end w-full">
          <div className="mb-2 w-full">
            <div className="h-4 bg-surface-container-highest rounded w-32 mb-4" />
            <div className="h-12 bg-surface-container-highest rounded w-3/4 max-w-lg mb-6" />
            <div className="flex gap-6">
              <div className="h-6 bg-surface-container-highest rounded w-16" />
              <div className="h-6 bg-surface-container-highest rounded w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ title, year, onRetry }: { title: string; year?: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="h-[260px] relative overflow-hidden flex-shrink-0 bg-surface-container-low border-b border-outline-variant/10">
      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/60 to-transparent"></div>
      <div className="absolute bottom-8 left-10 right-10 flex justify-between items-end">
        <div className="flex gap-8 items-end">
          <div className="mb-2">
            <p className="text-sm font-label font-semibold text-error mb-1 uppercase tracking-widest">{t('metadataError')}</p>
            <h2 className="text-5xl font-extrabold font-headline text-on-surface tracking-tight leading-none">{title}</h2>
            <div className="flex items-center gap-6 mt-5">
              <span className="flex items-center gap-2 text-on-surface-variant font-medium">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                {year || t('year.unknown')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onRetry} className="bg-surface-container text-on-surface px-6 py-3 rounded-xl font-headline font-bold hover:bg-surface-container-highest transition-colors flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-xl">refresh</span>
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

  const isWindows = path.includes('\\');
  const separator = isWindows ? '\\' : '/';
  const parts = path.split(separator).filter(Boolean);
  const parentFolder = parts[parts.length - 2] || '';
  const isTvShow = /Season|S\d{2}/i.test(parentFolder);

  const displayTitle = metadata?.nfo_data?.title || title;
  const displayYear = metadata?.nfo_data?.year || year;
  const rating = metadata?.nfo_data?.rating;

  if (isLoading) return <SkeletonLoader />;
  if (error) return <ErrorState title={title} year={year} onRetry={() => refetch()} />;

  return (
    <div className="h-[260px] relative overflow-hidden flex-shrink-0 border-b border-outline-variant/10">
      {posterUrl ? (
        <img alt={displayTitle} className="w-full h-full object-cover opacity-30 blur-sm scale-105" src={posterUrl} />
      ) : (
        <div className="absolute w-full h-full bg-surface-container-lowest"></div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/60 to-transparent"></div>
      <div className="absolute bottom-8 left-10 right-10 flex justify-between items-end">
        <div className="flex gap-8 items-end">
          <div className="mb-2">
            <p className="text-sm font-label font-semibold text-primary mb-1 uppercase tracking-widest">
              {isTvShow ? 'Selected Series' : 'Selected Movie'}
            </p>
            <h2 className="text-5xl font-extrabold font-headline text-on-surface tracking-tight leading-none truncate max-w-3xl hover:text-wrap">{displayTitle}</h2>
            <div className="flex items-center gap-6 mt-5 text-on-surface-variant font-medium">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">calendar_today</span>
                {displayYear || t('year.unknown')}
              </span>
              {rating && (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  {rating}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
