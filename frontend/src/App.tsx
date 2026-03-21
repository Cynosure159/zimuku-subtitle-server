import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { queryClient } from './lib/queryClient';
import './i18n';
import SearchPage from './pages/SearchPage';
import MoviesPage from './pages/MoviesPage';
import SeriesPage from './pages/SeriesPage';
import TasksPage from './pages/TasksPage';
import SettingsPage from './pages/SettingsPage';

function Sidebar() {
  const { t } = useTranslation();
  const navItems = [
    { path: '/search', label: t('nav.search'), icon: 'search' },
    { path: '/movies', label: t('nav.movies'), icon: 'movie' },
    { path: '/series', label: t('nav.series'), icon: 'tv' },
    { path: '/tasks', label: t('nav.tasks'), icon: 'task' },
    { path: '/settings', label: t('nav.settings'), icon: 'settings', mt: true },
  ];

  return (
    <nav className="fixed left-4 top-4 bottom-4 w-20 hover:w-64 transition-all duration-500 rounded-2xl z-50 overflow-hidden bg-[#060e20]/70 backdrop-blur-xl shadow-[0_0_40px_rgba(138,149,255,0.06)] flex flex-col h-full py-8 gap-2 group border border-outline-variant/10">
      {/* Logo Area */}
      <div className="flex items-center gap-4 px-6 mb-8 overflow-hidden">
        <div className="min-w-[32px] h-8 bg-gradient-to-br from-primary to-primary-container rounded-lg flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-on-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>movie</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          <p className="text-2xl font-bold tracking-tight text-[#bdc2ff] font-headline -mt-1">Zimuku</p>
          <p className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest mt-0.5">Digital Curator</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-1 flex flex-col">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 mx-2 rounded-xl transition-all ${
                item.mt ? 'mt-auto' : ''
              } ${
                isActive
                  ? 'bg-primary/10 text-primary active:scale-95 shadow-sm'
                  : 'text-slate-400 hover:bg-surface-container-high/60 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-body font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <Sidebar />
      <main className="ml-24 mr-4 my-4 h-[calc(100vh-2rem)] flex gap-4 w-full relative">
        {children}
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
