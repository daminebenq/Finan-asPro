import React, { useMemo, useState } from 'react';
import { Calculator, Wallet, Landmark, ReceiptText, ShieldCheck, Loader2 } from 'lucide-react';
import { fetchCpfScore, type CpfScoreResult } from '@/lib/cpf-score';
import { toast } from '@/components/ui/use-toast';

const formatBRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fgtsRules = [
  { max: 500, aliquot: 0.5, extra: 0 },
  { max: 1000, aliquot: 0.4, extra: 50 },
  { max: 5000, aliquot: 0.3, extra: 150 },
  { max: 10000, aliquot: 0.2, extra: 650 },
  { max: 15000, aliquot: 0.15, extra: 1150 },
  { max: 20000, aliquot: 0.1, extra: 1900 },
  { max: Number.POSITIVE_INFINITY, aliquot: 0.05, extra: 2900 },
];

const scoreBand = (score: number) => {
  if (score >= 800) return { label: 'Excelente', color: 'text-emerald-600 bg-emerald-100' };
  if (score >= 650) return { label: 'Bom', color: 'text-blue-600 bg-blue-100' };
  if (score >= 500) return { label: 'Regular', color: 'text-amber-700 bg-amber-100' };
  return { label: 'Baixo', color: 'text-red-700 bg-red-100' };
};

const BrazilUseCases: React.FC<{ cpfFromProfile?: string }> = ({ cpfFromProfile }) => {
  const [monthlyCost, setMonthlyCost] = useState('5000');
  const [reserveMonths, setReserveMonths] = useState('6');

  const [loanAmount, setLoanAmount] = useState('350000');
  const [loanMonths, setLoanMonths] = useState('360');
  const [annualRate, setAnnualRate] = useState('11.5');
  const [amortization, setAmortization] = useState<'price' | 'sac'>('price');

  const [fgtsBalance, setFgtsBalance] = useState('12000');

  const [grossRevenue, setGrossRevenue] = useState('12000');
  const [meiType, setMeiType] = useState<'comercio' | 'servico' | 'misto'>('servico');

  const [salary, setSalary] = useState('6500');
  const [vacationReservePct, setVacationReservePct] = useState('35');

  const [cpfInput, setCpfInput] = useState(cpfFromProfile || '');
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreData, setScoreData] = useState<CpfScoreResult | null>(null);

  const emergencyReserve = useMemo(() => {
    const cost = Number(monthlyCost) || 0;
    const months = Number(reserveMonths) || 0;
    return Math.max(0, cost * months);
  }, [monthlyCost, reserveMonths]);

  const financing = useMemo(() => {
    const principal = Number(loanAmount) || 0;
    const months = Math.max(1, Number(loanMonths) || 1);
    const annual = Number(annualRate) || 0;
    const monthlyRate = annual / 12 / 100;

    if (principal <= 0) {
      return { installment: 0, firstInstallment: 0, lastInstallment: 0, total: 0, interest: 0 };
    }

    if (monthlyRate <= 0) {
      const installment = principal / months;
      return {
        installment,
        firstInstallment: installment,
        lastInstallment: installment,
        total: principal,
        interest: 0,
      };
    }

    if (amortization === 'price') {
      const installment = principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));
      const total = installment * months;
      return {
        installment,
        firstInstallment: installment,
        lastInstallment: installment,
        total,
        interest: total - principal,
      };
    }

    const amort = principal / months;
    const firstInstallment = amort + principal * monthlyRate;
    const lastInstallment = amort + amort * monthlyRate;
    const total = months * amort + monthlyRate * principal * ((months + 1) / 2);
    return {
      installment: firstInstallment,
      firstInstallment,
      lastInstallment,
      total,
      interest: total - principal,
    };
  }, [loanAmount, loanMonths, annualRate, amortization]);

  const fgtsEstimate = useMemo(() => {
    const balance = Number(fgtsBalance) || 0;
    const rule = fgtsRules.find((item) => balance <= item.max) || fgtsRules[fgtsRules.length - 1];
    const amount = balance * rule.aliquot + rule.extra;
    return Math.max(0, amount);
  }, [fgtsBalance]);

  const meiEstimate = useMemo(() => {
    const revenue = Number(grossRevenue) || 0;
    const annual = revenue * 12;
    const annualLimit = 81000;
    const exceeded = annual > annualLimit;

    const baseAliquot = meiType === 'comercio' ? 0.04 : meiType === 'servico' ? 0.06 : 0.055;
    const das = revenue * baseAliquot;

    return {
      das,
      annual,
      exceeded,
      annualLimit,
    };
  }, [grossRevenue, meiType]);

  const salaryPlanner = useMemo(() => {
    const monthlySalary = Number(salary) || 0;
    const thirteenth = monthlySalary;
    const firstInstallment = thirteenth / 2;
    const secondInstallment = thirteenth / 2;
    const vacationReserve = monthlySalary * ((Number(vacationReservePct) || 0) / 100);
    return {
      thirteenth,
      firstInstallment,
      secondInstallment,
      vacationReserve,
    };
  }, [salary, vacationReservePct]);

  const handleCpfScoreLookup = async () => {
    try {
      setScoreLoading(true);
      const data = await fetchCpfScore(cpfInput);
      setScoreData(data);
      toast({ title: 'Score consultado com sucesso' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao consultar score CPF';
      toast({ title: 'Falha na consulta', description: message, variant: 'destructive' });
    } finally {
      setScoreLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Reserva de Emergência</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} type="number" placeholder="Custo mensal" />
            <input className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={reserveMonths} onChange={(e) => setReserveMonths(e.target.value)} type="number" placeholder="Meses" />
          </div>
          <p className="text-sm text-gray-500">Meta recomendada</p>
          <p className="text-xl font-bold text-gray-900">{formatBRL(emergencyReserve)}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Landmark size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900">FGTS Saque-Aniversário</h3>
          </div>
          <input className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-3" value={fgtsBalance} onChange={(e) => setFgtsBalance(e.target.value)} type="number" placeholder="Saldo FGTS" />
          <p className="text-sm text-gray-500">Estimativa de saque anual</p>
          <p className="text-xl font-bold text-gray-900">{formatBRL(fgtsEstimate)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">Financiamento Imobiliário (SAC/PRICE)</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} type="number" placeholder="Valor financiado" />
            <input className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={loanMonths} onChange={(e) => setLoanMonths(e.target.value)} type="number" placeholder="Prazo (meses)" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} type="number" step="0.01" placeholder="Taxa anual (%)" />
            <select className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={amortization} onChange={(e) => setAmortization(e.target.value as 'price' | 'sac')}>
              <option value="price">PRICE</option>
              <option value="sac">SAC</option>
            </select>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">1ª parcela: <span className="font-semibold text-gray-900">{formatBRL(financing.firstInstallment)}</span></p>
            <p className="text-gray-600">Última parcela: <span className="font-semibold text-gray-900">{formatBRL(financing.lastInstallment)}</span></p>
            <p className="text-gray-600">Juros totais: <span className="font-semibold text-gray-900">{formatBRL(financing.interest)}</span></p>
            <p className="text-gray-600">Total pago: <span className="font-semibold text-gray-900">{formatBRL(financing.total)}</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ReceiptText size={18} className="text-purple-600" />
            <h3 className="font-semibold text-gray-900">MEI (DAS mensal estimado)</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={grossRevenue} onChange={(e) => setGrossRevenue(e.target.value)} type="number" placeholder="Faturamento mensal" />
            <select className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={meiType} onChange={(e) => setMeiType(e.target.value as 'comercio' | 'servico' | 'misto')}>
              <option value="comercio">Comércio</option>
              <option value="servico">Serviço</option>
              <option value="misto">Misto</option>
            </select>
          </div>
          <p className="text-sm text-gray-600">DAS estimado: <span className="font-semibold text-gray-900">{formatBRL(meiEstimate.das)}</span></p>
          <p className="text-sm text-gray-600">Faturamento anual projetado: <span className="font-semibold text-gray-900">{formatBRL(meiEstimate.annual)}</span></p>
          {meiEstimate.exceeded && (
            <p className="text-xs text-red-600 mt-2">Atenção: projeção acima do limite anual MEI ({formatBRL(meiEstimate.annualLimit)}).</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Planejamento 13º + Férias</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={salary} onChange={(e) => setSalary(e.target.value)} type="number" placeholder="Salário mensal" />
            <input className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={vacationReservePct} onChange={(e) => setVacationReservePct(e.target.value)} type="number" placeholder="% para férias" />
          </div>
          <div className="text-sm space-y-1">
            <p className="text-gray-600">13º total: <span className="font-semibold text-gray-900">{formatBRL(salaryPlanner.thirteenth)}</span></p>
            <p className="text-gray-600">1ª parcela: <span className="font-semibold text-gray-900">{formatBRL(salaryPlanner.firstInstallment)}</span></p>
            <p className="text-gray-600">2ª parcela: <span className="font-semibold text-gray-900">{formatBRL(salaryPlanner.secondInstallment)}</span></p>
            <p className="text-gray-600">Reserva para férias: <span className="font-semibold text-gray-900">{formatBRL(salaryPlanner.vacationReserve)}</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={18} className="text-emerald-700" />
            <h3 className="font-semibold text-gray-900">Score CPF (API)</h3>
          </div>
          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              value={cpfInput}
              onChange={(e) => setCpfInput(e.target.value)}
              placeholder="CPF (somente números ou formatado)"
            />
            <button
              onClick={handleCpfScoreLookup}
              disabled={scoreLoading}
              className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 disabled:opacity-60 flex items-center gap-2"
            >
              {scoreLoading && <Loader2 size={14} className="animate-spin" />}
              Consultar
            </button>
          </div>
          {!import.meta.env.VITE_CPF_SCORE_API_URL && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
              Configure VITE_CPF_SCORE_API_URL para habilitar a consulta em API pública/parceira.
            </p>
          )}
          {scoreData && (
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">Score calculado</p>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${scoreBand(scoreData.score).color}`}>
                  {scoreBand(scoreData.score).label}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{scoreData.score}</p>
              {(scoreData.bureau || scoreData.status) && (
                <p className="text-xs text-gray-500 mt-1">
                  {(scoreData.bureau ? `Fonte: ${scoreData.bureau}` : '')}
                  {scoreData.bureau && scoreData.status ? ' · ' : ''}
                  {(scoreData.status ? `Status: ${scoreData.status}` : '')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Simulações educacionais para apoio de decisão. Regras tributárias e trabalhistas podem mudar; valide dados finais com seu contador ou instituição financeira.
      </p>
    </div>
  );
};

export default BrazilUseCases;
