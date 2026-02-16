import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCcw, TriangleAlert, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getExternalHealth } from '@/lib/external-finbr-api';

interface CheckItem {
  id: string;
  label: string;
  ok: boolean;
  details: string;
  required: boolean;
}

const SetupAssistant: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState<CheckItem[]>([]);

  const runChecks = useCallback(async () => {
    setLoading(true);

    const results: CheckItem[] = [];

    const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
    results.push({
      id: 'env-supabase',
      label: 'Supabase configurado',
      ok: supabaseConfigured,
      required: true,
      details: supabaseConfigured
        ? 'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY presentes.'
        : 'Faltam variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY.',
    });

    const cpfConfigured = Boolean(import.meta.env.VITE_CPF_SCORE_API_URL);
    results.push({
      id: 'env-cpf',
      label: 'Score CPF (opcional)',
      ok: cpfConfigured,
      required: false,
      details: cpfConfigured
        ? 'VITE_CPF_SCORE_API_URL configurada.'
        : 'VITE_CPF_SCORE_API_URL não configurada (consulta CPF ficará indisponível, mas não bloqueia o core).',
    });

    try {
      const health = await getExternalHealth();
      results.push({
        id: 'external-portal',
        label: 'Portal externo 18080/API',
        ok: Boolean(health?.ok),
        required: true,
        details: health?.ok ? 'API externa respondeu com status OK.' : 'API externa respondeu sem OK.',
      });
    } catch (error) {
      results.push({
        id: 'external-portal',
        label: 'Portal externo 18080/API',
        ok: false,
        required: true,
        details: error instanceof Error ? error.message : 'Falha ao conectar API externa.',
      });
    }

    try {
      const { error } = await supabase.from('subprojects').select('id', { count: 'exact', head: true });
      results.push({
        id: 'table-subprojects',
        label: 'Tabela subprojects disponível',
        ok: !error,
        required: true,
        details: error ? error.message : 'Acesso REST a subprojects confirmado.',
      });
    } catch (error) {
      results.push({
        id: 'table-subprojects',
        label: 'Tabela subprojects disponível',
        ok: false,
        required: true,
        details: error instanceof Error ? error.message : 'Falha ao validar subprojects.',
      });
    }

    try {
      const { error } = await supabase.from('compliance_matrix_reviews').select('id', { count: 'exact', head: true });
      results.push({
        id: 'table-compliance',
        label: 'Auditoria compliance habilitada',
        ok: !error,
        required: true,
        details: error ? error.message : 'Tabela compliance_matrix_reviews acessível.',
      });
    } catch (error) {
      results.push({
        id: 'table-compliance',
        label: 'Auditoria compliance habilitada',
        ok: false,
        required: true,
        details: error instanceof Error ? error.message : 'Falha ao validar compliance_matrix_reviews.',
      });
    }

    setChecks(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const summary = useMemo(() => {
    const critical = checks.filter((item) => item.required);
    const optional = checks.filter((item) => !item.required);
    const okCritical = critical.filter((item) => item.ok).length;
    const pendingCritical = Math.max(0, critical.length - okCritical);
    const pendingOptional = optional.filter((item) => !item.ok).length;
    return { okCritical, pendingCritical, pendingOptional };
  }, [checks]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            <Wrench size={18} className="text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Assistente de Setup</h3>
          </div>
          <button onClick={runChecks} disabled={loading} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Revalidar
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Checklist operacional de componentes críticos (env, integrações e tabelas obrigatórias).
        </p>
        <div className="mt-3 flex gap-2 text-xs">
          <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700">OK: {summary.okCritical}</span>
          <span className="px-2 py-1 rounded-md bg-amber-100 text-amber-700">Pendências: {summary.pendingCritical}</span>
          <span className="px-2 py-1 rounded-md bg-indigo-100 text-indigo-700">Opcionais pendentes: {summary.pendingOptional}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {checks.map((item) => (
          <div key={item.id} className="p-4 flex items-start gap-3">
            {item.ok ? (
              <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />
            ) : (
              <TriangleAlert size={18} className="text-amber-600 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {item.label}
                {!item.required && <span className="ml-2 text-[10px] uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">Opcional</span>}
              </p>
              <p className="text-xs text-gray-500 mt-1">{item.details}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-indigo-900 mb-2">Runbook de correção</h4>
        <ul className="text-xs text-indigo-800 space-y-1 list-disc pl-4">
          <li>Subdatabase: execute `database/subdatabase_setup.sql` e `database/fix_subprojects_api_access.sql` (ou o consolidado `database/subprojects_recovery.sql`).</li>
          <li>Compliance audit: execute `database/compliance_matrix_reviews_setup.sql`.</li>
          <li>Env: revise `.env.deploy` e redeploy com `docker-compose --env-file .env.deploy up -d --build`.</li>
          <li>Portal externo: confirme API no `:13001` e variável `VITE_FINBR_EXTERNAL_API_BASE`.</li>
        </ul>
      </div>
    </div>
  );
};

export default SetupAssistant;
