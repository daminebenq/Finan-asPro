import React, { useEffect, useMemo, useState } from 'react';
import { BookText, Download, FileText, History, Save, ShieldCheck } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

interface ComplianceRow {
  id: string;
  scope: 'PF' | 'PJ' | 'PF/PJ';
  topic: string;
  formulaBase: string;
  legalReference: string;
  periodicity: string;
  lastReviewed: string;
  notes: string;
}

interface ComplianceReview {
  id: string;
  entry_id: string;
  reviewer_user_id: string;
  reviewer_name: string;
  review_note: string;
  reviewed_at: string;
}

const complianceRows: ComplianceRow[] = [
  {
    id: 'pf-inss',
    scope: 'PF',
    topic: 'INSS progressivo (segurado empregado)',
    formulaBase: 'Aplicação por faixas salariais progressivas, somando parcela de cada faixa até o teto.',
    legalReference: 'Previdência Social (regras federais vigentes para contribuição por faixa).',
    periodicity: 'Mensal',
    lastReviewed: '2026-02-16',
    notes: 'Utilizado para perfis PF (CLT/servidor) como estimativa educacional.',
  },
  {
    id: 'pf-irrf',
    scope: 'PF',
    topic: 'IRRF mensal sobre renda do trabalho',
    formulaBase: 'Base = bruto - INSS - dedução por dependentes; imposto = (base × alíquota) - parcela a deduzir.',
    legalReference: 'Tabela mensal de IRRF da Receita Federal (faixas e parcela a deduzir vigentes).',
    periodicity: 'Mensal',
    lastReviewed: '2026-02-16',
    notes: 'As faixas podem mudar por lei/decreto; validar na tabela oficial antes de decisão final.',
  },
  {
    id: 'pf-fgts',
    scope: 'PF',
    topic: 'FGTS sobre salário CLT',
    formulaBase: 'Depósito padrão estimado de 8% sobre remuneração base.',
    legalReference: 'Regras federais do FGTS para contrato CLT.',
    periodicity: 'Mensal',
    lastReviewed: '2026-02-16',
    notes: 'No app também há simulação de saque-aniversário por faixas.',
  },
  {
    id: 'pj-mei',
    scope: 'PJ',
    topic: 'MEI (DAS e limite anual)',
    formulaBase: 'Estimativa simplificada com componente previdenciário + adicional por atividade e checagem de limite anual.',
    legalReference: 'LC 123/2006 e normativos do Simples/MEI vigentes.',
    periodicity: 'Mensal/Anual',
    lastReviewed: '2026-02-16',
    notes: 'Aplicável a perfis PJ-MEI; limite anual deve ser monitorado continuamente.',
  },
  {
    id: 'pj-simples',
    scope: 'PJ',
    topic: 'Simples Nacional (comércio/serviços)',
    formulaBase: 'Alíquota efetiva = ((RBT12 × alíquota nominal) - parcela dedutível) / RBT12.',
    legalReference: 'LC 123/2006 (anexos e fórmula de alíquota efetiva) e atualizações oficiais.',
    periodicity: 'Mensal',
    lastReviewed: '2026-02-16',
    notes: 'No app, comércio usa estrutura tipo Anexo I e serviços estimativa tipo Anexo V.',
  },
  {
    id: 'pj-lp',
    scope: 'PJ',
    topic: 'Lucro Presumido (estimativa consolidada)',
    formulaBase: 'Base presumida por atividade + componentes IRPJ/CSLL e tributos sobre receita (modelo simplificado educacional).',
    legalReference: 'Normas federais de IRPJ/CSLL/PIS/COFINS para lucro presumido.',
    periodicity: 'Mensal/Trimestral',
    lastReviewed: '2026-02-16',
    notes: 'Estimativa para planejamento; apuração oficial exige enquadramento fiscal detalhado.',
  },
  {
    id: 'open-data',
    scope: 'PF/PJ',
    topic: 'Indicadores macroeconômicos e feriados',
    formulaBase: 'Consulta direta de séries públicas (SELIC/IPCA/CDI) e calendário nacional.',
    legalReference: 'Banco Central do Brasil (API SGS) e BrasilAPI (dados públicos).',
    periodicity: 'Atualização online',
    lastReviewed: '2026-02-16',
    notes: 'Sem API key; sujeito à disponibilidade dos serviços públicos.',
  },
];

const ComplianceMatrix: React.FC = () => {
  const { user, profile } = useAppContext();
  const [reviewsByEntry, setReviewsByEntry] = useState<Record<string, ComplianceReview>>({});
  const [reviewHistoryByEntry, setReviewHistoryByEntry] = useState<Record<string, ComplianceReview[]>>({});
  const [selectedEntry, setSelectedEntry] = useState(complianceRows[0]?.id || '');
  const [reviewNote, setReviewNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [historyRange, setHistoryRange] = useState<'30d' | 'all'>('all');

  const isAdmin = profile?.role === 'admin' || profile?.email?.toLowerCase() === 'damineone@gmail.com';

  const rowsWithAudit = useMemo(() => {
    return complianceRows.map((row) => {
      const audit = reviewsByEntry[row.id];
      return {
        ...row,
        lastReviewed: audit?.reviewed_at ? new Date(audit.reviewed_at).toISOString().slice(0, 10) : row.lastReviewed,
        reviewedBy: audit?.reviewer_name || 'N/D',
        reviewNote: audit?.review_note || row.notes,
      };
    });
  }, [reviewsByEntry]);

  const loadReviews = async () => {
    const { data, error } = await supabase
      .from('compliance_matrix_reviews')
      .select('*')
      .order('reviewed_at', { ascending: false });

    if (error) {
      return;
    }

    const latest: Record<string, ComplianceReview> = {};
    const fullHistory: Record<string, ComplianceReview[]> = {};
    (data as ComplianceReview[]).forEach((row) => {
      if (!fullHistory[row.entry_id]) fullHistory[row.entry_id] = [];
      fullHistory[row.entry_id].push(row);
      if (!latest[row.entry_id]) latest[row.entry_id] = row;
    });

    setReviewsByEntry(latest);
    setReviewHistoryByEntry(fullHistory);
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const exportCsv = () => {
    const headers = 'Escopo,Tema,Base de Cálculo,Referência,Periodicidade,Última revisão,Última revisão por,Observações\n';
    const rows = rowsWithAudit
      .map((row) =>
        [
          row.scope,
          row.topic,
          row.formulaBase,
          row.legalReference,
          row.periodicity,
          row.lastReviewed,
          row.reviewedBy,
          row.reviewNote,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_matrix_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    window.print();
  };

  const exportHistoryCsv = (entryId: string, topic: string) => {
    const allRows = reviewHistoryByEntry[entryId] || [];
    const rows = allRows.filter((row) => {
      if (historyRange === 'all') return true;
      const reviewedAt = new Date(row.reviewed_at).getTime();
      const minDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return reviewedAt >= minDate;
    });

    const headers = 'Tema,Revisor,Data/Hora,Observação\n';
    const body = rows
      .map((row) =>
        [topic, row.reviewer_name || 'Admin', new Date(row.reviewed_at).toLocaleString('pt-BR'), row.review_note || '']
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob([headers + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance_history_${entryId}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveReview = async () => {
    if (!user || !selectedEntry) return;
    setSavingReview(true);
    const payload = {
      entry_id: selectedEntry,
      reviewer_user_id: user.id,
      reviewer_name: profile?.full_name || profile?.email || 'Admin',
      review_note: reviewNote.trim() || null,
      reviewed_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('compliance_matrix_reviews').insert(payload);
    setSavingReview(false);

    if (error) {
      toast({ title: 'Erro ao salvar revisão', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Revisão registrada' });
    setReviewNote('');
    loadReviews();
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">Matriz de Conformidade PF/PJ</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2">
              <Download size={14} /> Exportar CSV
            </button>
            <button onClick={exportPdf} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2">
              <FileText size={14} /> Exportar PDF
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          Mapeamento entre calculadoras do sistema, base de fórmula e referência legal/fiscal. Esta matriz serve para governança técnica e revisão periódica.
        </p>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 grid md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Entrada da matriz</label>
            <select value={selectedEntry} onChange={(e) => setSelectedEntry(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm">
              {complianceRows.map((row) => (
                <option key={row.id} value={row.id}>{row.topic}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Observação de revisão</label>
            <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Ex.: conferido com atualização oficial" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" />
          </div>
          <button onClick={saveReview} disabled={savingReview} className="px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 inline-flex items-center justify-center gap-2">
            <Save size={14} /> {savingReview ? 'Salvando...' : 'Salvar revisão'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Escopo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tema</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Base de Cálculo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Referência</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Periodicidade</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Última revisão</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revisado por</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Observações</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Histórico</th>
            </tr>
          </thead>
          <tbody>
            {rowsWithAudit.map((row) => (
              <tr key={row.id} className="border-t border-gray-50 align-top">
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold ${row.scope === 'PF' ? 'bg-blue-100 text-blue-700' : row.scope === 'PJ' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {row.scope}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.topic}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.formulaBase}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.legalReference}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.periodicity}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.lastReviewed}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{row.reviewedBy}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{row.reviewNote}</td>
                <td className="px-4 py-3 text-right">
                  <Drawer>
                    <DrawerTrigger asChild>
                      <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1">
                        <History size={12} /> Ver histórico
                      </button>
                    </DrawerTrigger>
                    <DrawerContent className="max-h-[75vh]">
                      <DrawerHeader>
                        <DrawerTitle>Histórico de revisões</DrawerTitle>
                        <DrawerDescription>{row.topic}</DrawerDescription>
                      </DrawerHeader>
                      <div className="px-4 pb-2 overflow-y-auto">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setHistoryRange('30d')}
                              className={`px-2.5 py-1.5 rounded-md text-xs ${historyRange === '30d' ? 'bg-purple-600 text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            >
                              Últimos 30 dias
                            </button>
                            <button
                              onClick={() => setHistoryRange('all')}
                              className={`px-2.5 py-1.5 rounded-md text-xs ${historyRange === 'all' ? 'bg-purple-600 text-white' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            >
                              Todas
                            </button>
                            <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs">
                              {(reviewHistoryByEntry[row.id] || []).filter((review) => {
                                if (historyRange === 'all') return true;
                                const reviewedAt = new Date(review.reviewed_at).getTime();
                                const minDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
                                return reviewedAt >= minDate;
                              }).length} itens
                            </span>
                          </div>
                          <button
                            onClick={() => exportHistoryCsv(row.id, row.topic)}
                            className="px-2.5 py-1.5 border border-gray-200 rounded-md text-xs text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1"
                          >
                            <Download size={12} /> CSV
                          </button>
                        </div>

                        {(reviewHistoryByEntry[row.id] || []).filter((review) => {
                          if (historyRange === 'all') return true;
                          const reviewedAt = new Date(review.reviewed_at).getTime();
                          const minDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
                          return reviewedAt >= minDate;
                        }).length > 0 ? (
                          <div className="space-y-2 pb-4">
                            {(reviewHistoryByEntry[row.id] || [])
                              .filter((review) => {
                                if (historyRange === 'all') return true;
                                const reviewedAt = new Date(review.reviewed_at).getTime();
                                const minDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
                                return reviewedAt >= minDate;
                              })
                              .map((review) => (
                              <div key={review.id} className="border border-gray-100 rounded-lg p-3">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <p className="text-sm font-medium text-gray-900">{review.reviewer_name || 'Admin'}</p>
                                  <p className="text-xs text-gray-500">{new Date(review.reviewed_at).toLocaleString('pt-BR')}</p>
                                </div>
                                <p className="text-sm text-gray-600">{review.review_note || 'Sem observações adicionais.'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 pb-4">Nenhuma revisão registrada para este período.</p>
                        )}
                      </div>
                      <DrawerFooter>
                        <DrawerClose asChild>
                          <button className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Fechar</button>
                        </DrawerClose>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 inline-flex items-start gap-2">
        <BookText size={16} className="mt-0.5" />
        <p>
          Uso educacional e de planejamento: decisões fiscais/tributárias finais devem ser validadas com contador, normas da Receita Federal e legislação atualizada.
        </p>
      </div>
    </div>
  );
};

export default ComplianceMatrix;
