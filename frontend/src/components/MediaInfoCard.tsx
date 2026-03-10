import { Image as ImageIcon } from 'lucide-react';

interface MediaInfoCardProps {
  title: string;
  year?: string;
  path: string;
}

export function MediaInfoCard({ title, year, path }: MediaInfoCardProps) {
  // Clean path format for display
  const displayPath = path.split('\\').slice(0, -1).join('\\') || 
                      path.split('/').slice(0, -1).join('/');

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-50 rounded-xl p-5 flex flex-col gap-3 border border-slate-100">
        <div className="text-sm font-semibold text-slate-600">关联扫描目录</div>
        <div className="bg-white px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 break-all">
          {displayPath}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm flex gap-8 border border-slate-100">
        <div className="w-36 h-[216px] bg-slate-200 rounded-xl flex items-center justify-center shrink-0">
          <ImageIcon className="w-12 h-12 text-slate-400" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            <div className="text-sm text-slate-500">{year || '未知年份'}</div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            暂无简介信息。后续将通过刮削器自动补充详细信息。
          </p>
        </div>
      </div>
    </div>
  );
}
