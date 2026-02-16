import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Calculator, Landmark, Loader2, ReceiptText, ShieldCheck, Wallet } from 'lucide-react';
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

const inssBrackets = [
  { cap: 1412.0, rate: 0.075 },
  { cap: 2666.68, rate: 0.09 },
  { cap: 4000.03, rate: 0.12 },
  { cap: 7786.02, rate: 0.14 },
];

const irrfBrackets = [
  { min: 0, max: 2259.2, rate: 0, deduction: 0 },
  { min: 2259.21, max: 2826.65, rate: 0.075, deduction: 169.44 },
  { min: 2826.66, max: 3751.05, rate: 0.15, deduction: 381.44 },
  { min: 3751.06, max: 4664.68, rate: 0.225, deduction: 662.77 },
  { min: 4664.69, max: Number.POSITIVE_INFINITY, rate: 0.275, deduction: 896.0 },
];

const simplesTables = {
  comercio: [
    { max: 180000, aliquot: 0.04, deduction: 0 },
    { max: 360000, aliquot: 0.073, deduction: 5940 },
    { max: 720000, aliquot: 0.095, deduction: 13860 },
    { max: 1800000, aliquot: 0.107, deduction: 22500 },
    { max: 3600000, aliquot: 0.143, deduction: 87300 },
    { max: 4800000, aliquot: 0.19, deduction: 378000 },
  ],
  servicos: [
    { max: 180000, aliquot: 0.155, deduction: 0 },
    { max: 360000, aliquot: 0.18, deduction: 4500 },
    { max: 720000, aliquot: 0.195, deduction: 9900 },
    { max: 1800000, aliquot: 0.205, deduction: 17100 },
    { max: 3600000, aliquot: 0.23, deduction: 62100 },
    { max: 4800000, aliquot: 0.305, deduction: 540000 },
  ],
} as const;

const getBcbLastValue = async (seriesCode: string) => {
  const response = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${seriesCode}/dados/ultimos/1?formato=json`);
  if (!response.ok) throw new Error(`BCB série ${seriesCode} indisponível`);
  const data = (await response.json()) as Array<{ valor: string }>;
  return Number((data?.[0]?.valor || '0').replace(',', '.'));
};

const getCurrentYearHolidays = async () => {
  const year = new Date().getFullYear();
  const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
  if (!response.ok) throw new Error('BrasilAPI indisponível');
  const data = (await response.json()) as Array<{ date: string; name: string; type: string }>;
  return data;
};

const scoreBand = (score: number) => {
  if (score >= 800) return { label: 'Excelente', color: 'text-emerald-600 bg-emerald-100' };
  if (score >= 650) return { label: 'Bom', color: 'text-blue-600 bg-blue-100' };
  if (score >= 500) return { label: 'Regular', color: 'text-amber-700 bg-amber-100' };
  return { label: 'Baixo', color: 'text-red-700 bg-red-100' };
};

const BrazilUseCases: React.FC<{ cpfFromProfile?: string }> = ({ cpfFromProfile }) => {
  const [legalType, setLegalType] = useState<'PF' | 'PJ'>('PF');
  const [pfProfile, setPfProfile] = useState<'clt' | 'autonomo' | 'servidor' | 'investidor'>('clt');
  const [pjProfile, setPjProfile] = useState<'mei' | 'simples-comercio' | 'simples-servicos' | 'lucro-presumido'>('mei');

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
  const [dependents, setDependents] = useState('0');
  const [pjPayroll, setPjPayroll] = useState('4500');

  const [selic, setSelic] = useState<number | null>(null);
  const [ipca, setIpca] = useState<number | null>(null);
  const [cdi, setCdi] = useState<number | null>(null);
  const [holidays, setHolidays] = useState<Array<{ date: string; name: string; type: string }>>([]);
  const [openDataLoading, setOpenDataLoading] = useState(false);

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

  const pfFederalCalc = useMemo(() => {
    const gross = Number(salary) || 0;
    const deps = Number(dependents) || 0;

    let inss = 0;
    let prevCap = 0;
    for (const bracket of inssBrackets) {
      if (gross <= prevCap) break;
      const taxableSlice = Math.max(0, Math.min(gross, bracket.cap) - prevCap);
      inss += taxableSlice * bracket.rate;
      prevCap = bracket.cap;
    }

    const depDeduction = deps * 189.59;
    const taxableIR = Math.max(0, gross - inss - depDeduction);
    const irrfRule = irrfBrackets.find((b) => taxableIR >= b.min && taxableIR <= b.max) || irrfBrackets[0];
    const irrf = Math.max(0, taxableIR * irrfRule.rate - irrfRule.deduction);
    const fgts = gross * 0.08;
    const net = gross - inss - irrf;

    return { gross, inss, irrf, fgts, net, taxableIR };
  }, [salary, dependents]);

  const pjFederalCalc = useMemo(() => {
    const monthlyRevenue = Number(grossRevenue) || 0;
    const annualRevenue = monthlyRevenue * 12;
    const payroll = Number(pjPayroll) || 0;

    if (pjProfile === 'mei') {
      const annualLimit = 81000;
      const exceeded = annualRevenue > annualLimit;
      const inssBase = 1412;
      const das = inssBase * 0.05 + (meiType === 'servico' ? 5 : meiType === 'misto' ? 6 : 1);
      return {
        regime: 'MEI',
        effectiveRate: monthlyRevenue > 0 ? das / monthlyRevenue : 0,
        monthlyTax: das,
        annualRevenue,
        annualLimit,
        exceeded,
      };
    }

    const annex = pjProfile === 'simples-comercio' ? simplesTables.comercio : simplesTables.servicos;
    const bracket = annex.find((row) => annualRevenue <= row.max) || annex[annex.length - 1];
    const effectiveRate = annualRevenue > 0 ? (annualRevenue * bracket.aliquot - bracket.deduction) / annualRevenue : 0;
    const monthlyTax = monthlyRevenue * Math.max(0, effectiveRate);

    if (pjProfile === 'lucro-presumido') {
      const presumedBase = monthlyRevenue * (meiType === 'servico' ? 0.32 : 0.08);
      const irpj = presumedBase * 0.15;
      const csll = presumedBase * 0.09;
      const pisCofins = monthlyRevenue * 0.0365;
      const payrollCharges = payroll * 0.28;
      return {
        regime: 'Lucro Presumido',
        effectiveRate: monthlyRevenue > 0 ? (irpj + csll + pisCofins + payrollCharges) / monthlyRevenue : 0,
        monthlyTax: irpj + csll + pisCofins + payrollCharges,
        annualRevenue,
        annualLimit: null,
        exceeded: false,
      };
    }

    return {
      regime: pjProfile === 'simples-comercio' ? 'Simples Nacional (Comércio)' : 'Simples Nacional (Serviços)',
      effectiveRate,
      monthlyTax,
      annualRevenue,
      annualLimit: 4800000,
      exceeded: annualRevenue > 4800000,
    };
  }, [grossRevenue, meiType, pjPayroll, pjProfile]);

  useEffect(() => {
    const loadOpenData = async () => {
      try {
        setOpenDataLoading(true);
        const [selicValue, ipcaValue, cdiValue, holidayList] = await Promise.all([
          getBcbLastValue('432'),
          getBcbLastValue('433'),
          getBcbLastValue('12'),
          getCurrentYearHolidays(),
        ]);
        setSelic(selicValue);
        setIpca(ipcaValue);
        setCdi(cdiValue);
        setHolidays(holidayList || []);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao carregar dados públicos';
        toast({ title: 'Open data indisponível', description: message, variant: 'destructive' });
      } finally {
        setOpenDataLoading(false);
      }
    };

    loadOpenData();
  }, []);

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
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Perfis financeiros PF/PJ</h3>
            <p className="text-xs text-gray-500">Regras federais aplicadas para CLT, autônomo, MEI, Simples e Lucro Presumido.</p>
          </div>
          {openDataLoading ? (
            <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Atualizando open data...</span>
          ) : (
            <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
              <span>SELIC: <strong>{selic !== null ? `${selic.toFixed(2)}%` : '-'}</strong></span>
              <span>IPCA: <strong>{ipca !== null ? `${ipca.toFixed(2)}%` : '-'}</strong></span>
              <span>CDI: <strong>{cdi !== null ? `${cdi.toFixed(2)}%` : '-'}</strong></span>
              <span>Feriados federais: <strong>{holidays.length}</strong></span>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex gap-2">
            <button onClick={() => setLegalType('PF')} className={`px-4 py-2 rounded-lg text-sm font-medium ${legalType === 'PF' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Pessoa Física</button>
            <button onClick={() => setLegalType('PJ')} className={`px-4 py-2 rounded-lg text-sm font-medium ${legalType === 'PJ' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Pessoa Jurídica</button>
          </div>
          {legalType === 'PF' ? (
            <select value={pfProfile} onChange={(e) => setPfProfile(e.target.value as 'clt' | 'autonomo' | 'servidor' | 'investidor')} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
              <option value="clt">PF - CLT</option>
              <option value="autonomo">PF - Autônomo</option>
              <option value="servidor">PF - Servidor Público</option>
              <option value="investidor">PF - Investidor</option>
            </select>
          ) : (
            <select value={pjProfile} onChange={(e) => setPjProfile(e.target.value as 'mei' | 'simples-comercio' | 'simples-servicos' | 'lucro-presumido')} className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm">
              <option value="mei">PJ - MEI</option>
              <option value="simples-comercio">PJ - Simples Comércio (Anexo I)</option>
              <option value="simples-servicos">PJ - Simples Serviços (Anexo V)</option>
              <option value="lucro-presumido">PJ - Lucro Presumido</option>
            </select>
          )}
        </div>
      </div>

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
          <input className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-3" value={dependents} onChange={(e) => setDependents(e.target.value)} type="number" placeholder="Dependentes para IRRF" />
          <div className="text-sm space-y-1">
            <p className="text-gray-600">13º total: <span className="font-semibold text-gray-900">{formatBRL(salaryPlanner.thirteenth)}</span></p>
            <p className="text-gray-600">1ª parcela: <span className="font-semibold text-gray-900">{formatBRL(salaryPlanner.firstInstallment)}</span></p>
            <p className="text-gray-600">2ª parcela: <span className="font-semibold text-gray-900">{formatBRL(salaryPlanner.secondInstallment)}</span></p>
            <p className="text-gray-600">Reserva para férias: <span className="font-semibold text-gray-900">{formatBRL(salaryPlanner.vacationReserve)}</span></p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 inline-flex items-center gap-2"><Building2 size={14} /> Encargos federais PF (estimativa)</h4>
            <div className="text-sm space-y-1">
              <p className="text-gray-600">INSS: <span className="font-semibold text-gray-900">{formatBRL(pfFederalCalc.inss)}</span></p>
              <p className="text-gray-600">IRRF: <span className="font-semibold text-gray-900">{formatBRL(pfFederalCalc.irrf)}</span></p>
              <p className="text-gray-600">FGTS (depósito): <span className="font-semibold text-gray-900">{formatBRL(pfFederalCalc.fgts)}</span></p>
              <p className="text-gray-600">Líquido estimado: <span className="font-semibold text-gray-900">{formatBRL(pfFederalCalc.net)}</span></p>
            </div>
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

      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Cálculos federais PJ (regimes principais)</h3>
        <div className="grid md:grid-cols-3 gap-3 mb-3">
          <input className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={grossRevenue} onChange={(e) => setGrossRevenue(e.target.value)} type="number" placeholder="Faturamento mensal" />
          <input className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={pjPayroll} onChange={(e) => setPjPayroll(e.target.value)} type="number" placeholder="Folha mensal" />
          <select className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm" value={meiType} onChange={(e) => setMeiType(e.target.value as 'comercio' | 'servico' | 'misto')}>
            <option value="comercio">Atividade: Comércio</option>
            <option value="servico">Atividade: Serviços</option>
            <option value="misto">Atividade: Misto</option>
          </select>
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-gray-600">Regime ativo: <span className="font-semibold text-gray-900">{pjFederalCalc.regime}</span></p>
            <p className="text-gray-600">Carga efetiva estimada: <span className="font-semibold text-gray-900">{(pjFederalCalc.effectiveRate * 100).toFixed(2)}%</span></p>
            <p className="text-gray-600">Tributos mensais estimados: <span className="font-semibold text-gray-900">{formatBRL(pjFederalCalc.monthlyTax)}</span></p>
            <p className="text-gray-600">Faturamento anual projetado: <span className="font-semibold text-gray-900">{formatBRL(pjFederalCalc.annualRevenue)}</span></p>
          </div>
          <div className="rounded-lg border border-gray-100 p-3">
            {pjFederalCalc.annualLimit ? (
              <p className={`text-sm ${pjFederalCalc.exceeded ? 'text-red-600' : 'text-emerald-600'}`}>
                {pjFederalCalc.exceeded
                  ? `Limite anual excedido (${formatBRL(pjFederalCalc.annualLimit)}).`
                  : `Dentro do limite anual (${formatBRL(pjFederalCalc.annualLimit)}).`}
              </p>
            ) : (
              <p className="text-gray-500">Regime sem limite anual fixo no cálculo simplificado.</p>
            )}
            <p className="text-xs text-gray-500 mt-2">Fontes open-data sem chave: Banco Central (SELIC, IPCA, CDI) e BrasilAPI (feriados).</p>
            {holidays.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">Próximo feriado: <strong>{holidays[0]?.name}</strong> ({new Date(holidays[0]?.date).toLocaleDateString('pt-BR')})</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Simulações educacionais para apoio de decisão de PF e PJ. Regras federais (INSS, IRRF, FGTS, Simples/MEI) mudam ao longo do tempo; valide decisões finais com contador, Receita Federal e instituição financeira.
      </p>
    </div>
  );
};

export default BrazilUseCases;
