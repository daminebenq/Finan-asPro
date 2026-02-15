import React from 'react';
import { useAppContext } from '@/contexts/app-context';
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import DatabaseStudio from './DatabaseStudio';
import AuthModal from './AuthModal';
import { Loader2, LogOut, LayoutDashboard, Shield, Home, Database } from 'lucide-react';

const AppLayout: React.FC = () => {
  const { 
    user, profile, isLoading, currentPage, setCurrentPage,
    signOut, setShowAuthModal, setAuthMode
  } = useAppContext();

  const isAdmin = profile?.role === 'admin' || profile?.email?.toLowerCase() === 'damineone@gmail.com';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f1729] to-[#1a2332]">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
          </div>
          <Loader2 className="animate-spin text-emerald-400 mx-auto" size={32} />
          <p className="text-gray-400 mt-4 text-sm">Carregando FinBR...</p>
        </div>
      </div>
    );
  }

  // Top navigation for authenticated users
  const AuthNav = () => (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentPage('landing')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">Fin<span className="text-emerald-600">BR</span></span>
          </button>
          <nav className="hidden md:flex items-center gap-1">
            <button onClick={() => setCurrentPage('landing')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === 'landing' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <Home size={14} className="inline mr-1" /> Início
            </button>
            <button onClick={() => setCurrentPage('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              <LayoutDashboard size={14} className="inline mr-1" /> Dashboard
            </button>
            {isAdmin && (
              <button onClick={() => setCurrentPage('admin')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === 'admin' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}>
                <Shield size={14} className="inline mr-1" /> Admin
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setCurrentPage('db-studio')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentPage === 'db-studio' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>
                <Database size={14} className="inline mr-1" /> DB Studio
              </button>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:inline">{profile?.full_name || profile?.email}</span>
          <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>
      {/* Mobile nav */}
      <div className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
        <button onClick={() => setCurrentPage('landing')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${currentPage === 'landing' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>Início</button>
        <button onClick={() => setCurrentPage('dashboard')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${currentPage === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}>Dashboard</button>
        {isAdmin && (
          <button onClick={() => setCurrentPage('admin')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${currentPage === 'admin' ? 'bg-purple-100 text-purple-700' : 'text-gray-500'}`}>Admin</button>
        )}
        {isAdmin && (
          <button onClick={() => setCurrentPage('db-studio')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${currentPage === 'db-studio' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>DB Studio</button>
        )}
      </div>
    </div>
  );

  // Landing page header for non-authenticated users
  const LandingNav = () => (
    <div className="fixed top-0 left-0 right-0 z-40 bg-[#0f1729]/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-white">Fin<span className="text-emerald-400">BR</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-gray-300 hover:text-white transition-colors">Funcionalidades</button>
          <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-gray-300 hover:text-white transition-colors">Planos</button>
        </nav>
        <div className="flex items-center gap-3">
          <button onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors font-medium">
            Entrar
          </button>
          <button onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
            className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
            Criar Conta
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {user ? (
        <>
          {currentPage !== 'landing' && <AuthNav />}
          {currentPage === 'landing' && (
            <>
              <div className="fixed top-0 left-0 right-0 z-40 bg-[#0f1729]/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                    </div>
                    <span className="text-xl font-bold text-white">Fin<span className="text-emerald-400">BR</span></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCurrentPage('dashboard')} className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors font-medium">Dashboard</button>
                    {isAdmin && (
                      <>
                        <button onClick={() => setCurrentPage('admin')} className="px-4 py-2 text-sm text-purple-300 hover:text-white transition-colors font-medium">Admin</button>
                        <button onClick={() => setCurrentPage('db-studio')} className="px-4 py-2 text-sm text-indigo-300 hover:text-white transition-colors font-medium">DB Studio</button>
                      </>
                    )}
                    <button onClick={signOut} className="px-4 py-2 text-sm text-gray-400 hover:text-red-400 transition-colors">Sair</button>
                  </div>
                </div>
              </div>
              <LandingPage />
            </>
          )}
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'admin' && isAdmin && <AdminPanel />}
          {currentPage === 'db-studio' && isAdmin && <DatabaseStudio />}
        </>
      ) : (
        <>
          <LandingNav />
          <LandingPage />
        </>
      )}
      <AuthModal />
    </div>
  );
};

export default AppLayout;
