export interface ExternalSummary {
  patrimony: number;
  income: number;
  expenses: number;
  invested: number;
  balance: number;
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    type: 'income' | 'expense' | 'investment';
  }>;
}

export interface ExternalTransaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'income' | 'expense' | 'investment';
}

export interface ExternalGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  monthlyContribution: number;
  category: string;
  icon?: string;
}

export interface ExternalAdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  activeSessions: number;
  transactionsCount: number;
  goalsCount: number;
  educationModulesCount: number;
  patrimony: number;
  income: number;
  expenses: number;
  invested: number;
  balance: number;
}

export interface ExternalAdminHealth {
  ok: boolean;
  service: string;
  generatedAt: string;
  adminProtected: boolean;
  totals: {
    users: number;
    sessions: number;
    resetTokens: number;
    newsletterSubscriptions: number;
    transactionsCount: number;
    goalsCount: number;
    educationModulesCount: number;
    patrimony: number;
    income: number;
    expenses: number;
    invested: number;
    balance: number;
  };
  users: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      createdAt: string;
    };
    activeSessions: number;
    transactionsCount: number;
    goalsCount: number;
    educationModulesCount: number;
    patrimony: number;
    income: number;
    expenses: number;
    invested: number;
    balance: number;
  }>;
}

const getDefaultApiBase = () => {
  const configured = (import.meta.env.VITE_FINBR_EXTERNAL_API_BASE as string | undefined)?.trim();
  if (configured) return configured;

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:13001/api`;
};

export const externalApiBase = getDefaultApiBase();
const externalAdminKey = (import.meta.env.VITE_FINBR_EXTERNAL_ADMIN_KEY as string | undefined)?.trim();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${externalApiBase}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(externalAdminKey ? { 'x-admin-key': externalAdminKey } : {}),
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const getExternalHealth = () =>
  request<{ ok: boolean; service?: string }>('/health');

export const getExternalSummary = () =>
  request<ExternalSummary>('/dashboard/summary');

export const listExternalTransactions = () =>
  request<ExternalTransaction[]>('/transactions');

export const listExternalUserTransactions = (userId: string) =>
  request<ExternalTransaction[]>(`/admin/users/${userId}/transactions`);

export const createExternalTransaction = (payload: Omit<ExternalTransaction, 'id' | 'amount'> & { amount: number }) =>
  request<ExternalTransaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createExternalUserTransaction = (userId: string, payload: Omit<ExternalTransaction, 'id' | 'amount'> & { amount: number }) =>
  request<ExternalTransaction>(`/admin/users/${userId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteExternalTransaction = (id: string) =>
  request<void>(`/transactions/${id}`, { method: 'DELETE' });

export const deleteExternalUserTransaction = (userId: string, transactionId: string) =>
  request<void>(`/admin/users/${userId}/transactions/${transactionId}`, { method: 'DELETE' });

export const listExternalGoals = () =>
  request<ExternalGoal[]>('/goals');

export const listExternalUserGoals = (userId: string) =>
  request<ExternalGoal[]>(`/admin/users/${userId}/goals`);

export const createExternalGoal = (payload: Omit<ExternalGoal, 'id' | 'currentAmount' | 'icon'>) =>
  request<ExternalGoal>('/goals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createExternalUserGoal = (userId: string, payload: Omit<ExternalGoal, 'id' | 'currentAmount' | 'icon'>) =>
  request<ExternalGoal>(`/admin/users/${userId}/goals`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const contributeExternalGoal = (id: string, amount: number) =>
  request<ExternalGoal>(`/goals/${id}/contribute`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });

export const contributeExternalUserGoal = (userId: string, goalId: string, amount: number) =>
  request<ExternalGoal>(`/admin/users/${userId}/goals/${goalId}/contribute`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });

export const resetExternalGoal = (id: string) =>
  request<ExternalGoal>(`/goals/${id}/reset`, {
    method: 'POST',
  });

export const resetExternalUserGoal = (userId: string, goalId: string) =>
  request<ExternalGoal>(`/admin/users/${userId}/goals/${goalId}/reset`, {
    method: 'POST',
  });

export const deleteExternalGoal = (id: string) =>
  request<void>(`/goals/${id}`, { method: 'DELETE' });

export const deleteExternalUserGoal = (userId: string, goalId: string) =>
  request<void>(`/admin/users/${userId}/goals/${goalId}`, { method: 'DELETE' });

export const getExternalAdminHealth = () =>
  request<ExternalAdminHealth>('/admin/health');

export const listExternalAdminUsers = () =>
  request<ExternalAdminUser[]>('/admin/users');

export const revokeExternalUserSessions = (userId: string) =>
  request<{ ok: boolean; revokedSessions: number }>(`/admin/users/${userId}/revoke-sessions`, {
    method: 'POST',
  });

export const resetExternalUserData = (userId: string) =>
  request<{ ok: boolean; message: string }>(`/admin/users/${userId}/reset-data`, {
    method: 'POST',
  });
