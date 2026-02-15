import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '@/contexts/app-context';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import {
  Plus, Trash2, Edit2, Download, Upload, TrendingUp, TrendingDown,
  DollarSign, Target, PieChart, BarChart3, FileText, BookOpen,
  ArrowUpRight, ArrowDownRight, Filter, Search, X, Save, ChevronDown
} from 'lucide-react';

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer',
  'Vestuário', 'Serviços', 'Impostos', 'Investimentos', 'Salário', 'Freelance', 'Outros'
];

const INVESTMENT_TYPES: Record<string, string> = {
  tesouro_direto: 'Tesouro Direto', cdb: 'CDB', lci: 'LCI', lca: 'LCA',
  acoes: 'Ações', fii: 'FII', etf: 'ETF', cripto: 'Cripto',
  poupanca: 'Poupança', debenture: 'Debênture', fundo: 'Fundo', outro: 'Outro'
};

interface Transaction {
  id: string; type: string; category: string; description: string;
  amount: number; date: string; bank: string; notes: string;
}

interface Investment {
  id: string; type: string; name: string; ticker: string; institution: string;
  quantity: number; purchase_price: number; current_price: number;
  purchase_date: string; maturity_date: string; rate_type: string; rate_value: number;
}

interface Goal {
  id: string; name: string; target_amount: number; current_amount: number;
  deadline: string; category: string; priority: string; status: string;
}

const Dashboard: React.FC = () => {
  const { profile, user, plans, updateProfile, updatePassword } = useAppContext();
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddInv, setShowAddInv] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Form states
  const [txForm, setTxForm] = useState({ type: 'expense', category: 'Outros', description: '', amount: '', date: new Date().toISOString().split('T')[0], bank: '', notes: '' });
  const [invForm, setInvForm] = useState({ type: 'tesouro_direto', name: '', ticker: '', institution: '', quantity: '1', purchase_price: '', current_price: '', purchase_date: new Date().toISOString().split('T')[0], maturity_date: '', rate_type: 'cdi', rate_value: '' });
  const [goalForm, setGoalForm] = useState({ name: '', target_amount: '', current_amount: '0', deadline: '', category: 'geral', priority: 'medium' });
  const [profileForm, setProfileForm] = useState({ full_name: '', cpf: '', phone: '', experience_level: 'beginner' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      full_name: profile.full_name || '',
      cpf: profile.cpf || '',
      phone: profile.phone || '',
      experience_level: profile.experience_level || 'beginner',
    });
  }, [profile]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [txRes, invRes, goalRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
      supabase.from('investments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    ]);
    if (txRes.data) setTransactions(txRes.data);
    if (invRes.data) setInvestments(invRes.data);
    if (goalRes.data) setGoals(goalRes.data);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id, type: txForm.type, category: txForm.category,
      description: txForm.description, amount: parseFloat(txForm.amount),
      date: txForm.date, bank: txForm.bank, notes: txForm.notes
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Transação adicionada!' });
    setShowAddTx(false);
    setTxForm({ type: 'expense', category: 'Outros', description: '', amount: '', date: new Date().toISOString().split('T')[0], bank: '', notes: '' });
    fetchData();
  };

  const addInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('investments').insert({
      user_id: user.id, type: invForm.type, name: invForm.name, ticker: invForm.ticker,
      institution: invForm.institution, quantity: parseFloat(invForm.quantity),
      purchase_price: parseFloat(invForm.purchase_price),
      current_price: invForm.current_price ? parseFloat(invForm.current_price) : null,
      purchase_date: invForm.purchase_date, maturity_date: invForm.maturity_date || null,
      rate_type: invForm.rate_type, rate_value: invForm.rate_value ? parseFloat(invForm.rate_value) : null
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Investimento adicionado!' });
    setShowAddInv(false);
    fetchData();
  };

  const addGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('goals').insert({
      user_id: user.id, name: goalForm.name, target_amount: parseFloat(goalForm.target_amount),
      current_amount: parseFloat(goalForm.current_amount), deadline: goalForm.deadline || null,
      category: goalForm.category, priority: goalForm.priority
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Meta adicionada!' });
    setShowAddGoal(false);
    setGoalForm({ name: '', target_amount: '', current_amount: '0', deadline: '', category: 'geral', priority: 'medium' });
    fetchData();
  };

  const deleteTransaction = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    fetchData();
  };

  const deleteInvestment = async (id: string) => {
    await supabase.from('investments').delete().eq('id', id);
    fetchData();
  };

  const deleteGoal = async (id: string) => {
    await supabase.from('goals').delete().eq('id', id);
    fetchData();
  };

  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast({ title: 'Arquivo vazio', variant: 'destructive' }); return; }
      const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase());
      const rows = lines.slice(1);
      let imported = 0;
      for (const row of rows) {
        const cols = row.split(/[,;]/).map(c => c.trim().replace(/"/g, ''));
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
        const desc = obj.descricao || obj.description || obj.memo || obj.historico || cols[1] || '';
        const amount = parseFloat((obj.valor || obj.amount || obj.value || cols[2] || '0').replace(',', '.').replace(/[^\d.-]/g, ''));
        const date = obj.data || obj.date || cols[0] || new Date().toISOString().split('T')[0];
        if (desc && !isNaN(amount)) {
          await supabase.from('transactions').insert({
            user_id: user.id, type: amount >= 0 ? 'income' : 'expense',
            category: 'Outros', description: desc, amount: Math.abs(amount),
            date: date.includes('/') ? date.split('/').reverse().join('-') : date,
            imported_from: file.name
          });
          imported++;
        }
      }
      toast({ title: `${imported} transações importadas!` });
      fetchData();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Import OFX
  const handleImportOFX = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const txRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
      let match;
      let imported = 0;
      while ((match = txRegex.exec(text)) !== null) {
        const block = match[1];
        const getTag = (tag: string) => { const m = block.match(new RegExp(`<${tag}>([^<\\n]+)`, 'i')); return m ? m[1].trim() : ''; };
        const type = getTag('TRNTYPE');
        const amount = parseFloat(getTag('TRNAMT').replace(',', '.'));
        const dateRaw = getTag('DTPOSTED');
        const desc = getTag('MEMO') || getTag('NAME');
        const date = dateRaw ? `${dateRaw.slice(0,4)}-${dateRaw.slice(4,6)}-${dateRaw.slice(6,8)}` : new Date().toISOString().split('T')[0];
        if (desc && !isNaN(amount)) {
          await supabase.from('transactions').insert({
            user_id: user.id, type: amount >= 0 ? 'income' : 'expense',
            category: 'Outros', description: desc, amount: Math.abs(amount),
            date, imported_from: file.name
          });
          imported++;
        }
      }
      toast({ title: `${imported} transações importadas do OFX!` });
      fetchData();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export CSV
  const exportCSV = () => {
    const headers = 'Data,Tipo,Categoria,Descrição,Valor,Banco,Notas\n';
    const rows = transactions.map(t =>
      `${t.date},${t.type === 'income' ? 'Receita' : 'Despesa'},${t.category},"${t.description}",${t.type === 'expense' ? '-' : ''}${t.amount},${t.bank || ''},${t.notes || ''}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finbr_transacoes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Export Excel (simple CSV with .xlsx extension for compatibility)
  const exportExcel = () => {
    let content = '<html><head><meta charset="UTF-8"></head><body><table>';
    content += '<tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th>Banco</th></tr>';
    transactions.forEach(t => {
      content += `<tr><td>${t.date}</td><td>${t.type === 'income' ? 'Receita' : 'Despesa'}</td><td>${t.category}</td><td>${t.description}</td><td>${t.type === 'expense' ? '-' : ''}${t.amount}</td><td>${t.bank || ''}</td></tr>`;
    });
    content += '</table></body></html>';
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `finbr_transacoes_${new Date().toISOString().split('T')[0]}.xls`;
    a.click(); URL.revokeObjectURL(url);
  };

  const validateDiscount = async () => {
    if (!discountCode || !selectedPlan) return;
    let data: any = null;
    try {
      const res = await supabase.functions.invoke('admin-setup', {
        body: { action: 'validate-discount', code: discountCode, plan: selectedPlan }
      });
      data = res.data;
    } catch {
      const code = discountCode.trim().toUpperCase();
      const now = new Date().toISOString();
      const { data: codeData } = await supabase
        .from('discount_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!codeData) {
        data = { success: false, message: 'Cupom não encontrado.' };
      } else {
        const expired = codeData.valid_until && codeData.valid_until < now;
        const maxReached = codeData.max_uses >= 0 && (codeData.current_uses || 0) >= codeData.max_uses;
        if (expired || maxReached) {
          data = { success: false, message: expired ? 'Cupom expirado.' : 'Cupom sem usos disponíveis.' };
        } else {
          data = {
            success: true,
            discount: {
              code: codeData.code,
              type: codeData.discount_type,
              value: Number(codeData.discount_value) || 0,
              description: codeData.description || `Cupom ${codeData.code}`,
            },
          };
        }
      }
    }
    if (data?.success) {
      setDiscountInfo(data.discount);
      toast({ title: 'Cupom aplicado!', description: data.discount.description });
    } else {
      setDiscountInfo(null);
      toast({ title: 'Cupom inválido', description: data?.message, variant: 'destructive' });
    }
  };

  const requestPlanUpgrade = async () => {
    if (!selectedPlan) return;
    const plan = plans.find(p => p.slug === selectedPlan);
    if (!plan) return;
    let finalPrice = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
    if (discountInfo) {
      if (discountInfo.type === 'percentage') finalPrice *= (1 - discountInfo.value / 100);
      else finalPrice -= discountInfo.value;
    }
    if (profile?.discount_percentage) finalPrice *= (1 - profile.discount_percentage / 100);
    
    const { error } = await supabase.from('plan_requests').insert({
      user_id: user.id, user_email: profile?.email || '', user_name: profile?.full_name || '',
      requested_plan: selectedPlan, current_plan: profile?.current_plan || 'free',
      billing_cycle: billingCycle, discount_code: discountCode || null,
      discount_amount: discountInfo ? discountInfo.value : 0, final_price: Math.max(0, finalPrice),
      status: 'pending'
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Solicitação enviada!', description: 'Aguarde aprovação do administrador.' });
    setShowUpgrade(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await updateProfile({
      full_name: profileForm.full_name,
      cpf: profileForm.cpf.replace(/\D/g, ''),
      phone: profileForm.phone.replace(/\D/g, ''),
      experience_level: profileForm.experience_level as 'beginner' | 'intermediate' | 'professional',
    });
    if (ok) {
      setShowProfileSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      toast({ title: 'Senha fraca', description: 'Use pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Senha não confere', description: 'A confirmação de senha não coincide.', variant: 'destructive' });
      return;
    }

    const ok = await updatePassword(passwordForm.newPassword);
    if (ok) {
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    }
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const totalInvested = investments.reduce((s, i) => s + (i.purchase_price * i.quantity), 0);
  const totalCurrentValue = investments.reduce((s, i) => s + ((i.current_price || i.purchase_price) * i.quantity), 0);
  const investmentReturn = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested * 100) : 0;

  const filteredTx = transactions.filter(t => {
    if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    return true;
  });

  const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: PieChart },
    { id: 'transactions', label: 'Transações', icon: FileText },
    { id: 'investments', label: 'Investimentos', icon: TrendingUp },
    { id: 'goals', label: 'Metas', icon: Target },
    { id: 'education', label: 'Educação', icon: BookOpen },
  ];

  const educationalContent = [
    { level: 'beginner', title: 'O que é Renda Fixa?', desc: 'Entenda CDB, LCI, LCA e Tesouro Direto - os investimentos mais seguros do Brasil.', category: 'Renda Fixa' },
    { level: 'beginner', title: 'Como fazer um orçamento', desc: 'Método 50-30-20 adaptado à realidade brasileira.', category: 'Orçamento' },
    { level: 'beginner', title: 'Reserva de Emergência', desc: 'Quanto guardar e onde investir sua reserva de emergência.', category: 'Planejamento' },
    { level: 'intermediate', title: 'Fundos Imobiliários (FIIs)', desc: 'Como investir em imóveis sem comprar um. Entenda FIIs e seus rendimentos.', category: 'Renda Variável' },
    { level: 'intermediate', title: 'Imposto de Renda em Investimentos', desc: 'Tabela regressiva, isenções e como declarar seus investimentos.', category: 'Impostos' },
    { level: 'intermediate', title: 'Diversificação de Carteira', desc: 'Como montar uma carteira equilibrada entre RF e RV.', category: 'Estratégia' },
    { level: 'professional', title: 'Operações Estruturadas', desc: 'Estratégias com opções, hedge e derivativos no mercado brasileiro.', category: 'Avançado' },
    { level: 'professional', title: 'PGBL vs VGBL', desc: 'Planejamento previdenciário e otimização fiscal com previdência privada.', category: 'Previdência' },
    { level: 'professional', title: 'Análise Fundamentalista', desc: 'Indicadores, múltiplos e como avaliar empresas na B3.', category: 'Análise' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className="text-lg font-bold text-gray-900">Fin<span className="text-emerald-600">BR</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              profile?.current_plan === 'expert' ? 'bg-purple-100 text-purple-700' :
              profile?.current_plan === 'profissional' ? 'bg-emerald-100 text-emerald-700' :
              profile?.current_plan === 'essencial' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {profile?.current_plan === 'free' ? 'Gratuito' : profile?.current_plan?.charAt(0).toUpperCase() + (profile?.current_plan?.slice(1) || '')}
            </span>
            {profile?.current_plan === 'free' && (
              <button onClick={() => setShowUpgrade(true)} className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all">
                Upgrade
              </button>
            )}
            <button onClick={() => setShowProfileSettings(true)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all">
              Editar Perfil
            </button>
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Saldo', value: formatBRL(balance), icon: DollarSign, color: 'emerald', change: balance >= 0 },
                { label: 'Receitas', value: formatBRL(totalIncome), icon: ArrowUpRight, color: 'blue', change: true },
                { label: 'Despesas', value: formatBRL(totalExpense), icon: ArrowDownRight, color: 'red', change: false },
                { label: 'Investimentos', value: formatBRL(totalCurrentValue), icon: TrendingUp, color: 'purple', change: investmentReturn >= 0 },
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">{card.label}</span>
                    <div className={`w-8 h-8 rounded-lg bg-${card.color}-100 flex items-center justify-center`}>
                      <card.icon size={16} className={`text-${card.color}-600`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  {i === 3 && <p className={`text-xs mt-1 ${investmentReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{investmentReturn >= 0 ? '+' : ''}{investmentReturn.toFixed(2)}% retorno</p>}
                </div>
              ))}
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Transações Recentes</h3>
                <button onClick={() => setActiveTab('transactions')} className="text-sm text-emerald-600 hover:text-emerald-700">Ver todas</button>
              </div>
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      {tx.type === 'income' ? <ArrowUpRight size={14} className="text-emerald-600" /> : <ArrowDownRight size={14} className="text-red-600" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                      <p className="text-xs text-gray-500">{tx.category} · {new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <span className={`font-semibold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatBRL(tx.amount)}
                  </span>
                </div>
              ))}
              {transactions.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Nenhuma transação ainda. Adicione ou importe suas transações.</p>}
            </div>

            {/* Goals Summary */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Metas Financeiras</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {goals.filter(g => g.status === 'active').slice(0, 3).map(goal => {
                  const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
                  return (
                    <div key={goal.id} className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-gray-900">{goal.name}</span>
                        <span className="text-xs text-gray-500">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-500">{formatBRL(goal.current_amount)} de {formatBRL(goal.target_amount)}</p>
                    </div>
                  );
                })}
                {goals.length === 0 && <p className="text-gray-400 text-sm col-span-3 text-center py-4">Defina suas metas financeiras para acompanhar seu progresso.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar transações..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
              </div>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Todas categorias</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setShowAddTx(true)} className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2">
                <Plus size={16} /> Adicionar
              </button>
              <div className="flex gap-2">
                <label className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-gray-700">
                  <Upload size={16} /> CSV
                  <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                </label>
                <label className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer flex items-center gap-2 text-gray-700">
                  <Upload size={16} /> OFX
                  <input type="file" accept=".ofx" onChange={handleImportOFX} className="hidden" />
                </label>
                <button onClick={exportCSV} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                  <Download size={16} /> CSV
                </button>
                <button onClick={exportExcel} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                  <Download size={16} /> Excel
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoria</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map(tx => (
                    <tr key={tx.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{tx.description}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">{tx.category}</span></td>
                      <td className={`px-4 py-3 text-sm font-semibold text-right ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatBRL(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteTransaction(tx.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTx.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Nenhuma transação encontrada.</p>}
            </div>
          </div>
        )}

        {/* Investments Tab */}
        {activeTab === 'investments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Carteira de Investimentos</h3>
                <p className="text-sm text-gray-500">Total: {formatBRL(totalCurrentValue)} ({investmentReturn >= 0 ? '+' : ''}{investmentReturn.toFixed(2)}%)</p>
              </div>
              <button onClick={() => setShowAddInv(true)} className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 flex items-center gap-2">
                <Plus size={16} /> Novo Investimento
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {investments.map(inv => {
                const total = inv.quantity * inv.purchase_price;
                const current = inv.quantity * (inv.current_price || inv.purchase_price);
                const ret = total > 0 ? ((current - total) / total * 100) : 0;
                return (
                  <div key={inv.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">{INVESTMENT_TYPES[inv.type]}</span>
                      <button onClick={() => deleteInvestment(inv.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                    <h4 className="font-semibold text-gray-900">{inv.name}</h4>
                    {inv.ticker && <p className="text-xs text-gray-500">{inv.ticker} · {inv.institution}</p>}
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Investido</span>
                        <span className="font-medium">{formatBRL(total)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-500">Atual</span>
                        <span className={`font-semibold ${ret >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatBRL(current)}</span>
                      </div>
                      <p className={`text-xs mt-1 ${ret >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{ret >= 0 ? '+' : ''}{ret.toFixed(2)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {investments.length === 0 && <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><p className="text-gray-400">Nenhum investimento cadastrado. Adicione seus investimentos para acompanhar sua carteira.</p></div>}
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Metas Financeiras</h3>
              <button onClick={() => setShowAddGoal(true)} className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 flex items-center gap-2">
                <Plus size={16} /> Nova Meta
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {goals.map(goal => {
                const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0;
                return (
                  <div key={goal.id} className="bg-white rounded-xl border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{goal.name}</h4>
                      <button onClick={() => deleteGoal(goal.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{formatBRL(goal.current_amount)}</span>
                      <span className="font-medium text-gray-900">{formatBRL(goal.target_amount)}</span>
                    </div>
                    {goal.deadline && <p className="text-xs text-gray-400 mt-2">Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</p>}
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                      goal.priority === 'high' ? 'bg-red-100 text-red-700' : goal.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>{goal.priority === 'high' ? 'Alta' : goal.priority === 'medium' ? 'Média' : 'Baixa'} prioridade</span>
                  </div>
                );
              })}
            </div>
            {goals.length === 0 && <div className="bg-white rounded-xl border border-gray-100 p-12 text-center"><p className="text-gray-400">Defina metas para acompanhar seu progresso financeiro.</p></div>}
          </div>
        )}

        {/* Education Tab */}
        {activeTab === 'education' && (
          <div className="space-y-6">
            {['beginner', 'intermediate', 'professional'].map(level => {
              const levelLabel = level === 'beginner' ? 'Iniciante' : level === 'intermediate' ? 'Intermediário' : 'Profissional';
              const content = educationalContent.filter(c => c.level === level);
              return (
                <div key={level}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{levelLabel}</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {content.map((item, i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer">
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">{item.category}</span>
                        <h4 className="font-semibold text-gray-900 mt-3">{item.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showProfileSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Configurações do Perfil</h3>
              <button onClick={() => setShowProfileSettings(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Dados pessoais</h4>
              <input
                type="text"
                value={profileForm.full_name}
                onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                placeholder="Nome completo"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={profileForm.cpf}
                  onChange={e => setProfileForm({ ...profileForm, cpf: e.target.value })}
                  placeholder="CPF"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                />
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="Telefone"
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <select
                value={profileForm.experience_level}
                onChange={e => setProfileForm({ ...profileForm, experience_level: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
              >
                <option value="beginner">Iniciante</option>
                <option value="intermediate">Intermediário</option>
                <option value="professional">Profissional</option>
              </select>
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                Salvar Perfil
              </button>
            </form>

            <form onSubmit={handleChangePassword} className="space-y-3 mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700">Alterar senha</h4>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Nova senha"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
              />
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Confirmar nova senha"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
              />
              <button type="submit" className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all">
                Atualizar Senha
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Nova Transação</h3>
              <button onClick={() => setShowAddTx(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={addTransaction} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {['expense', 'income'].map(t => (
                  <button key={t} type="button" onClick={() => setTxForm({...txForm, type: t})}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${txForm.type === t ? (t === 'income' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-600'}`}>
                    {t === 'income' ? 'Receita' : 'Despesa'}
                  </button>
                ))}
              </div>
              <input type="text" value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} placeholder="Descrição *" required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} placeholder="Valor (R$) *" required className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                <input type="date" value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <select value={txForm.category} onChange={e => setTxForm({...txForm, category: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" value={txForm.bank} onChange={e => setTxForm({...txForm, bank: e.target.value})} placeholder="Banco (opcional)" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">Salvar</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Investment Modal */}
      {showAddInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Novo Investimento</h3>
              <button onClick={() => setShowAddInv(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={addInvestment} className="space-y-3">
              <select value={invForm.type} onChange={e => setInvForm({...invForm, type: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                {Object.entries(INVESTMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="text" value={invForm.name} onChange={e => setInvForm({...invForm, name: e.target.value})} placeholder="Nome do investimento *" required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={invForm.ticker} onChange={e => setInvForm({...invForm, ticker: e.target.value})} placeholder="Ticker (ex: PETR4)" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                <input type="text" value={invForm.institution} onChange={e => setInvForm({...invForm, institution: e.target.value})} placeholder="Instituição" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" step="0.01" value={invForm.quantity} onChange={e => setInvForm({...invForm, quantity: e.target.value})} placeholder="Qtd" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                <input type="number" step="0.01" value={invForm.purchase_price} onChange={e => setInvForm({...invForm, purchase_price: e.target.value})} placeholder="Preço compra *" required className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                <input type="number" step="0.01" value={invForm.current_price} onChange={e => setInvForm({...invForm, current_price: e.target.value})} placeholder="Preço atual" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={invForm.purchase_date} onChange={e => setInvForm({...invForm, purchase_date: e.target.value})} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                <input type="date" value={invForm.maturity_date} onChange={e => setInvForm({...invForm, maturity_date: e.target.value})} placeholder="Vencimento" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">Salvar</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Nova Meta</h3>
              <button onClick={() => setShowAddGoal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={addGoal} className="space-y-3">
              <input type="text" value={goalForm.name} onChange={e => setGoalForm({...goalForm, name: e.target.value})} placeholder="Nome da meta *" required className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.01" value={goalForm.target_amount} onChange={e => setGoalForm({...goalForm, target_amount: e.target.value})} placeholder="Valor alvo (R$) *" required className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                <input type="number" step="0.01" value={goalForm.current_amount} onChange={e => setGoalForm({...goalForm, current_amount: e.target.value})} placeholder="Valor atual (R$)" className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <input type="date" value={goalForm.deadline} onChange={e => setGoalForm({...goalForm, deadline: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              <select value={goalForm.priority} onChange={e => setGoalForm({...goalForm, priority: e.target.value})} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="low">Baixa prioridade</option>
                <option value="medium">Média prioridade</option>
                <option value="high">Alta prioridade</option>
              </select>
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">Salvar</button>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Upgrade de Plano</h3>
              <button onClick={() => setShowUpgrade(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium ${billingCycle === 'monthly' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Mensal</button>
              <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-2 rounded-lg text-sm font-medium ${billingCycle === 'yearly' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Anual (-17%)</button>
            </div>
            <div className="space-y-3 mb-4">
              {plans.filter(p => p.slug !== 'free').map(plan => {
                const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
                return (
                  <button key={plan.id} onClick={() => setSelectedPlan(plan.slug)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedPlan === plan.slug ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-900">{plan.name}</span>
                        <p className="text-sm text-gray-500 mt-1">{plan.features.slice(0, 2).join(' · ')}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900">R${(billingCycle === 'monthly' ? price : price / 12).toFixed(2).replace('.', ',')}</span>
                        <p className="text-xs text-gray-500">/mês</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mb-4">
              <input type="text" value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="Código de desconto" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              <button onClick={validateDiscount} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">Aplicar</button>
            </div>
            {discountInfo && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-sm text-emerald-700">
                Desconto aplicado: {discountInfo.type === 'percentage' ? `${discountInfo.value}%` : `R$${discountInfo.value}`} - {discountInfo.description}
              </div>
            )}
            <p className="text-xs text-gray-500 mb-4">Sua solicitação será analisada e aprovada pelo administrador. Você receberá uma notificação quando seu plano for ativado.</p>
            <button onClick={requestPlanUpgrade} disabled={!selectedPlan}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50">
              Solicitar Upgrade
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
