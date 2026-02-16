import React from 'react';
import { BookText, ShieldCheck } from 'lucide-react';

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
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={18} className="text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-900">Matriz de Conformidade PF/PJ</h3>
        </div>
        <p className="text-sm text-gray-500">
          Mapeamento entre calculadoras do sistema, base de fórmula e referência legal/fiscal. Esta matriz serve para governança técnica e revisão periódica.
        </p>
      </div>

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
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Observações</th>
            </tr>
          </thead>
          <tbody>
            {complianceRows.map((row) => (
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
                <td className="px-4 py-3 text-sm text-gray-500">{row.notes}</td>
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
