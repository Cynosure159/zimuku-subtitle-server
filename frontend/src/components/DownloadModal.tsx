import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import Modal from './Modal';
import PathSelector from './PathSelector';
import { createDownloadTask, type SearchResult } from '../api';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitle: SearchResult | null;
  onDownload?: () => void;
}

export default function DownloadModal({ isOpen, onClose, subtitle, onDownload }: DownloadModalProps) {
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [targetPath, setTargetPath] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Reset selections when modal opens with new subtitle
  useState(() => {
    if (subtitle) {
      setSelectedLangs(subtitle.langs || []);
      setSelectedFormat(subtitle.format || '');
    }
  });

  const handleDownload = async () => {
    if (!subtitle || !targetPath) return;

    setLoading(true);
    try {
      await createDownloadTask(subtitle.title, subtitle.detail_url);
      onDownload?.();
      onClose();
      alert('已添加到下载任务');
    } catch (err) {
      console.error('Download failed:', err);
      alert('添加下载任务失败');
    } finally {
      setLoading(false);
    }
  };

  if (!subtitle) return null;

  const availableLangs = subtitle.langs || ['简体', '繁体', '英文', '双语'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="下载字幕">
      <div className="flex flex-col gap-6">
        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="font-medium text-slate-900">{subtitle.title}</h3>
          {subtitle.format && (
            <p className="text-sm text-slate-500 mt-1">格式: {subtitle.format}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">选择语言</label>
          <div className="flex flex-wrap gap-2">
            {availableLangs.map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setSelectedLangs((prev) =>
                    prev.includes(lang)
                      ? prev.filter((l) => l !== lang)
                      : [...prev, lang]
                  );
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedLangs.includes(lang)
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {subtitle.format && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">格式</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFormat(subtitle.format || '')}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedFormat === subtitle.format
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {subtitle.format}
              </button>
            </div>
          </div>
        )}

        <PathSelector onSelect={setTargetPath} />

        <button
          onClick={handleDownload}
          disabled={!targetPath || loading || selectedLangs.length === 0}
          className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              添加中...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              开始下载
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}
