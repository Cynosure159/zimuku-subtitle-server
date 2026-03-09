import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { listSettings, updateSetting } from '../api';

interface Setting {
  id: number;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);

  // Local state for editing
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const fetchSettings = async () => {
    try {
      const data = await listSettings();
      setSettings(data);
      const values: Record<string, string> = {};
      data.forEach((s: Setting) => {
        values[s.key] = s.value;
      });
      setFormValues(values);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (key: string) => {
    try {
      const newValue = formValues[key];
      const setting = settings.find(s => s.key === key);
      await updateSetting(key, newValue, setting?.description);
      alert('保存成功');
      fetchSettings();
    } catch (err: any) {
      alert('保存失败: ' + err.message);
    }
  };

  const handleInputChange = (key: string, val: string) => {
    setFormValues(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900">系统设置</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col gap-6">
        {loading ? (
          <div className="text-slate-500">加载中...</div>
        ) : settings.length === 0 ? (
          <div className="text-slate-500 py-8 text-center">暂无配置项，请在后端初始化或插入数据</div>
        ) : (
          settings.map(setting => (
            <div key={setting.id} className="flex flex-col gap-2 border-b border-slate-100 pb-6 last:border-0 last:pb-0">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-900">{setting.key}</label>
                <div className="text-xs text-slate-400">
                  最后更新: {new Date(setting.updated_at).toLocaleString()}
                </div>
              </div>
              {setting.description && (
                <div className="text-sm text-slate-500">{setting.description}</div>
              )}
              <div className="flex items-center gap-3 mt-1">
                <input 
                  type="text" 
                  value={formValues[setting.key] || ''}
                  onChange={(e) => handleInputChange(setting.key, e.target.value)}
                  className="flex-1 outline-none text-sm text-slate-900 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:bg-white transition-colors"
                />
                <button 
                  onClick={() => handleSave(setting.key)}
                  className="bg-blue-50 text-blue-600 text-sm px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
