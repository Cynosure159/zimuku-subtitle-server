import { useTranslation } from 'react-i18next';

export function EmptySelectionState({ typeName }: { typeName: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
      <div className="text-slate-400">{t('empty.selectLeft', { type: typeName })}</div>
    </div>
  );
}
