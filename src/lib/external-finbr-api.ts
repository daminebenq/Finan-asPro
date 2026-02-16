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

const getDefaultApiBase = () => {
  const configured = (import.meta.env.VITE_FINBR_EXTERNAL_API_BASE as string | undefined)?.trim();
  if (configured) return configured;

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:13001/api`;
};

export const externalApiBase = getDefaultApiBase();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${externalApiBase}${path}`, {
    headers: {
      'Content-Type': 'application/json',
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

export const createExternalTransaction = (payload: Omit<ExternalTransaction, 'id' | 'amount'> & { amount: number }) =>
  request<ExternalTransaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const deleteExternalTransaction = (id: string) =>
  request<void>(`/transactions/${id}`, { method: 'DELETE' });

export const listExternalGoals = () =>
  request<ExternalGoal[]>('/goals');

export const createExternalGoal = (payload: Omit<ExternalGoal, 'id' | 'currentAmount' | 'icon'>) =>
  request<ExternalGoal>('/goals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const contributeExternalGoal = (id: string, amount: number) =>
  request<ExternalGoal>(`/goals/${id}/contribute`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
