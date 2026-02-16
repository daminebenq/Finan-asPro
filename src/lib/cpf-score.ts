export interface CpfScoreResult {
  score: number;
  bureau?: string;
  status?: string;
  updatedAt?: string;
  raw?: unknown;
}

const scorePaths = [
  'score',
  'cpf_score',
  'credit_score',
  'pontuacao',
  'pontuação',
  'data.score',
  'result.score',
  'response.score',
] as const;

const bureauPaths = ['bureau', 'provider', 'data.bureau', 'result.bureau'] as const;
const statusPaths = ['status', 'situation', 'situacao', 'situação', 'data.status'] as const;
const updatedAtPaths = ['updated_at', 'updatedAt', 'data.updated_at', 'result.updated_at'] as const;

const getByPath = (obj: unknown, path: string): unknown => {
  if (!obj || typeof obj !== 'object') return undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
};

const firstValue = (obj: unknown, paths: readonly string[]): unknown => {
  for (const path of paths) {
    const value = getByPath(obj, path);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const normalizeScore = (value: unknown): number | null => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < 0) return 0;
  if (numeric > 1000) return 1000;
  return Math.round(numeric);
};

const buildCpfScoreUrl = (cpf: string): string => {
  const baseUrl = (import.meta.env.VITE_CPF_SCORE_API_URL as string | undefined)?.trim();
  if (!baseUrl) {
    throw new Error('Configure VITE_CPF_SCORE_API_URL para consultar score CPF.');
  }

  if (baseUrl.includes('{cpf}')) {
    return baseUrl.replace('{cpf}', encodeURIComponent(cpf));
  }

  const paramName = ((import.meta.env.VITE_CPF_SCORE_API_CPF_PARAM as string | undefined) || 'cpf').trim();
  const url = new URL(baseUrl);
  url.searchParams.set(paramName, cpf);
  return url.toString();
};

export const fetchCpfScore = async (cpf: string): Promise<CpfScoreResult> => {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) {
    throw new Error('CPF inválido. Informe 11 dígitos.');
  }

  const endpoint = buildCpfScoreUrl(cleanCpf);
  const token = (import.meta.env.VITE_CPF_SCORE_API_KEY as string | undefined)?.trim();
  const authHeaderName = ((import.meta.env.VITE_CPF_SCORE_API_AUTH_HEADER as string | undefined) || 'x-api-key').trim();
  const timeoutMs = Number(import.meta.env.VITE_CPF_SCORE_API_TIMEOUT_MS || 12000);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 12000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { [authHeaderName]: token } : {}),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar score CPF: HTTP ${response.status}`);
    }

    const payload = await response.json();
    const score = normalizeScore(firstValue(payload, scorePaths));
    if (score === null) {
      throw new Error('Resposta da API sem campo de score reconhecido.');
    }

    return {
      score,
      bureau: String(firstValue(payload, bureauPaths) ?? ''),
      status: String(firstValue(payload, statusPaths) ?? ''),
      updatedAt: String(firstValue(payload, updatedAtPaths) ?? ''),
      raw: payload,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tempo limite excedido ao consultar score CPF.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
