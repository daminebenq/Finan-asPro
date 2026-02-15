import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { AppContext, type UserProfile, type Plan } from './app-context';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const AUTH_SESSION_MAX_MS = 2 * 60 * 60 * 1000; // 2 hours
  const AUTH_EXPIRY_KEY = 'finbr_auth_expiry';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [currentPage, setCurrentPage] = useState('landing');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalizeEmail = (email: string) => email.trim().toLowerCase();
  const OWNER_EMAIL = 'damineone@gmail.com';

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => resolve(fallback), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const safeAuthSignOut = async () => {
    try {
      await withTimeout(supabase.auth.signOut(), 4000, undefined as unknown as Awaited<ReturnType<typeof supabase.auth.signOut>>);
    } catch (err) {
      console.warn('Sign out timed out or failed:', err);
    }
  };

  const clearSessionTimer = () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
  };

  const setSessionExpiry = (expiresAt: number) => {
    localStorage.setItem(AUTH_EXPIRY_KEY, String(expiresAt));
  };

  const getSessionExpiry = (): number | null => {
    const raw = localStorage.getItem(AUTH_EXPIRY_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const clearSessionExpiry = () => {
    localStorage.removeItem(AUTH_EXPIRY_KEY);
  };

  const handleSessionExpired = useCallback(async () => {
    clearSessionTimer();
    clearSessionExpiry();

    await safeAuthSignOut();
    setUser(null);
    setProfile(null);
    setCurrentPage('landing');
    setShowAuthModal(true);
    setAuthMode('login');
    toast({ title: 'Sessão expirada', description: 'Faça login novamente para continuar.' });
  }, []);

  const scheduleSessionTimeout = useCallback((expiresAt: number) => {
    clearSessionTimer();
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      void handleSessionExpired();
      return;
    }
    sessionTimeoutRef.current = setTimeout(() => {
      void handleSessionExpired();
    }, remaining);
  }, [handleSessionExpired]);

  const applyOwnerAdminFallback = useCallback((p: UserProfile | null): UserProfile | null => {
    if (!p) return null;
    if (normalizeEmail(p.email) === OWNER_EMAIL && p.role !== 'admin') {
      return { ...p, role: 'admin' };
    }
    return p;
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data && !error) {
      const profileData = applyOwnerAdminFallback(data as UserProfile);
      setProfile(profileData);
      return profileData;
    }
    return null;
  }, [applyOwnerAdminFallback]);

  const fetchPlans = useCallback(async () => {
    const { data, error } = await supabase.from('plans').select('*').order('price_monthly', { ascending: true });
    if (data && !error) {
      const parsed = data.map((p: any) => ({
        ...p,
        price_monthly: Number(p.price_monthly) || 0,
        price_yearly: Number(p.price_yearly) || 0,
        features: typeof p.features === 'string' ? JSON.parse(p.features) : (Array.isArray(p.features) ? p.features : [])
      }));
      setPlans(parsed);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    fetchPlans().catch((err) => {
      console.error('Failed to fetch plans:', err);
    });

    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const hashParams = new URLSearchParams(hash);
    const isRecoveryLink = hashParams.get('type') === 'recovery';
    const hashAccessToken = hashParams.get('access_token');
    const hashRefreshToken = hashParams.get('refresh_token');
    
    const initAuth = async () => {
      const loadingGuard = setTimeout(() => {
        setIsLoading(false);
      }, 12000);

      try {
        if (isRecoveryLink) {
          setIsPasswordRecovery(true);
          setAuthMode('login');
          setShowAuthModal(true);

          if (hashAccessToken && hashRefreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken,
            });
            if (setSessionError) {
              console.error('Failed to apply recovery session from URL hash:', setSessionError);
            }
          }
        }

        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth session request timed out')), 8000)
          )
        ]);

        const { data: { session } } = sessionResult;
        if (session?.user) {
          const storedExpiry = getSessionExpiry();
          const expiry = isRecoveryLink
            ? Date.now() + AUTH_SESSION_MAX_MS
            : (storedExpiry ?? (Date.now() + AUTH_SESSION_MAX_MS));
          setSessionExpiry(expiry);

          if (!isRecoveryLink && expiry <= Date.now()) {
            await handleSessionExpired();
            return;
          }
          scheduleSessionTimeout(expiry);

          setUser(session.user);
          if (isRecoveryLink) {
            setIsPasswordRecovery(true);
            setAuthMode('login');
            setShowAuthModal(true);
          }
          const p = await fetchProfile(session.user.id);
          if (p) {
            setCurrentPage(p.role === 'admin' ? 'admin' : 'dashboard');
          }
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        clearTimeout(loadingGuard);
        setIsLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const expiry = Date.now() + AUTH_SESSION_MAX_MS;
          setSessionExpiry(expiry);
          scheduleSessionTimeout(expiry);

          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (p) {
            setCurrentPage(p.role === 'admin' ? 'admin' : 'dashboard');
          }
        } catch (err) {
          console.error('Failed to handle SIGNED_IN state:', err);
        }
      } else if (event === 'SIGNED_OUT') {
        clearSessionTimer();
        clearSessionExpiry();
        setUser(null);
        setProfile(null);
        setIsPasswordRecovery(false);
        setCurrentPage('landing');
      } else if (event === 'PASSWORD_RECOVERY') {
        const expiry = Date.now() + AUTH_SESSION_MAX_MS;
        setSessionExpiry(expiry);
        scheduleSessionTimeout(expiry);
        setIsPasswordRecovery(true);
        setAuthMode('login');
        setShowAuthModal(true);
      }
    });

    return () => {
      clearSessionTimer();
      subscription.unsubscribe();
    };
  }, [fetchProfile, fetchPlans, handleSessionExpired, scheduleSessionTimeout]);

  const signUp = async (email: string, password: string, fullName: string, cpf: string, phone: string, experienceLevel: string): Promise<boolean> => {
    try {
      const normalizedEmail = normalizeEmail(email);
      const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password: password.trim() });
      if (error) {
        toast({ title: 'Erro no cadastro', description: error.message, variant: 'destructive' });
        return false;
      }
      if (data.user) {
        const isAdmin = normalizedEmail === 'damineone@gmail.com';
        const { error: profileError } = await supabase.from('user_profiles').insert({
          user_id: data.user.id,
          email: normalizedEmail,
          full_name: fullName,
          cpf,
          phone,
          role: isAdmin ? 'admin' : 'user',
          experience_level: experienceLevel,
          current_plan: isAdmin ? 'expert' : 'free',
          plan_status: 'active'
        });
        if (profileError) {
          toast({ title: 'Erro ao criar perfil', description: profileError.message, variant: 'destructive' });
          return false;
        }
        toast({ title: 'Conta criada com sucesso!', description: 'Bem-vindo ao FinBR!' });
        setShowAuthModal(false);
        return true;
      }
      return false;
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const normalizedEmail = normalizeEmail(email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password.trim()
      });
      if (error) {
        const description = error.message === 'Invalid login credentials'
          ? 'Email ou senha inválidos. Verifique os dados ou use “Esqueceu sua senha?”.'
          : error.message;
        toast({ title: 'Erro no login', description, variant: 'destructive' });
        return false;
      }
      if (data.user) {
        toast({ title: 'Login realizado!', description: 'Bem-vindo de volta!' });
        setShowAuthModal(false);
        return true;
      }
      return false;
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      const normalizedEmail = normalizeEmail(email);
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: window.location.origin,
      });
      if (error) {
        toast({ title: 'Erro ao recuperar senha', description: error.message, variant: 'destructive' });
        return false;
      }
      toast({
        title: 'Email enviado',
        description: 'Se o email existir, você receberá um link para redefinir sua senha.'
      });
      return true;
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    try {
      const tryUpdate = async () => supabase.auth.updateUser({ password: newPassword.trim() });

      let result = await tryUpdate();
      if (result.error && /signal is aborted/i.test(result.error.message || '')) {
        result = await tryUpdate();
      }

      if (result.error) {
        const description = /signal is aborted/i.test(result.error.message || '')
          ? 'A sessão de recuperação expirou. Solicite um novo link para redefinir sua senha.'
          : result.error.message;
        toast({ title: 'Erro ao atualizar senha', description, variant: 'destructive' });
        return false;
      }
      toast({ title: 'Senha atualizada!', description: 'Sua senha foi alterada com sucesso.' });
      return true;
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const completePasswordRecovery = async (newPassword: string): Promise<boolean> => {
    const ok = await updatePassword(newPassword);
    if (ok) {
      setIsPasswordRecovery(false);
      setShowAuthModal(false);
      if (window.location.hash.includes('type=recovery')) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      }
    }
    return ok;
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    if (window.location.hash.includes('type=recovery')) {
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    }
  };

  const updateProfile = async (updates: Partial<Pick<UserProfile, 'full_name' | 'cpf' | 'phone' | 'experience_level'>>): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        toast({ title: 'Erro ao atualizar perfil', description: error.message, variant: 'destructive' });
        return false;
      }

      await refreshProfile();
      toast({ title: 'Perfil atualizado!', description: 'Seus dados foram salvos com sucesso.' });
      return true;
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      return false;
    }
  };

  const signOut = async () => {
    clearSessionTimer();
    clearSessionExpiry();
    await safeAuthSignOut();
    setUser(null);
    setProfile(null);
    setCurrentPage('landing');
    toast({ title: 'Logout realizado', description: 'Até logo!' });
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <AppContext.Provider value={{
      sidebarOpen, toggleSidebar,
      user, profile, plans, isLoading, isPasswordRecovery,
      currentPage, setCurrentPage,
      showAuthModal, setShowAuthModal,
      authMode, setAuthMode,
      signUp, signIn, resetPassword, completePasswordRecovery, clearPasswordRecovery,
      updateProfile, updatePassword, signOut, refreshProfile
    }}>
      {children}
    </AppContext.Provider>
  );
};
