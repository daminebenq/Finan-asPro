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
    setShowAuthModal, setAuthMode, signOut
  } = useAppContext();

  const isAdmin = profile?.email?.toLowerCase() === 'damineone@gmail.com';
  const isApproved = isAdmin || profile?.plan_status === 'active';

  useEffect(() => {
    if (!user) return;
    if (!isApproved) {
      if (currentPage !== 'pending-approval') {
        setCurrentPage('pending-approval');
      }
      return;
    }
    if (currentPage === 'landing' || currentPage === 'pending-approval') {
      setCurrentPage(isAdmin ? 'admin' : 'dashboard');
      return;
    }
    if (!isAdmin && (currentPage === 'admin' || currentPage === 'db-studio')) {
      setCurrentPage('dashboard');
    }
  }, [user, currentPage, isAdmin, isApproved, setCurrentPage]);

  const PendingApproval = () => (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1729] to-[#1a2332] flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-xl">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Aguardando aprovação</h2>
        <p className="text-gray-600 mt-3">
          Sua conta foi identificada, mas ainda precisa da aprovação manual do administrador para liberar acesso completo ao app.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Assim que aprovada, faça login novamente para continuar.
        </p>
        <button
          onClick={() => signOut()}
          className="mt-6 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          Sair
        </button>
      </div>
    </div>
  );

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
          {currentPage === 'pending-approval' && <PendingApproval />}
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
