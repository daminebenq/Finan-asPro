import React, { useState } from 'react';
import { useAppContext } from '@/contexts/app-context';
import { Shield, TrendingUp, PieChart, FileText, BookOpen, Calculator, BarChart3, ArrowRight, Check, Star, Users, Lock, Zap, Globe, ChevronDown, ChevronUp } from 'lucide-react';

const HERO_IMG = 'https://d64gsuwffb70l.cloudfront.net/6990a594106d3aee9db92ad9_1771087359457_dcfb486f.png';
const FEATURE_IMGS = [
  'https://d64gsuwffb70l.cloudfront.net/6990a594106d3aee9db92ad9_1771087381320_f0c45ca8.png',
  'https://d64gsuwffb70l.cloudfront.net/6990a594106d3aee9db92ad9_1771087376867_a42cc141.jpg',
  'https://d64gsuwffb70l.cloudfront.net/6990a594106d3aee9db92ad9_1771087380251_fe673ecb.png',
];

const LandingPage: React.FC = () => {
  const { setShowAuthModal, setAuthMode, plans } = useAppContext();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const openSignup = () => { setAuthMode('signup'); setShowAuthModal(true); };
  const openLogin = () => { setAuthMode('login'); setShowAuthModal(true); };

  const features = [
    { icon: PieChart, title: 'Controle de Gastos', desc: 'Categorize automaticamente suas despesas seguindo padrões da Receita Federal brasileira.' },
    { icon: TrendingUp, title: 'Investimentos', desc: 'Acompanhe Tesouro Direto, CDB, LCI/LCA, ações, FIIs e ETFs em um só lugar.' },
    { icon: FileText, title: 'Importação Bancária', desc: 'Importe extratos OFX/CSV de Nubank, Itaú, Bradesco, BB e Santander.' },
    { icon: Calculator, title: 'Simulador IR', desc: 'Calcule impostos sobre investimentos e simule declaração de IR automaticamente.' },
    { icon: BookOpen, title: 'Educação Financeira', desc: 'Conteúdo personalizado para iniciantes, intermediários e profissionais.' },
    { icon: BarChart3, title: 'Relatórios Avançados', desc: 'Gráficos interativos e relatórios detalhados sobre sua saúde financeira.' },
    { icon: Shield, title: 'Segurança Bancária', desc: 'Criptografia de ponta a ponta e conformidade com LGPD e regulações CVM.' },
    { icon: Zap, title: 'Alertas Inteligentes', desc: 'Notificações sobre vencimentos, metas atingidas e oportunidades de investimento.' },
  ];

  const testimonials = [
    { name: 'Ana Silva', role: 'Investidora Iniciante', text: 'Finalmente entendi como funciona o Tesouro Direto! A plataforma me guiou passo a passo.', rating: 5 },
    { name: 'Carlos Mendes', role: 'Analista Financeiro', text: 'A importação de extratos bancários economiza horas do meu trabalho mensal.', rating: 5 },
    { name: 'Mariana Costa', role: 'Empreendedora', text: 'Os relatórios fiscais me ajudaram a organizar minha declaração de IR sem dor de cabeça.', rating: 5 },
  ];

  const faqs = [
    { q: 'O FinBR é seguro para minhas informações financeiras?', a: 'Sim! Utilizamos criptografia AES-256 e seguimos todas as normas da LGPD. Seus dados são protegidos com o mesmo nível de segurança dos grandes bancos brasileiros.' },
    { q: 'Posso importar dados de qualquer banco?', a: 'Atualmente suportamos importação OFX e CSV dos principais bancos: Nubank, Itaú, Bradesco, Banco do Brasil e Santander. Estamos constantemente adicionando novos bancos.' },
    { q: 'Como funciona o cálculo de IR sobre investimentos?', a: 'Nossa ferramenta calcula automaticamente o imposto de renda sobre seus investimentos, considerando as alíquotas regressivas de renda fixa, isenções de LCI/LCA, e o DARF mensal para renda variável.' },
    { q: 'Posso cancelar meu plano a qualquer momento?', a: 'Sim! Não há fidelidade. Você pode cancelar, fazer upgrade ou downgrade do seu plano quando quiser. O acesso continua até o fim do período pago.' },
    { q: 'O plano gratuito tem limitações?', a: 'O plano gratuito permite até 50 transações por mês e 5 investimentos cadastrados. Para uso mais intenso, recomendamos os planos pagos.' },
  ];

  const stats = [
    { value: '50K+', label: 'Usuários Ativos' },
    { value: 'R$2B+', label: 'Patrimônio Gerenciado' },
    { value: '99.9%', label: 'Uptime' },
    { value: '4.9/5', label: 'Avaliação' },
  ];

  const planColors: Record<string, string> = {
    free: 'from-gray-500 to-gray-600',
    essencial: 'from-blue-500 to-blue-600',
    profissional: 'from-emerald-500 to-teal-600',
    expert: 'from-purple-500 to-indigo-600',
  };

  const planBadge: Record<string, string> = {
    profissional: 'Mais Popular',
  };

  const asNumber = (value: unknown): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f1729] via-[#1a2332] to-[#0d2137] min-h-[90vh] flex items-center">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-400 rounded-full blur-[150px]" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500 rounded-full blur-[100px]" />
        </div>
        <div className="max-w-7xl mx-auto px-6 py-20 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
              <Shield size={16} className="text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">Conforme CVM & LGPD</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
              Suas finanças sob <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">controle total</span>
            </h1>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed max-w-lg">
              Plataforma completa de gestão financeira pessoal adaptada à legislação brasileira. 
              Controle gastos, investimentos e impostos em um só lugar.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={openSignup}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center gap-2 text-lg">
                Começar Grátis <ArrowRight size={20} />
              </button>
              <button onClick={openLogin}
                className="px-8 py-4 border border-gray-600 text-gray-300 rounded-xl font-semibold hover:bg-white/5 transition-all text-lg">
                Já tenho conta
              </button>
            </div>
            <div className="flex items-center gap-6 mt-8">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-[#1a2332] bg-gradient-to-br ${i===1?'from-pink-400 to-rose-500':i===2?'from-blue-400 to-indigo-500':i===3?'from-emerald-400 to-teal-500':'from-amber-400 to-orange-500'}`} />
                ))}
              </div>
              <p className="text-gray-400 text-sm">
                <span className="text-white font-semibold">50.000+</span> brasileiros já usam
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/10 border border-white/10">
              <img src={HERO_IMG} alt="Dashboard FinBR" className="w-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a2332] via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Rendimento Mensal</p>
                  <p className="text-emerald-400 font-bold">+1.23%</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Lock size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Dados Seguros</p>
                  <p className="text-blue-400 font-bold text-xs">AES-256</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                <p className="text-gray-500 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">Funcionalidades</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">Tudo que você precisa para suas finanças</h2>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto">Ferramentas profissionais adaptadas ao mercado financeiro brasileiro, desde o controle básico até análises avançadas de investimentos.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 group">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon size={24} className="text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">Como Funciona</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">Comece em 3 passos simples</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Crie sua conta', desc: 'Cadastre-se gratuitamente em menos de 2 minutos. Informe seu CPF e nível de experiência.', img: FEATURE_IMGS[0] },
              { step: '02', title: 'Importe seus dados', desc: 'Conecte seus bancos ou importe extratos OFX/CSV. Categorização automática inclusa.', img: FEATURE_IMGS[1] },
              { step: '03', title: 'Controle tudo', desc: 'Acompanhe gastos, investimentos e metas em um dashboard personalizado.', img: FEATURE_IMGS[2] },
            ].map((s, i) => (
              <div key={i} className="relative group">
                <div className="rounded-2xl overflow-hidden mb-6 border border-gray-100">
                  <img src={s.img} alt={s.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-5xl font-bold text-emerald-100">{s.step}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">{s.title}</h3>
                    <p className="text-gray-500 text-sm">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50" id="pricing">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">Planos</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">Escolha o plano ideal para você</h2>
            <div className="inline-flex items-center gap-3 mt-6 bg-white rounded-full p-1 border border-gray-200">
              <button onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Mensal
              </button>
              <button onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'yearly' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                Anual <span className="text-emerald-600 text-xs ml-1">-17%</span>
              </button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isPopular = planBadge[plan.slug];
              const monthlyPrice = asNumber(plan.price_monthly);
              const yearlyPrice = asNumber(plan.price_yearly);
              const price = billingCycle === 'monthly' ? monthlyPrice : (yearlyPrice / 12);
              return (
                <div key={plan.id} className={`relative bg-white rounded-2xl p-6 border-2 transition-all hover:shadow-xl ${isPopular ? 'border-emerald-500 shadow-lg' : 'border-gray-100'}`}>
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full">
                      {isPopular}
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${planColors[plan.slug] || 'from-gray-500 to-gray-600'} flex items-center justify-center mb-4`}>
                    {plan.slug === 'free' ? <Users size={24} className="text-white" /> :
                     plan.slug === 'essencial' ? <BarChart3 size={24} className="text-white" /> :
                     plan.slug === 'profissional' ? <TrendingUp size={24} className="text-white" /> :
                     <Star size={24} className="text-white" />}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-3 mb-4">
                    {monthlyPrice === 0 ? (
                      <span className="text-3xl font-bold text-gray-900">Grátis</span>
                    ) : (
                      <div>
                        <span className="text-3xl font-bold text-gray-900">R${price.toFixed(2).replace('.', ',')}</span>
                        <span className="text-gray-500 text-sm">/mês</span>
                        {billingCycle === 'yearly' && (
                          <p className="text-xs text-emerald-600 mt-1">R${yearlyPrice.toFixed(2).replace('.', ',')} /ano</p>
                        )}
                      </div>
                    )}
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={openSignup}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${
                      isPopular
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-lg hover:shadow-emerald-500/25'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}>
                    {monthlyPrice === 0 ? 'Começar Grátis' : 'Assinar Agora'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">Depoimentos</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-3">O que nossos usuários dizem</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={18} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${i===0?'from-pink-400 to-rose-500':i===1?'from-blue-400 to-indigo-500':'from-emerald-400 to-teal-500'} flex items-center justify-center text-white font-bold text-sm`}>
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-emerald-600 font-semibold text-sm uppercase tracking-wider">FAQ</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-3">Perguntas Frequentes</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-gray-900">{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-gray-500 text-sm leading-relaxed border-t border-gray-50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-[#0f1729] to-[#1a2332]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Pronto para transformar suas finanças?</h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">Junte-se a mais de 50.000 brasileiros que já estão no controle da sua vida financeira.</p>
          <button onClick={openSignup}
            className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all text-lg inline-flex items-center gap-2">
            Criar Conta Gratuita <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0f1a] text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <span className="text-xl font-bold text-white">Fin<span className="text-emerald-500">BR</span></span>
              </div>
              <p className="text-sm leading-relaxed">Plataforma de gestão financeira pessoal adaptada às leis brasileiras. Conforme CVM e LGPD.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-emerald-400 transition-colors">Funcionalidades</button></li>
                <li><button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-emerald-400 transition-colors">Planos</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">Segurança</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">Integrações</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Recursos</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-emerald-400 transition-colors">Blog</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">Educação Financeira</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">Calculadoras</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">API Docs</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-emerald-400 transition-colors">Termos de Uso</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">Política de Privacidade</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">LGPD</button></li>
                <li><button className="hover:text-emerald-400 transition-colors">Contato</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2026 FinBR. Todos os direitos reservados. CNPJ: 00.000.000/0001-00</p>
            <div className="flex items-center gap-4">
              <Globe size={16} /> <span className="text-sm">Feito no Brasil</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
