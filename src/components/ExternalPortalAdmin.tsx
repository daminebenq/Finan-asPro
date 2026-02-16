import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ExternalLink, Goal, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  createExternalUserGoal,
  createExternalUserTransaction,
  contributeExternalGoal,
  contributeExternalUserGoal,
  createExternalGoal,
  createExternalTransaction,
  deleteExternalUserGoal,
  deleteExternalUserTransaction,
  deleteExternalGoal,
  deleteExternalTransaction,
  externalApiBase,
  getExternalAdminHealth,
  getExternalHealth,
  getExternalSummary,
  listExternalAdminUsers,
  listExternalGoals,
  listExternalUserGoals,
  listExternalUserTransactions,
  listExternalTransactions,
  resetExternalUserGoal,
  resetExternalGoal,
  resetExternalUserData,
  revokeExternalUserSessions,
  type ExternalAdminHealth,
  type ExternalAdminUser,
  type ExternalGoal,
  type ExternalSummary,
  type ExternalTransaction,
} from '@/lib/external-finbr-api';

const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ExternalPortalAdmin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<ExternalSummary | null>(null);
  const [transactions, setTransactions] = useState<ExternalTransaction[]>([]);
  const [goals, setGoals] = useState<ExternalGoal[]>([]);
  const [adminHealth, setAdminHealth] = useState<ExternalAdminHealth | null>(null);
  const [adminUsers, setAdminUsers] = useState<ExternalAdminUser[]>([]);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [contribution, setContribution] = useState<Record<string, string>>({});
  const [showGoalForm, setShowGoalForm] = useState(false);

  const [txForm, setTxForm] = useState({
    description: '',
    amount: '',
    category: 'Outros',
    date: new Date().toISOString().slice(0, 10),
    type: 'expense' as 'income' | 'expense' | 'investment',
  });

  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    monthlyContribution: '',
    deadline: '',
    category: 'Planejamento',
  });

  const loadExternalData = useCallback(async () => {
    setLoading(true);
    try {
      const [health, remoteSummary, remoteTxs, remoteGoals] = await Promise.all([
        getExternalHealth(),
        getExternalSummary(),
        listExternalTransactions(),
        listExternalGoals(),
      ]);
      setHealthOk(Boolean(health?.ok));
      setSummary(remoteSummary);
      setTransactions(remoteTxs || []);
      setGoals(remoteGoals || []);

      const [adminHealthResult, adminUsersResult] = await Promise.allSettled([
        getExternalAdminHealth(),
        listExternalAdminUsers(),
      ]);

      if (adminHealthResult.status === 'fulfilled') {
        setAdminHealth(adminHealthResult.value);
        setAdminError(null);
      } else {
        setAdminHealth(null);
        const message = adminHealthResult.reason instanceof Error ? adminHealthResult.reason.message : 'Falha ao carregar admin health';
        setAdminError(message);
      }

      if (adminUsersResult.status === 'fulfilled') {
        const users = adminUsersResult.value;
        setAdminUsers(users);
        if (!selectedUserId && users.length > 0) {
          setSelectedUserId(users[0].id);
        }
      } else {
        setAdminUsers([]);
      }
    } catch (error) {
      setHealthOk(false);
      const message = error instanceof Error ? error.message : 'Falha ao acessar portal externo';
      toast({ title: 'Integração indisponível', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  const isUserScope = selectedUserId.trim().length > 0;

  const selectedUser = useMemo(
    () => adminUsers.find((item) => item.id === selectedUserId) || null,
    [adminUsers, selectedUserId]
  );

  const refreshScopedData = useCallback(async () => {
    if (!isUserScope) {
      const [remoteSummary, remoteTxs, remoteGoals] = await Promise.all([
        getExternalSummary(),
        listExternalTransactions(),
        listExternalGoals(),
      ]);
      setSummary(remoteSummary);
      setTransactions(remoteTxs || []);
      setGoals(remoteGoals || []);
      return;
    }

    const [remoteTxs, remoteGoals] = await Promise.all([
      listExternalUserTransactions(selectedUserId),
      listExternalUserGoals(selectedUserId),
    ]);

    setTransactions(remoteTxs || []);
    setGoals(remoteGoals || []);

    if (selectedUser) {
      setSummary((prev) => ({
        patrimony: selectedUser.patrimony,
        income: selectedUser.income,
        expenses: selectedUser.expenses,
        invested: selectedUser.invested,
        balance: selectedUser.balance,
        recentTransactions: prev?.recentTransactions || [],
      }));
    }
  }, [isUserScope, selectedUserId, selectedUser]);

  useEffect(() => {
    if (!healthOk) return;
    refreshScopedData().catch((error) => {
      toast({ title: 'Falha ao carregar escopo selecionado', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
    });
  }, [selectedUserId, selectedUser, healthOk, refreshScopedData]);

  useEffect(() => {
    loadExternalData();
  }, [loadExternalData]);

  const txByType = useMemo(() => {
    return {
      income: transactions.filter((tx) => tx.type === 'income').length,
      expense: transactions.filter((tx) => tx.type === 'expense').length,
      investment: transactions.filter((tx) => tx.type === 'investment').length,
    };
  }, [transactions]);

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(txForm.amount);
    if (!amount || amount <= 0) {
      toast({ title: 'Valor inválido', description: 'Informe valor numérico maior que zero.', variant: 'destructive' });
      return;
    }

    try {
      if (isUserScope) {
        await createExternalUserTransaction(selectedUserId, {
          description: txForm.description,
          amount,
          category: txForm.category,
          date: txForm.date,
          type: txForm.type,
        });
      } else {
        await createExternalTransaction({
          description: txForm.description,
          amount,
          category: txForm.category,
          date: txForm.date,
          type: txForm.type,
        });
      }
      toast({ title: 'Transação criada no portal 18080' });
      setTxForm({ description: '', amount: '', category: 'Outros', date: new Date().toISOString().slice(0, 10), type: 'expense' });
      await loadExternalData();
    } catch (error) {
      toast({ title: 'Erro ao criar transação', description: error instanceof Error ? error.message : 'Falha', variant: 'destructive' });
    }
  };

  const handleDeleteTx = async (id: string) => {
    try {
      if (isUserScope) {
        await deleteExternalUserTransaction(selectedUserId, id);
      } else {
        await deleteExternalTransaction(id);
      }
      toast({ title: 'Transação removida no portal 18080' });
      await loadExternalData();
    } catch (error) {
      toast({ title: 'Erro ao remover transação', description: error instanceof Error ? error.message : 'Falha', variant: 'destructive' });
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmount = Number(goalForm.targetAmount);
    const monthlyContribution = Number(goalForm.monthlyContribution);
    if (!targetAmount || targetAmount <= 0 || !monthlyContribution || monthlyContribution <= 0) {
      toast({ title: 'Valores inválidos', description: 'Informe valor alvo e aporte mensal maiores que zero.', variant: 'destructive' });
      return;
    }

    try {
      if (isUserScope) {
        await createExternalUserGoal(selectedUserId, {
          name: goalForm.name,
          targetAmount,
          monthlyContribution,
          deadline: goalForm.deadline,
          category: goalForm.category,
        });
      } else {
        await createExternalGoal({
          name: goalForm.name,
          targetAmount,
          monthlyContribution,
          deadline: goalForm.deadline,
          category: goalForm.category,
        });
      }
      toast({ title: 'Meta criada no portal 18080' });
      setGoalForm({ name: '', targetAmount: '', monthlyContribution: '', deadline: '', category: 'Planejamento' });
      setShowGoalForm(false);
      await loadExternalData();
    } catch (error) {
      toast({ title: 'Erro ao criar meta', description: error instanceof Error ? error.message : 'Falha', variant: 'destructive' });
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      if (isUserScope) {
        await deleteExternalUserGoal(selectedUserId, id);
      } else {
        await deleteExternalGoal(id);
      }
      toast({ title: 'Meta removida no portal 18080' });
      await loadExternalData();
    } catch (error) {
      toast({ title: 'Erro ao remover meta', description: error instanceof Error ? error.message : 'Falha', variant: 'destructive' });
    }
  };

  const handleResetGoal = async (id: string) => {
    try {
      if (isUserScope) {
        await resetExternalUserGoal(selectedUserId, id);
      } else {
        await resetExternalGoal(id);
      }
      toast({ title: 'Meta resetada', description: 'Valor acumulado da meta foi zerado.' });
      await loadExternalData();
    } catch (error) {
      toast({ title: 'Erro ao resetar meta', description: error instanceof Error ? error.message : 'Falha', variant: 'destructive' });
    }
  };

  const handleContributeGoal = async (goalId: string) => {
    const amount = Number(contribution[goalId] || 0);
    if (!amount || amount <= 0) {
      toast({ title: 'Aporte inválido', description: 'Informe um valor maior que zero.', variant: 'destructive' });
      return;
    }
    try {
      if (isUserScope) {
        await contributeExternalUserGoal(selectedUserId, goalId, amount);
      } else {
        await contributeExternalGoal(goalId, amount);
      }
      setContribution((prev) => ({ ...prev, [goalId]: '' }));
      toast({ title: 'Aporte realizado no portal 18080' });
      await loadExternalData();
    } catch (error) {
      toast({ title: 'Erro ao aportar', description: error instanceof Error ? error.message : 'Falha', variant: 'destructive' });
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    try {
      const response = await revokeExternalUserSessions(userId);
      toast({ title: 'Sessões revogadas', description: `${response.revokedSessions || 0} sessão(ões) encerrada(s).` });
      await loadExternalData();
    } catch (error) {
      toast({ title: 'Erro ao revogar sessões', description: error instanceof Error ? error.message : 'Falha', variant: 'destructive' });
    }
  };

  const handleResetUserData = async (userId: string) => {
    try {
      await resetExternalUserData(userId);
      toast({ title: 'Dados do usuário resetados no portal 18080' });
      await loadExternalData();
    } catch (error) {
      toast({ title: 'Erro ao resetar dados', description: error instanceof Error ? error.message : 'Falha', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Portal Admin integrado ao 18080</h3>
            <p className="text-sm text-gray-500">
              Origem API: <span className="font-mono text-xs">{externalApiBase}</span>
            </p>
          </div>
          <div className="min-w-[280px]">
            <label className="block text-xs text-gray-500 mb-1">Escopo de gerenciamento</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700"
            >
              <option value="">Modo convidado/global (sem usuário)</option>
              {adminUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.email}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${healthOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {healthOk ? 'Conectado' : 'Desconectado'}
            </span>
            <button onClick={loadExternalData} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2">
              <RefreshCcw size={14} /> Atualizar
            </button>
            <a href="http://187.84.150.128:18080/" target="_blank" rel="noreferrer" className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2">
              <ExternalLink size={14} /> Abrir 18080
            </a>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Escopo ativo: {selectedUserId && selectedUser ? `${selectedUser.name} (${selectedUser.email})` : 'Convidado/Global'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Patrimônio', value: formatBRL(summary?.patrimony || 0) },
          { label: 'Receitas', value: formatBRL(summary?.income || 0) },
          { label: 'Despesas', value: formatBRL(summary?.expenses || 0) },
          { label: 'Saldo', value: formatBRL(summary?.balance || 0) },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Transações do portal 18080</h4>
            <div className="text-xs text-gray-500">R:{txByType.income} D:{txByType.expense} I:{txByType.investment}</div>
          </div>

          <form onSubmit={handleCreateTx} className="grid grid-cols-2 gap-2 mb-4">
            <input value={txForm.description} onChange={(e) => setTxForm((p) => ({ ...p, description: e.target.value }))} required placeholder="Descrição" className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <input type="number" step="0.01" value={txForm.amount} onChange={(e) => setTxForm((p) => ({ ...p, amount: e.target.value }))} required placeholder="Valor" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <select value={txForm.type} onChange={(e) => setTxForm((p) => ({ ...p, type: e.target.value as 'income' | 'expense' | 'investment' }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
              <option value="investment">Investimento</option>
            </select>
            <input value={txForm.category} onChange={(e) => setTxForm((p) => ({ ...p, category: e.target.value }))} required placeholder="Categoria" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <input type="date" value={txForm.date} onChange={(e) => setTxForm((p) => ({ ...p, date: e.target.value }))} required className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <button type="submit" className="col-span-2 px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 inline-flex items-center justify-center gap-2">
              <Plus size={14} /> Criar transação
            </button>
          </form>

          <div className="space-y-2 max-h-72 overflow-auto">
            {transactions.slice(0, 20).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                  <p className="text-xs text-gray-500">{tx.category} · {new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatBRL(Math.abs(tx.amount))}</p>
                  <button onClick={() => handleDeleteTx(tx.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {transactions.length === 0 && <p className="text-sm text-gray-400 py-2">Sem transações no momento.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Metas do portal 18080</h4>
            <button
              onClick={() => setShowGoalForm((prev) => !prev)}
              className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 inline-flex items-center gap-2"
            >
              <Plus size={14} /> Nova meta
            </button>
          </div>

          {showGoalForm && (
            <form onSubmit={handleCreateGoal} className="grid grid-cols-2 gap-2 mb-4">
              <input value={goalForm.name} onChange={(e) => setGoalForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Nome da meta" className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input type="number" step="0.01" value={goalForm.targetAmount} onChange={(e) => setGoalForm((p) => ({ ...p, targetAmount: e.target.value }))} required placeholder="Valor alvo" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input type="number" step="0.01" value={goalForm.monthlyContribution} onChange={(e) => setGoalForm((p) => ({ ...p, monthlyContribution: e.target.value }))} required placeholder="Aporte mensal" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input type="date" value={goalForm.deadline} onChange={(e) => setGoalForm((p) => ({ ...p, deadline: e.target.value }))} required className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input value={goalForm.category} onChange={(e) => setGoalForm((p) => ({ ...p, category: e.target.value }))} placeholder="Categoria" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <button type="submit" className="col-span-2 px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 inline-flex items-center justify-center gap-2">
                <Goal size={14} /> Criar meta
              </button>
            </form>
          )}

          <div className="space-y-2 max-h-72 overflow-auto">
            {goals.map((goal) => {
              const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
              return (
                <div key={goal.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">{goal.name}</p>
                    <span className="text-xs text-gray-500">{pct.toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{formatBRL(goal.currentAmount)} / {formatBRL(goal.targetAmount)}</p>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div className="h-2 rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={contribution[goal.id] || ''}
                      onChange={(e) => setContribution((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                      placeholder="Aporte"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <button onClick={() => handleContributeGoal(goal.id)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 inline-flex items-center gap-1">
                      <Activity size={13} /> Aportar
                    </button>
                    <button onClick={() => handleResetGoal(goal.id)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-amber-50 text-amber-700 inline-flex items-center gap-1">
                      <RefreshCcw size={13} /> Resetar
                    </button>
                    <button onClick={() => handleDeleteGoal(goal.id)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-red-50 text-red-600 inline-flex items-center gap-1">
                      <Trash2 size={13} /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && <p className="text-sm text-gray-400 py-2">Sem metas no momento.</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h4 className="font-semibold text-gray-900">Operações administrativas (API 13001)</h4>
            <p className="text-xs text-gray-500">Utiliza rotas /api/admin/* protegidas por chave admin.</p>
          </div>
          {adminError ? (
            <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">Admin indisponível</span>
          ) : (
            <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">Admin ativo</span>
          )}
        </div>

        {adminHealth && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="border border-gray-100 rounded-lg p-3">
              <p className="text-xs text-gray-500">Usuários</p>
              <p className="text-lg font-semibold text-gray-900">{adminHealth.totals.users}</p>
            </div>
            <div className="border border-gray-100 rounded-lg p-3">
              <p className="text-xs text-gray-500">Sessões</p>
              <p className="text-lg font-semibold text-gray-900">{adminHealth.totals.sessions}</p>
            </div>
            <div className="border border-gray-100 rounded-lg p-3">
              <p className="text-xs text-gray-500">Newsletters</p>
              <p className="text-lg font-semibold text-gray-900">{adminHealth.totals.newsletterSubscriptions}</p>
            </div>
            <div className="border border-gray-100 rounded-lg p-3">
              <p className="text-xs text-gray-500">Reset tokens</p>
              <p className="text-lg font-semibold text-gray-900">{adminHealth.totals.resetTokens}</p>
            </div>
          </div>
        )}

        {adminError && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3 mb-4">
            {adminError}
          </p>
        )}

        <div className="space-y-2 max-h-72 overflow-auto">
          {adminUsers.map((u) => (
            <div key={u.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <span className="text-xs text-gray-500">Sessões ativas: {u.activeSessions}</span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                Transações: {u.transactionsCount} · Metas: {u.goalsCount} · Patrimônio: {formatBRL(u.patrimony)}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleRevokeSessions(u.id)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                  Revogar sessões
                </button>
                <button onClick={() => handleResetUserData(u.id)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-red-50 text-red-600">
                  Resetar dados
                </button>
              </div>
            </div>
          ))}
          {!adminError && adminUsers.length === 0 && <p className="text-sm text-gray-400 py-2">Sem usuários cadastrados.</p>}
        </div>
      </div>

      {loading && <p className="text-xs text-gray-400">Sincronizando portal 18080...</p>}
    </div>
  );
};

export default ExternalPortalAdmin;
