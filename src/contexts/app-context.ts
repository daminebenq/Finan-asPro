import { createContext, useContext } from 'react';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  cpf: string;
  phone: string;
  role: 'user' | 'admin';
  experience_level: 'beginner' | 'intermediate' | 'professional';
  current_plan: 'free' | 'essencial' | 'profissional' | 'expert';
  plan_status: 'active' | 'pending' | 'suspended' | 'cancelled';
  plan_expires_at: string | null;
  discount_percentage: number;
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_transactions: number;
  max_investments: number;
  has_export: boolean;
  has_import: boolean;
  has_education: boolean;
  has_simulator: boolean;
  has_reports: boolean;
}

export interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  user: any;
  profile: UserProfile | null;
  plans: Plan[];
  isLoading: boolean;
  isPasswordRecovery: boolean;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authMode: 'login' | 'signup';
  setAuthMode: (mode: 'login' | 'signup') => void;
  signUp: (email: string, password: string, fullName: string, cpf: string, phone: string, experienceLevel: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  completePasswordRecovery: (newPassword: string) => Promise<boolean>;
  clearPasswordRecovery: () => void;
  updateProfile: (updates: Partial<Pick<UserProfile, 'full_name' | 'cpf' | 'phone' | 'experience_level'>>) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const useAppContext = () => useContext(AppContext);
