import React, { useEffect } from 'react';
import { useAppContext } from '@/contexts/app-context';
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import DatabaseStudio from './DatabaseStudio';
import AuthModal from './AuthModal';
import { Loader2 } from 'lucide-react';

const AppLayout: React.FC = () => {
  const { 
    user, profile, isLoading, currentPage, setCurrentPage,
    setShowAuthModal, setAuthMode
  } = useAppContext();

  const isAdmin = profile?.role === 'admin' || profile?.email?.toLowerCase() === 'damineone@gmail.com';

  useEffect(() => {
    if (!user) return;
    if (currentPage === 'landing') {
      setCurrentPage(isAdmin ? 'admin' : 'dashboard');
      return;
    }
    if (!isAdmin && (currentPage === 'admin' || currentPage === 'db-studio')) {
      setCurrentPage('dashboard');
    }
  }, [user, currentPage, isAdmin, setCurrentPage]);

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
          {(currentPage === 'dashboard' || currentPage === 'landing') && <Dashboard />}
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
