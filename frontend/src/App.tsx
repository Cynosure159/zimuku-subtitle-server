import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import SearchPage from './pages/SearchPage';
import MoviesPage from './pages/MoviesPage';
import SeriesPage from './pages/SeriesPage';
import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/SettingsPage';

function Sidebar() {
  const navItems = [
    { path: '/search', label: '字幕搜索' },
    { path: '/movies', label: '电影管理' },
    { path: '/series', label: '剧集管理' },
    { path: '/tasks', label: '下载任务' },
    { path: '/settings', label: '系统设置' },
  ];

  return (
    <div className="w-[240px] h-full bg-[#0F172A] p-8 flex flex-col gap-8 shrink-0">
      <div className="text-white font-bold text-xl tracking-wide">
        ZIMUKU SERVER
      </div>
      <nav className="flex flex-col gap-3">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-4 py-3 rounded-xl text-sm transition-colors ${
                isActive
                  ? 'bg-[#1E293B] text-white font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-[#1E293B]/50'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-full overflow-y-auto">
        <div className="p-[60px] min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/search" replace />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/series" element={<SeriesPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </Router>
    </QueryClientProvider>
  );
}

export default App;
