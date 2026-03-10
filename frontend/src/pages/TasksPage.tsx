import { useEffect, useState } from 'react';
import { RefreshCw, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { listTasks, deleteTask, retryTask, clearCompletedTasks } from '../api';

interface Task {
  id: number;
  title: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  source_url: string;
  save_path?: string;
  error_msg?: string;
  created_at: string;
  updated_at: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const data = await listTasks();
      setTasks(data.items);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除此任务吗？')) return;
    await deleteTask(id);
    fetchTasks();
  };

  const handleRetry = async (id: number) => {
    await retryTask(id);
    fetchTasks();
  };

  const handleClear = async () => {
    if (!window.confirm('确定要清理所有已完成的任务记录吗？')) return;
    await clearCompletedTasks();
    fetchTasks();
  };

  const StatusIcon = ({ status }: { status: Task['status'] }) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'downloading': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const StatusText = ({ status }: { status: Task['status'] }) => {
    switch (status) {
      case 'completed': return <span className="text-green-600">已完成</span>;
      case 'failed': return <span className="text-red-600">失败</span>;
      case 'downloading': return <span className="text-blue-600">下载中</span>;
      default: return <span className="text-slate-500">等待中</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">下载任务</h1>
        <button 
          onClick={handleClear}
          className="text-sm px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
        >
          清理已完成
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {loading && tasks.length === 0 ? (
          <div className="text-slate-500">加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="text-slate-500 py-8 text-center bg-white rounded-2xl shadow-sm">暂无任务</div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <StatusIcon status={task.status} />
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="text-base font-medium text-slate-900 truncate" title={task.title}>
                    {task.title}
                  </div>
                  <div className="text-xs text-slate-500 flex gap-4">
                    <StatusText status={task.status} />
                    <span>创建于: {new Date(task.created_at).toLocaleString()}</span>
                  </div>
                  {task.error_msg && (
                    <div className="text-xs text-red-500 truncate" title={task.error_msg}>
                      错误: {task.error_msg}
                    </div>
                  )}
                  {task.save_path && (
                    <div className="text-xs text-slate-400 truncate" title={task.save_path}>
                      保存至: {task.save_path}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {task.status === 'failed' && (
                  <button 
                    onClick={() => handleRetry(task.id)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="重试"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(task.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
