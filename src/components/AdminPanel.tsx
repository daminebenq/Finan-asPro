import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppContext, UserProfile } from '@/contexts/app-context';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import DatabaseStudio from './DatabaseStudio';
import ExternalPortalAdmin from './ExternalPortalAdmin';
import SetupAssistant from './SetupAssistant';
import {
  Users, CreditCard, Tag, Megaphone, Search, Check, X, ChevronDown,
  Shield, Eye, Edit2, Loader2, Plus, ToggleLeft, ToggleRight, Clock,
  BarChart3, TrendingUp, UserPlus, AlertCircle, Database, Layers, Link, Wrench
} from 'lucide-react';

interface PlanRequest {
  id: string; user_id: string; user_email: string; user_name: string;
  requested_plan: string; current_plan: string; billing_cycle: string;
  discount_code: string; discount_amount: number; final_price: number;
  status: string; admin_notes: string; created_at: string;
}

interface DiscountCode {
  id: string; code: string; description: string; discount_type: string;
  discount_value: number; applicable_plans: string[]; max_uses: number;
  current_uses: number; valid_until: string; is_active: boolean; created_at: string;
}

interface Promotion {
  id: string; title: string; description: string; discount_type: string;
  discount_value: number; applicable_plans: string[]; start_date: string;
  end_date: string; is_active: boolean; created_at: string;
}

interface AdminPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number | string;
  price_yearly: number | string;
  features: string[] | string;
  max_transactions: number;
  max_investments: number;
  has_export: boolean;
  has_import: boolean;
  has_education: boolean;
  has_simulator: boolean;
  has_reports: boolean;
}

const ADMIN_FUNCTION_DOWN_UNTIL_KEY = 'finbr_admin_setup_down_until';
const ADMIN_FUNCTION_DOWN_TTL_MS = 15 * 60 * 1000;

const isAdminFunctionMarkedDown = () => {
  if (typeof window === 'undefined') return false;
  const until = Number(window.localStorage.getItem(ADMIN_FUNCTION_DOWN_UNTIL_KEY) || 0);
  return Number.isFinite(until) && until > Date.now();
};

const markAdminFunctionDown = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ADMIN_FUNCTION_DOWN_UNTIL_KEY, String(Date.now() + ADMIN_FUNCTION_DOWN_TTL_MS));
};

const clearAdminFunctionDown = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_FUNCTION_DOWN_UNTIL_KEY);
};

const AdminPanel: React.FC = () => {
  const { profile, user } = useAppContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [adminPlans, setAdminPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [showCreateCode, setShowCreateCode] = useState(false);
  const [showCreatePromo, setShowCreatePromo] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState<AdminPlan | null>(null);
  const [showEditUser, setShowEditUser] = useState<UserProfile | null>(null);
  const [showProvisionUser, setShowProvisionUser] = useState(false);
  const [provisionMode, setProvisionMode] = useState<'create' | 'invite'>('create');
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editDiscount, setEditDiscount] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');
  const [editExperience, setEditExperience] = useState<'beginner' | 'intermediate' | 'professional'>('beginner');
  const [adminNotes, setAdminNotes] = useState('');
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected'>('connected');
  const [backendMessage, setBackendMessage] = useState('');
  const adminFunctionUnavailableRef = useRef(isAdminFunctionMarkedDown());

  // Discount code form
  const [codeForm, setCodeForm] = useState({ code: '', description: '', discountType: 'percentage', discountValue: '', maxUses: '', validUntil: '' });
  // Promotion form
  const [promoForm, setPromoForm] = useState({ title: '', description: '', discountType: 'percentage', discountValue: '', startDate: '', endDate: '' });
  const [provisionForm, setProvisionForm] = useState({
    fullName: '',
    email: '',
    password: '',
    cpf: '',
    phone: '',
    role: 'user' as 'user' | 'admin',
    experienceLevel: 'beginner' as 'beginner' | 'intermediate' | 'professional',
    currentPlan: 'free' as 'free' | 'essencial' | 'profissional' | 'expert',
    planStatus: 'active' as 'active' | 'pending' | 'suspended' | 'cancelled',
    discount: '0',
    redirectTo: '',
  });
  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    price_monthly: '',
    price_yearly: '',
    features: '',
    max_transactions: '-1',
    max_investments: '-1',
    has_export: true,
    has_import: true,
    has_education: true,
    has_simulator: false,
    has_reports: true,
  });

  const invokeAdmin = useCallback(async <T,>(body: Record<string, any>, fallback?: () => Promise<T>): Promise<T> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuração Supabase ausente no frontend.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Sessão inválida para ações administrativas. Faça login novamente.');
    }

    if (fallback && adminFunctionUnavailableRef.current) {
      const result = await fallback();
      setBackendStatus('connected');
      setBackendMessage('');
      return result;
    }

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || payload?.message || `Falha backend (${response.status})`);
      }

      adminFunctionUnavailableRef.current = false;
      clearAdminFunctionDown();
      setBackendStatus('connected');
      setBackendMessage('');
      return payload as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha de integração com backend admin.';
      const isRuntimeHeaderFailure = /req\.headers\.get is not a function/i.test(message);
      const isServerFailure = /internal server error|falha backend\s*\(5\d\d\)/i.test(message);
      if (isRuntimeHeaderFailure || isServerFailure) {
        adminFunctionUnavailableRef.current = true;
        markAdminFunctionDown();
      }

      if (fallback && (isRuntimeHeaderFailure || isServerFailure || /backend admin indisponível|falha backend|internal server error/i.test(message))) {
        try {
          const result = await fallback();
          setBackendStatus('connected');
          setBackendMessage('');
          return result;
        } catch (fallbackError) {
          const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Falha no fallback administrativo.';
          setBackendStatus('disconnected');
          setBackendMessage(`Função admin indisponível no runtime. ${fallbackMessage}`);
          throw fallbackError;
        }
      }

      throw error;
    }
  }, []);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const usersData = await invokeAdmin<{ users: UserProfile[] }>(
        { action: 'get-all-users' },
        async () => {
          const { data, error } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          return { users: (data || []) as UserProfile[] };
        }
      );

      const requestsData = await invokeAdmin<{ requests: PlanRequest[] }>(
        { action: 'get-pending-requests' },
        async () => {
          const { data, error } = await supabase.from('plan_requests').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          return { requests: (data || []) as PlanRequest[] };
        }
      );

      const codesData = await invokeAdmin<{ codes: DiscountCode[] }>(
        { action: 'get-discount-codes' },
        async () => {
          const { data, error } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          return { codes: (data || []) as DiscountCode[] };
        }
      );

      const promosData = await invokeAdmin<{ promotions: Promotion[] }>(
        { action: 'get-promotions-admin' },
        async () => {
          const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          return { promotions: (data || []) as Promotion[] };
        }
      );
      const { data: plansData } = await supabase.from('plans').select('*').order('price_monthly', { ascending: true });
      if (usersData?.users) setUsers(usersData.users);
      if (requestsData?.requests) setRequests(requestsData.requests);
      if (codesData?.codes) setDiscountCodes(codesData.codes);
      if (promosData?.promotions) setPromotions(promosData.promotions);
      if (plansData) setAdminPlans(plansData as AdminPlan[]);
    } catch (err) {
      console.error(err);
      setBackendStatus('disconnected');
      setBackendMessage(err instanceof Error ? err.message : 'Falha de integração com backend admin.');
      toast({ title: 'Backend admin indisponível', description: err instanceof Error ? err.message : 'Falha de integração.', variant: 'destructive' });
    }
    setLoading(false);
  }, [invokeAdmin]);

  useEffect(() => { fetchAdminData(); }, [fetchAdminData]);

  const handleApproveRequest = async (requestId: string, approved: boolean) => {
    await invokeAdmin(
      { action: 'approve-plan', requestId, approved, adminNotes },
      async () => {
        const { data: requestRow, error: reqErr } = await supabase
          .from('plan_requests')
          .select('*')
          .eq('id', requestId)
          .maybeSingle();
        if (reqErr || !requestRow) throw (reqErr || new Error('Plan request not found.'));

        const status = approved ? 'approved' : 'rejected';
        const { error: updateReqErr } = await supabase
          .from('plan_requests')
          .update({ status, admin_notes: adminNotes || null })
          .eq('id', requestId);
        if (updateReqErr) throw updateReqErr;

        if (approved) {
          const { error: updateProfileErr } = await supabase
            .from('user_profiles')
            .update({
              current_plan: requestRow.requested_plan,
              plan_status: 'active',
            })
            .eq('user_id', requestRow.user_id);
          if (updateProfileErr) throw updateProfileErr;
        }

        return { success: true } as any;
      }
    );
    toast({ title: approved ? 'Plano aprovado!' : 'Solicitação rejeitada' });
    setAdminNotes('');
    fetchAdminData();
  };

  const handleUpdateUser = async () => {
    if (!showEditUser) return;
    await invokeAdmin(
      {
        action: 'update-user-plan',
        userId: showEditUser.user_id,
        plan: editPlan || undefined,
        planStatus: editStatus || undefined,
        discount: editDiscount ? parseFloat(editDiscount) : undefined,
        role: editRole,
        experienceLevel: editExperience,
      },
      async () => {
        const patch: Record<string, any> = {};
        if (editPlan) patch.current_plan = editPlan;
        if (editStatus) patch.plan_status = editStatus;
        if (editDiscount) patch.discount_percentage = parseFloat(editDiscount);
        patch.role = editRole;
        patch.experience_level = editExperience;

        const { error } = await supabase.from('user_profiles').update(patch).eq('user_id', showEditUser.user_id);
        if (error) throw error;
        return { success: true } as any;
      }
    );
    toast({ title: 'Usuário atualizado!' });
    setShowEditUser(null);
    fetchAdminData();
  };

  const openProvisionModal = (mode: 'create' | 'invite') => {
    setProvisionMode(mode);
    setProvisionForm({
      fullName: '',
      email: '',
      password: '',
      cpf: '',
      phone: '',
      role: 'user',
      experienceLevel: 'beginner',
      currentPlan: 'free',
      planStatus: mode === 'invite' ? 'pending' : 'active',
      discount: '0',
      redirectTo: '',
    });
    setShowProvisionUser(true);
  };

  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!provisionForm.email) {
      toast({ title: 'E-mail obrigatório', variant: 'destructive' });
      return;
    }

    if (provisionMode === 'create' && provisionForm.password.length < 6) {
      toast({ title: 'Senha inválida', description: 'Informe ao menos 6 caracteres.', variant: 'destructive' });
      return;
    }

    const action = provisionMode === 'create' ? 'create-user-manual' : 'invite-user';
    const payload = {
      action,
      fullName: provisionForm.fullName,
      email: provisionForm.email,
      password: provisionMode === 'create' ? provisionForm.password : undefined,
      cpf: provisionForm.cpf,
      phone: provisionForm.phone,
      role: provisionForm.role,
      experienceLevel: provisionForm.experienceLevel,
      currentPlan: provisionForm.currentPlan,
      planStatus: provisionForm.planStatus,
      discount: Number(provisionForm.discount || 0),
      redirectTo: provisionForm.redirectTo || undefined,
    };

    const result = await invokeAdmin<{ success: boolean; error?: string }>(
      payload,
      async () => {
        throw new Error('Criação/convite de usuário exige function admin-setup em runtime válido.');
      }
    );

    if (!result?.success) {
      toast({ title: 'Falha ao provisionar usuário', description: result?.error || 'Tente novamente.', variant: 'destructive' });
      return;
    }

    toast({
      title: provisionMode === 'create' ? 'Usuário criado com sucesso' : 'Convite enviado com sucesso',
    });
    setShowProvisionUser(false);
    fetchAdminData();
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await invokeAdmin<{ success: boolean; error?: string }>(
      {
        action: 'create-discount-code',
        code: codeForm.code,
        description: codeForm.description,
        discountType: codeForm.discountType,
        discountValue: parseFloat(codeForm.discountValue),
        maxUses: codeForm.maxUses ? parseInt(codeForm.maxUses) : -1,
        validUntil: codeForm.validUntil || null
      },
      async () => {
        const payload = {
          code: codeForm.code,
          description: codeForm.description,
          discount_type: codeForm.discountType,
          discount_value: parseFloat(codeForm.discountValue),
          max_uses: codeForm.maxUses ? parseInt(codeForm.maxUses) : -1,
          valid_until: codeForm.validUntil || null,
          is_active: true,
          current_uses: 0,
        };
        const { error } = await supabase.from('discount_codes').insert(payload);
        if (error) throw error;
        return { success: true };
      }
    );
    if (data?.success) {
      toast({ title: 'Código criado!' });
      setShowCreateCode(false);
      setCodeForm({ code: '', description: '', discountType: 'percentage', discountValue: '', maxUses: '', validUntil: '' });
      fetchAdminData();
    } else {
      toast({ title: 'Erro', description: data?.error, variant: 'destructive' });
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await invokeAdmin<{ success: boolean; error?: string }>(
      {
        action: 'create-promotion',
        title: promoForm.title,
        description: promoForm.description,
        discountType: promoForm.discountType,
        discountValue: parseFloat(promoForm.discountValue),
        startDate: promoForm.startDate || null,
        endDate: promoForm.endDate || null
      },
      async () => {
        const payload = {
          title: promoForm.title,
          description: promoForm.description,
          discount_type: promoForm.discountType,
          discount_value: parseFloat(promoForm.discountValue),
          start_date: promoForm.startDate || null,
          end_date: promoForm.endDate || null,
          is_active: true,
          applicable_plans: [],
        };
        const { error } = await supabase.from('promotions').insert(payload);
        if (error) throw error;
        return { success: true };
      }
    );
    if (data?.success) {
      toast({ title: 'Promoção criada!' });
      setShowCreatePromo(false);
      setPromoForm({ title: '', description: '', discountType: 'percentage', discountValue: '', startDate: '', endDate: '' });
      fetchAdminData();
    }
  };

  const toggleCode = async (codeId: string, isActive: boolean) => {
    await invokeAdmin(
      { action: 'toggle-discount-code', codeId, isActive },
      async () => {
        const { error } = await supabase
          .from('discount_codes')
          .update({ is_active: isActive })
          .eq('id', codeId);
        if (error) throw error;
        return { success: true } as any;
      }
    );
    fetchAdminData();
  };

  const togglePromo = async (promoId: string, isActive: boolean) => {
    await invokeAdmin(
      { action: 'toggle-promotion', promotionId: promoId, isActive },
      async () => {
        const { error } = await supabase
          .from('promotions')
          .update({ is_active: isActive })
          .eq('id', promoId);
        if (error) throw error;
        return { success: true } as any;
      }
    );
    fetchAdminData();
  };

  const resetPlanForm = () => {
    setPlanForm({
      name: '',
      slug: '',
      price_monthly: '',
      price_yearly: '',
      features: '',
      max_transactions: '-1',
      max_investments: '-1',
      has_export: true,
      has_import: true,
      has_education: true,
      has_simulator: false,
      has_reports: true,
    });
  };

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: planForm.name,
      slug: planForm.slug,
      price_monthly: parseFloat(planForm.price_monthly || '0'),
      price_yearly: parseFloat(planForm.price_yearly || '0'),
      features: planForm.features.split('\n').map(f => f.trim()).filter(Boolean),
      max_transactions: parseInt(planForm.max_transactions || '-1'),
      max_investments: parseInt(planForm.max_investments || '-1'),
      has_export: planForm.has_export,
      has_import: planForm.has_import,
      has_education: planForm.has_education,
      has_simulator: planForm.has_simulator,
      has_reports: planForm.has_reports,
    };

    const { error } = await supabase.from('plans').insert(payload);
    if (error) {
      toast({ title: 'Erro ao criar plano', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Plano criado com sucesso!' });
    setShowCreatePlan(false);
    resetPlanForm();
    fetchAdminData();
  };

  const prepareEditPlan = (plan: AdminPlan) => {
    setShowEditPlan(plan);
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      price_monthly: String(plan.price_monthly),
      price_yearly: String(plan.price_yearly),
      features: (Array.isArray(plan.features) ? plan.features : []).join('\n'),
      max_transactions: String(plan.max_transactions ?? -1),
      max_investments: String(plan.max_investments ?? -1),
      has_export: !!plan.has_export,
      has_import: !!plan.has_import,
      has_education: !!plan.has_education,
      has_simulator: !!plan.has_simulator,
      has_reports: !!plan.has_reports,
    });
  };

  const updatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditPlan) return;

    const payload = {
      name: planForm.name,
      slug: planForm.slug,
      price_monthly: parseFloat(planForm.price_monthly || '0'),
      price_yearly: parseFloat(planForm.price_yearly || '0'),
      features: planForm.features.split('\n').map(f => f.trim()).filter(Boolean),
      max_transactions: parseInt(planForm.max_transactions || '-1'),
      max_investments: parseInt(planForm.max_investments || '-1'),
      has_export: planForm.has_export,
      has_import: planForm.has_import,
      has_education: planForm.has_education,
      has_simulator: planForm.has_simulator,
      has_reports: planForm.has_reports,
    };

    const { error } = await supabase.from('plans').update(payload).eq('id', showEditPlan.id);
    if (error) {
      toast({ title: 'Erro ao atualizar plano', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Plano atualizado com sucesso!' });
    setShowEditPlan(null);
    resetPlanForm();
    fetchAdminData();
  };

  const deletePlan = async (planId: string) => {
    const { error } = await supabase.from('plans').delete().eq('id', planId);
    if (error) {
      toast({ title: 'Erro ao remover plano', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Plano removido' });
    fetchAdminData();
  };

  const filteredUsers = users.filter(u => {
    if (searchTerm && !u.email.toLowerCase().includes(searchTerm.toLowerCase()) && !u.full_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterPlan && u.current_plan !== filterPlan) return false;
    return true;
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'plans', label: 'Planos', icon: Layers },
    { id: 'requests', label: `Solicitações${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`, icon: CreditCard },
    { id: 'discounts', label: 'Descontos', icon: Tag },
    { id: 'promotions', label: 'Promoções', icon: Megaphone },
    { id: 'portal18080', label: 'Portal 18080', icon: Link },
    { id: 'setup', label: 'Setup', icon: Wrench },
    { id: 'db', label: 'Banco de Dados', icon: Database },
  ];

  const planLabel: Record<string, string> = { free: 'Gratuito', essencial: 'Essencial', profissional: 'Profissional', expert: 'Expert' };
  const statusLabel: Record<string, string> = { active: 'Ativo', pending: 'Pendente', suspended: 'Suspenso', cancelled: 'Cancelado' };
  const statusColor: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', suspended: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-600', approved: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Fin<span className="text-emerald-600">BR</span> <span className="text-purple-600 text-sm font-normal">Admin</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Administrador</span>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">A</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {backendStatus === 'disconnected' && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-700">Integração backend admin indisponível</p>
            <p className="text-xs text-red-600 mt-1">{backendMessage || 'Verifique deploy da função admin-setup e sessão do usuário admin.'}</p>
          </div>
        )}

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Usuários', value: users.length, icon: Users, color: 'blue' },
                { label: 'Solicitações Pendentes', value: pendingRequests.length, icon: Clock, color: 'amber' },
                { label: 'Códigos Ativos', value: discountCodes.filter(c => c.is_active).length, icon: Tag, color: 'emerald' },
                { label: 'Promoções Ativas', value: promotions.filter(p => p.is_active).length, icon: Megaphone, color: 'purple' },
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">{card.label}</span>
                    <card.icon size={18} className="text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Distribuição por Plano</h3>
                {['free', 'essencial', 'profissional', 'expert'].map(plan => {
                  const count = users.filter(u => u.current_plan === plan).length;
                  const pct = users.length > 0 ? (count / users.length * 100) : 0;
                  return (
                    <div key={plan} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{planLabel[plan]}</span>
                        <span className="font-medium">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${plan === 'expert' ? 'bg-purple-500' : plan === 'profissional' ? 'bg-emerald-500' : plan === 'essencial' ? 'bg-blue-500' : 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Solicitações Recentes</h3>
                {requests.slice(0, 5).map(req => (
                  <div key={req.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{req.user_name || req.user_email}</p>
                      <p className="text-xs text-gray-500">{planLabel[req.requested_plan]} · {formatBRL(req.final_price)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColor[req.status] || 'bg-gray-100 text-gray-600'}`}>
                      {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                    </span>
                  </div>
                ))}
                {requests.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Nenhuma solicitação.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-start justify-between">
              <div className="flex flex-wrap gap-3 flex-1 min-w-[300px]">
                <div className="flex-1 min-w-[200px] relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por nome ou email..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="">Todos os planos</option>
                  {Object.entries(planLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openProvisionModal('create')} className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 flex items-center gap-2">
                  <UserPlus size={16} /> Adicionar usuário
                </button>
                <button onClick={() => openProvisionModal('invite')} className="px-4 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 flex items-center gap-2">
                  <UserPlus size={16} /> Convidar usuário
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Usuário</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Plano</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nível</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Desconto</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Desde</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${u.role === 'admin' ? 'bg-gradient-to-br from-purple-400 to-indigo-500' : 'bg-gradient-to-br from-emerald-400 to-teal-500'}`}>
                            {u.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{u.full_name || 'Sem nome'}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${u.current_plan === 'expert' ? 'bg-purple-100 text-purple-700' : u.current_plan === 'profissional' ? 'bg-emerald-100 text-emerald-700' : u.current_plan === 'essencial' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{planLabel[u.current_plan]}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColor[u.plan_status]}`}>{statusLabel[u.plan_status]}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{u.experience_level === 'beginner' ? 'Iniciante' : u.experience_level === 'intermediate' ? 'Intermediário' : 'Profissional'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.discount_percentage > 0 ? `${u.discount_percentage}%` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => {
                          setShowEditUser(u);
                          setEditPlan(u.current_plan);
                          setEditStatus(u.plan_status);
                          setEditDiscount(String(u.discount_percentage || 0));
                          setEditRole(u.role);
                          setEditExperience(u.experience_level);
                        }}
                          className="text-gray-400 hover:text-purple-500 transition-colors"><Edit2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Nenhum usuário encontrado.</p>}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Gerenciamento de Planos</h3>
              <button onClick={() => { resetPlanForm(); setShowCreatePlan(true); }} className="px-4 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 flex items-center gap-2">
                <Plus size={16} /> Novo Plano
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminPlans.map(plan => (
                <div key={plan.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                      <p className="text-xs text-gray-500">Slug: {plan.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => prepareEditPlan(plan)} className="text-gray-400 hover:text-purple-600"><Edit2 size={14} /></button>
                      <button onClick={() => deletePlan(plan.id)} className="text-gray-400 hover:text-red-600"><X size={14} /></button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Mensal: <strong>{formatBRL(Number(plan.price_monthly))}</strong></p>
                  <p className="text-sm text-gray-600">Anual: <strong>{formatBRL(Number(plan.price_yearly))}</strong></p>
                  <p className="text-xs text-gray-500 mt-2">Features: {(Array.isArray(plan.features) ? plan.features : []).length}</p>
                </div>
              ))}
            </div>
            {adminPlans.length === 0 && <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><p className="text-gray-400">Nenhum plano encontrado.</p></div>}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className={`bg-white rounded-xl border p-5 ${req.status === 'pending' ? 'border-amber-200' : 'border-gray-100'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{req.user_name || req.user_email}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor[req.status]}`}>
                        {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{req.user_email}</p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      <span>De: <strong>{planLabel[req.current_plan]}</strong></span>
                      <span>Para: <strong>{planLabel[req.requested_plan]}</strong></span>
                      <span>Ciclo: <strong>{req.billing_cycle === 'monthly' ? 'Mensal' : 'Anual'}</strong></span>
                      <span>Valor: <strong>{formatBRL(req.final_price)}</strong></span>
                      {req.discount_code && <span>Cupom: <strong>{req.discount_code}</strong></span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{new Date(req.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex flex-col gap-2">
                      <input type="text" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Notas (opcional)"
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:ring-2 focus:ring-purple-500 outline-none" />
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveRequest(req.id, true)}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 flex items-center gap-1">
                          <Check size={14} /> Aprovar
                        </button>
                        <button onClick={() => handleApproveRequest(req.id, false)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 flex items-center gap-1">
                          <X size={14} /> Rejeitar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {requests.length === 0 && <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><p className="text-gray-400">Nenhuma solicitação de plano.</p></div>}
          </div>
        )}

        {/* Discounts Tab */}
        {activeTab === 'discounts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Códigos de Desconto</h3>
              <button onClick={() => setShowCreateCode(true)} className="px-4 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 flex items-center gap-2">
                <Plus size={16} /> Novo Código
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {discountCodes.map(code => (
                <div key={code.id} className={`bg-white rounded-xl border p-5 ${code.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg font-mono font-bold text-sm">{code.code}</span>
                    <button onClick={() => toggleCode(code.id, !code.is_active)} className="text-gray-400 hover:text-purple-500">
                      {code.is_active ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{code.description || 'Sem descrição'}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Desconto: <strong>{code.discount_type === 'percentage' ? `${code.discount_value}%` : formatBRL(code.discount_value)}</strong></p>
                    <p>Usos: <strong>{code.current_uses}{code.max_uses > 0 ? `/${code.max_uses}` : '/ilimitado'}</strong></p>
                    {code.valid_until && <p>Válido até: <strong>{new Date(code.valid_until).toLocaleDateString('pt-BR')}</strong></p>}
                  </div>
                </div>
              ))}
            </div>
            {discountCodes.length === 0 && <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><p className="text-gray-400">Nenhum código de desconto criado.</p></div>}
          </div>
        )}

        {/* Promotions Tab */}
        {activeTab === 'promotions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Promoções</h3>
              <button onClick={() => setShowCreatePromo(true)} className="px-4 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 flex items-center gap-2">
                <Plus size={16} /> Nova Promoção
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {promotions.map(promo => (
                <div key={promo.id} className={`bg-white rounded-xl border p-5 ${promo.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{promo.title}</h4>
                    <button onClick={() => togglePromo(promo.id, !promo.is_active)}>
                      {promo.is_active ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{promo.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded">{promo.discount_type === 'percentage' ? `${promo.discount_value}% off` : `R$${promo.discount_value} off`}</span>
                    {promo.end_date && <span className="px-2 py-1 bg-gray-50 rounded">Até {new Date(promo.end_date).toLocaleDateString('pt-BR')}</span>}
                  </div>
                </div>
              ))}
            </div>
            {promotions.length === 0 && <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><p className="text-gray-400">Nenhuma promoção criada.</p></div>}
          </div>
        )}

        {/* DB Management Tab */}
        {activeTab === 'portal18080' && (
          <ExternalPortalAdmin />
        )}

        {activeTab === 'setup' && (
          <SetupAssistant />
        )}

        {/* DB Management Tab */}
        {activeTab === 'db' && (
          <DatabaseStudio />
        )}
      </div>

      {/* Edit User Modal */}
      {showEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Editar Usuário</h3>
              <button onClick={() => setShowEditUser(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">{showEditUser.full_name}</p>
              <p className="text-xs text-gray-400">{showEditUser.email}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
                <select value={editPlan} onChange={e => setEditPlan(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  {Object.entries(planLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de Acesso</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value as 'user' | 'admin')} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível</label>
                <select value={editExperience} onChange={e => setEditExperience(e.target.value as 'beginner' | 'intermediate' | 'professional')} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="beginner">Iniciante</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="professional">Profissional</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Desconto Pessoal (%)</label>
                <input type="number" value={editDiscount} onChange={e => setEditDiscount(e.target.value)} min="0" max="100"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <button onClick={handleUpdateUser} className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision User Modal */}
      {showProvisionUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {provisionMode === 'create' ? 'Adicionar usuário manualmente' : 'Convidar usuário por e-mail'}
              </h3>
              <button onClick={() => setShowProvisionUser(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleProvisionUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={provisionForm.fullName} onChange={e => setProvisionForm({ ...provisionForm, fullName: e.target.value })} placeholder="Nome completo"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
                <input type="email" value={provisionForm.email} onChange={e => setProvisionForm({ ...provisionForm, email: e.target.value })} placeholder="E-mail *" required
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              {provisionMode === 'create' && (
                <input type="password" value={provisionForm.password} onChange={e => setProvisionForm({ ...provisionForm, password: e.target.value })} placeholder="Senha provisória (mín. 6) *" required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
              )}

              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={provisionForm.cpf} onChange={e => setProvisionForm({ ...provisionForm, cpf: e.target.value })} placeholder="CPF"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
                <input type="text" value={provisionForm.phone} onChange={e => setProvisionForm({ ...provisionForm, phone: e.target.value })} placeholder="Telefone"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select value={provisionForm.role} onChange={e => setProvisionForm({ ...provisionForm, role: e.target.value as 'user' | 'admin' })}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
                  <option value="user">Perfil: Usuário</option>
                  <option value="admin">Perfil: Administrador</option>
                </select>
                <select value={provisionForm.experienceLevel} onChange={e => setProvisionForm({ ...provisionForm, experienceLevel: e.target.value as 'beginner' | 'intermediate' | 'professional' })}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
                  <option value="beginner">Nível: Iniciante</option>
                  <option value="intermediate">Nível: Intermediário</option>
                  <option value="professional">Nível: Profissional</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <select value={provisionForm.currentPlan} onChange={e => setProvisionForm({ ...provisionForm, currentPlan: e.target.value as 'free' | 'essencial' | 'profissional' | 'expert' })}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
                  <option value="free">Plano: Gratuito</option>
                  <option value="essencial">Plano: Essencial</option>
                  <option value="profissional">Plano: Profissional</option>
                  <option value="expert">Plano: Expert</option>
                </select>
                <select value={provisionForm.planStatus} onChange={e => setProvisionForm({ ...provisionForm, planStatus: e.target.value as 'active' | 'pending' | 'suspended' | 'cancelled' })}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm">
                  <option value="active">Status: Ativo</option>
                  <option value="pending">Status: Pendente</option>
                  <option value="suspended">Status: Suspenso</option>
                  <option value="cancelled">Status: Cancelado</option>
                </select>
                <input type="number" min="0" max="100" value={provisionForm.discount} onChange={e => setProvisionForm({ ...provisionForm, discount: e.target.value })} placeholder="Desconto %"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>

              {provisionMode === 'invite' && (
                <input type="url" value={provisionForm.redirectTo} onChange={e => setProvisionForm({ ...provisionForm, redirectTo: e.target.value })} placeholder="Redirect opcional do convite"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
              )}

              <button type="submit" className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                {provisionMode === 'create' ? 'Criar usuário' : 'Enviar convite'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Discount Code Modal */}
      {showCreateCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Novo Código de Desconto</h3>
              <button onClick={() => setShowCreateCode(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateCode} className="space-y-3">
              <input type="text" value={codeForm.code} onChange={e => setCodeForm({...codeForm, code: e.target.value.toUpperCase()})} placeholder="Código (ex: PROMO20) *" required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-purple-500 outline-none" />
              <input type="text" value={codeForm.description} onChange={e => setCodeForm({...codeForm, description: e.target.value})} placeholder="Descrição"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={codeForm.discountType} onChange={e => setCodeForm({...codeForm, discountType: e.target.value})}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="percentage">Percentual (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
                <input type="number" step="0.01" value={codeForm.discountValue} onChange={e => setCodeForm({...codeForm, discountValue: e.target.value})} placeholder="Valor *" required
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={codeForm.maxUses} onChange={e => setCodeForm({...codeForm, maxUses: e.target.value})} placeholder="Máx. usos (vazio=ilimitado)"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                <input type="date" value={codeForm.validUntil} onChange={e => setCodeForm({...codeForm, validUntil: e.target.value})}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">Criar Código</button>
            </form>
          </div>
        </div>
      )}

      {/* Create Promotion Modal */}
      {showCreatePromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Nova Promoção</h3>
              <button onClick={() => setShowCreatePromo(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreatePromo} className="space-y-3">
              <input type="text" value={promoForm.title} onChange={e => setPromoForm({...promoForm, title: e.target.value})} placeholder="Título *" required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              <textarea value={promoForm.description} onChange={e => setPromoForm({...promoForm, description: e.target.value})} placeholder="Descrição" rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={promoForm.discountType} onChange={e => setPromoForm({...promoForm, discountType: e.target.value})}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="percentage">Percentual (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
                <input type="number" step="0.01" value={promoForm.discountValue} onChange={e => setPromoForm({...promoForm, discountValue: e.target.value})} placeholder="Valor *" required
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Início</label>
                  <input type="date" value={promoForm.startDate} onChange={e => setPromoForm({...promoForm, startDate: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Fim</label>
                  <input type="date" value={promoForm.endDate} onChange={e => setPromoForm({...promoForm, endDate: e.target.value})}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">Criar Promoção</button>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Plan Modal */}
      {(showCreatePlan || showEditPlan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{showEditPlan ? 'Editar Plano' : 'Novo Plano'}</h3>
              <button onClick={() => { setShowCreatePlan(false); setShowEditPlan(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={showEditPlan ? updatePlan : createPlan} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} placeholder="Nome *" required className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
                <input type="text" value={planForm.slug} onChange={e => setPlanForm({ ...planForm, slug: e.target.value })} placeholder="Slug *" required className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" value={planForm.price_monthly} onChange={e => setPlanForm({ ...planForm, price_monthly: e.target.value })} placeholder="Preço mensal" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
                <input type="number" step="0.01" value={planForm.price_yearly} onChange={e => setPlanForm({ ...planForm, price_yearly: e.target.value })} placeholder="Preço anual" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={planForm.max_transactions} onChange={e => setPlanForm({ ...planForm, max_transactions: e.target.value })} placeholder="Máx. transações" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
                <input type="number" value={planForm.max_investments} onChange={e => setPlanForm({ ...planForm, max_investments: e.target.value })} placeholder="Máx. investimentos" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />
              </div>
              <textarea value={planForm.features} onChange={e => setPlanForm({ ...planForm, features: e.target.value })} rows={6}
                placeholder="Features (uma por linha)" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" />

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  ['has_export', 'Exportar'],
                  ['has_import', 'Importar'],
                  ['has_education', 'Educação'],
                  ['has_simulator', 'Simulador'],
                  ['has_reports', 'Relatórios'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-gray-700 px-2 py-2 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={(planForm as any)[key]}
                      onChange={e => setPlanForm({ ...(planForm as any), [key]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <button type="submit" className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                {showEditPlan ? 'Salvar Alterações' : 'Criar Plano'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
