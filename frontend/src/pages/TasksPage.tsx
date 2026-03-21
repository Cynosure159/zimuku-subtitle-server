import { useEffect, useState } from 'react';
import { RefreshCw, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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

function TaskSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm animate-pulse">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-5 h-5 bg-slate-200 rounded-full" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/4" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-slate-200 rounded-lg" />
        <div className="w-8 h-8 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { t } = useTranslation();
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
    if (!window.confirm(t('confirm.deleteTask'))) return;
    await deleteTask(id);
    fetchTasks();
  };

  const handleRetry = async (id: number) => {
    await retryTask(id);
    fetchTasks();
  };

  const handleClear = async () => {
    if (!window.confirm(t('confirm.clearCompleted'))) return;
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
      case 'completed': return <span className="text-green-600">{t('page.tasks.status.completed')}</span>;
      case 'failed': return <span className="text-red-600">{t('page.tasks.status.failed')}</span>;
      case 'downloading': return <span className="text-blue-600">{t('page.tasks.status.downloading')}</span>;
      default: return <span className="text-slate-500">{t('page.tasks.status.pending')}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full max-w-[1800px]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">{t('page.tasks.title')}</h1>
        <button
          onClick={handleClear}
          className="text-sm px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors duration-150 hover:shadow-sm"
        >
          {t('page.tasks.clearCompleted')}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {loading && tasks.length === 0 ? (
          <div className="flex flex-col gap-4">
            <TaskSkeleton />
            <TaskSkeleton />
            <TaskSkeleton />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-slate-500 py-8 text-center bg-white rounded-2xl shadow-sm">{t('page.tasks.noTasks')}</div>
        ) : (
          tasks.map(task => (
            <div
              key={task.id}
              className="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200 border border-slate-100"
            >
              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <StatusIcon status={task.status} />
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="text-base font-medium text-slate-900 truncate" title={task.title}>
                    {task.title}
                  </div>
                  <div className="text-xs text-slate-500 flex gap-4">
                    <StatusText status={task.status} />
                    <span>{t('page.tasks.createdAt')}: {new Date(task.created_at).toLocaleString()}</span>
                  </div>
                  {task.error_msg && (
                    <div className="text-xs text-red-500 truncate" title={task.error_msg}>
                      {t('page.tasks.error')}: {task.error_msg}
                    </div>
                  )}
                  {task.save_path && (
                    <div className="text-xs text-slate-400 truncate" title={task.save_path}>
                      {t('page.tasks.saveTo')}: {task.save_path}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {task.status === 'failed' && (
                  <button
                    onClick={() => handleRetry(task.id)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors duration-150 hover:shadow-sm"
                    title={t('page.tasks.retry')}
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-150 hover:shadow-sm"
                  title={t('page.tasks.delete')}
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
