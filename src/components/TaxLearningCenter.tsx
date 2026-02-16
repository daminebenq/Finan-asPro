import React, { useMemo, useState } from 'react';

type LearningLevel = 'beginner' | 'intermediate' | 'advanced';

type YoutubeVideo = {
  title: string;
  url: string;
};

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
};

type LearningItem = {
  id: string;
  title: string;
  description: string;
  guide: string[];
  videos: YoutubeVideo[];
  quiz: QuizQuestion[];
};

type LearningTrack = {
  id: LearningLevel;
  title: string;
  subtitle: string;
  items: LearningItem[];
};

const getYoutubeEmbedUrl = (url: string) => {
  const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watchMatch?.[1]) return `https://www.youtube.com/embed/${watchMatch[1]}?rel=0&modestbranding=1`;

  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch?.[1]) return `https://www.youtube.com/embed/${shortMatch[1]}?rel=0&modestbranding=1`;

  return '';
};

const learningTracks: LearningTrack[] = [
  {
    id: 'beginner',
    title: 'Iniciante',
    subtitle: 'Base sólida: orçamento, reserva e primeiros investimentos',
    items: [
      {
        id: 'beg-orcamento',
        title: 'Orçamento e organização financeira',
        description: 'Monte orçamento mensal e controle entradas/saídas de forma prática.',
        guide: [
          'Mapeie receitas fixas e variáveis.',
          'Classifique despesas essenciais e não essenciais.',
          'Defina teto mensal por categoria.',
          'Revise o orçamento no fechamento do mês.',
        ],
        videos: [
          { title: 'Orçamento pessoal na prática', url: 'https://www.youtube.com/watch?v=ZdR6f6x1f8Q' },
          { title: 'Método 50-30-20 no Brasil', url: 'https://www.youtube.com/watch?v=9TL7nQRPfI8' },
        ],
        quiz: [
          {
            question: 'No método 50-30-20, qual parte é voltada para necessidades?',
            options: ['50%', '30%', '20%'],
            correctIndex: 0,
          },
          {
            question: 'Qual ação deve ocorrer todo mês para manter o orçamento útil?',
            options: ['Revisão mensal', 'Trocar de banco', 'Criar novo CPF'],
            correctIndex: 0,
          },
        ],
      },
      {
        id: 'beg-reserva',
        title: 'Reserva de emergência',
        description: 'Defina meta e alocação segura para imprevistos.',
        guide: [
          'Calcule seu custo fixo mensal.',
          'Defina meta entre 6 e 12 meses de custo.',
          'Priorize liquidez diária e baixo risco.',
          'Automatize aportes mensais.',
        ],
        videos: [
          { title: 'Como montar reserva de emergência', url: 'https://www.youtube.com/watch?v=jxLF7Lk5a4Q' },
        ],
        quiz: [
          {
            question: 'A principal característica da reserva de emergência é:',
            options: ['Alta liquidez', 'Maior risco possível', 'Prazo acima de 10 anos'],
            correctIndex: 0,
          },
        ],
      },
      {
        id: 'beg-rendafixa',
        title: 'Primeiros passos em renda fixa',
        description: 'Entenda CDB, LCI/LCA e Tesouro para começar com segurança.',
        guide: [
          'Compare liquidez, rentabilidade e risco.',
          'Diferencie pós-fixado, prefixado e IPCA.',
          'Avalie proteção FGC quando aplicável.',
          'Escolha produtos aderentes ao objetivo.',
        ],
        videos: [
          { title: 'Renda fixa para iniciantes', url: 'https://www.youtube.com/watch?v=EJx9rDoD4lY' },
        ],
        quiz: [
          {
            question: 'LCI/LCA para pessoa física geralmente é:',
            options: ['Isento de IR', 'Taxado em 27,5%', 'Sempre de alto risco'],
            correctIndex: 0,
          },
        ],
      },
    ],
  },
  {
    id: 'intermediate',
    title: 'Intermediário',
    subtitle: 'Construção de carteira, IR em investimentos e gestão de risco',
    items: [
      {
        id: 'int-diversificacao',
        title: 'Diversificação de carteira',
        description: 'Distribua risco entre classes para mais consistência no longo prazo.',
        guide: [
          'Defina perfil de risco e horizonte.',
          'Distribua entre renda fixa e variável.',
          'Evite concentração excessiva em um ativo.',
          'Rebalanceie periodicamente.',
        ],
        videos: [
          { title: 'Diversificação de carteira no Brasil', url: 'https://www.youtube.com/watch?v=G19w3K5V9XI' },
        ],
        quiz: [
          {
            question: 'Diversificação ajuda principalmente a:',
            options: ['Reduzir risco específico', 'Eliminar todos os riscos', 'Aumentar taxas bancárias'],
            correctIndex: 0,
          },
        ],
      },
      {
        id: 'int-ir',
        title: 'Imposto de renda em investimentos',
        description: 'Domine regras essenciais de tributação e declaração.',
        guide: [
          'Conheça alíquotas por tipo de investimento.',
          'Identifique isenções aplicáveis.',
          'Acompanhe notas e informes de rendimentos.',
          'Organize apuração mensal quando necessário.',
        ],
        videos: [
          { title: 'IR em investimentos: guia prático', url: 'https://www.youtube.com/watch?v=NYepMGr5_Pw' },
          { title: 'Como declarar ações e FIIs', url: 'https://www.youtube.com/watch?v=XuA6igKjaBU' },
        ],
        quiz: [
          {
            question: 'Em operações comuns com ações, existe isenção mensal até:',
            options: ['R$ 20 mil em vendas', 'R$ 2 mil em lucro', 'R$ 100 mil em patrimônio'],
            correctIndex: 0,
          },
          {
            question: 'Para organizar IR, o mais importante é:',
            options: ['Guardar notas e informes', 'Acompanhar boatos de mercado', 'Mudar de corretora todo mês'],
            correctIndex: 0,
          },
        ],
      },
      {
        id: 'int-fiis',
        title: 'FIIs e renda passiva',
        description: 'Avalie fundos imobiliários com visão de renda e risco.',
        guide: [
          'Entenda tipos de FIIs (tijolo, papel, híbrido).',
          'Acompanhe vacância, dividend yield e gestão.',
          'Avalie diversificação setorial e geográfica.',
          'Considere cenário de juros na análise.',
        ],
        videos: [
          { title: 'Fundos imobiliários para intermediário', url: 'https://www.youtube.com/watch?v=H3RCgkzgtVo' },
        ],
        quiz: [
          {
            question: 'Um indicador relevante em FIIs é:',
            options: ['Vacância', 'Número do RG', 'IPVA do gestor'],
            correctIndex: 0,
          },
        ],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Avançado',
    subtitle: 'Estratégias avançadas, proteção e otimização fiscal',
    items: [
      {
        id: 'adv-opcoes',
        title: 'Estratégias com opções e proteção',
        description: 'Use opções com foco em gestão de risco e proteção de carteira.',
        guide: [
          'Entenda calls, puts e principais gregas.',
          'Defina objetivo: hedge, renda ou especulação.',
          'Avalie custo de proteção e cenário de mercado.',
          'Controle exposição e tamanho de posição.',
        ],
        videos: [
          { title: 'Opções para proteção de carteira', url: 'https://www.youtube.com/watch?v=97PG2mL2W7A' },
        ],
        quiz: [
          {
            question: 'Uso clássico de opções em carteira é:',
            options: ['Hedge de risco', 'Substituir reserva de emergência', 'Eliminar necessidade de gestão'],
            correctIndex: 0,
          },
        ],
      },
      {
        id: 'adv-cripto',
        title: 'Criptoativos e compliance fiscal',
        description: 'Aplique governança e controle de risco para ativos digitais.',
        guide: [
          'Registre histórico de operações e custos.',
          'Acompanhe regras de declaração e apuração.',
          'Defina limites de exposição em carteira.',
          'Revise segurança operacional e custódia.',
        ],
        videos: [
          { title: 'Cripto e imposto de renda', url: 'https://www.youtube.com/watch?v=w_4qyOv03ik' },
        ],
        quiz: [
          {
            question: 'Em cripto, o controle de histórico é crucial para:',
            options: ['Apuração fiscal correta', 'Aumentar alavancagem sem limite', 'Ignorar gestão de risco'],
            correctIndex: 0,
          },
        ],
      },
      {
        id: 'adv-prev',
        title: 'Previdência e eficiência tributária',
        description: 'Compare estratégias de previdência e impacto tributário no longo prazo.',
        guide: [
          'Compare PGBL e VGBL por perfil.',
          'Avalie regime progressivo vs regressivo.',
          'Projete horizonte e necessidade de liquidez.',
          'Monitore custos e performance dos fundos.',
        ],
        videos: [
          { title: 'PGBL vs VGBL explicado', url: 'https://www.youtube.com/watch?v=6SVTL4vYRaA' },
        ],
        quiz: [
          {
            question: 'A escolha entre PGBL e VGBL depende principalmente de:',
            options: ['Perfil tributário e planejamento', 'Sorte do mercado no dia', 'Quantidade de apps instalados'],
            correctIndex: 0,
          },
        ],
      },
    ],
  },
];

const TaxLearningCenter: React.FC = () => {
  const [playingVideo, setPlayingVideo] = useState<{ title: string; url: string; embedUrl: string } | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<Record<string, boolean>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<number, number>>>({});
  const [quizPassed, setQuizPassed] = useState<Record<string, boolean>>({});
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const allItems = useMemo(() => learningTracks.flatMap((track) => track.items), []);
  const doneCount = allItems.filter((item) => completedItems[item.id]).length;

  const getVideoKey = (itemId: string, videoIndex: number) => `${itemId}::video::${videoIndex}`;

  const isVideosReady = (item: LearningItem) => item.videos.every((_video, videoIndex) => watchedVideos[getVideoKey(item.id, videoIndex)]);
  const isItemReady = (item: LearningItem) => isVideosReady(item) && Boolean(quizPassed[item.id]);

  const handleQuizAnswer = (itemId: string, questionIndex: number, optionIndex: number) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [questionIndex]: optionIndex,
      },
    }));
  };

  const handleSubmitQuiz = (item: LearningItem) => {
    const answers = quizAnswers[item.id] || {};
    const allAnswered = item.quiz.every((_question, index) => typeof answers[index] === 'number');
    if (!allAnswered) return;

    const approved = item.quiz.every((question, index) => answers[index] === question.correctIndex);
    if (!approved) return;

    setQuizPassed((prev) => ({ ...prev, [item.id]: true }));
  };

  const markVideoWatched = (itemId: string, videoIndex: number) => {
    setWatchedVideos((prev) => ({ ...prev, [getVideoKey(itemId, videoIndex)]: true }));
  };

  const markItemCompleted = (item: LearningItem) => {
    if (!isItemReady(item)) return;
    setCompletedItems((prev) => ({ ...prev, [item.id]: true }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
      <div>
        <h3 className="font-semibold text-gray-900">Centro de Aprendizado</h3>
        <p className="text-xs text-gray-500 mt-1">Cada item exige: assistir todos os vídeos + aprovação no quiz para liberar conclusão.</p>
        <p className="text-xs text-emerald-700 mt-2">Progresso geral: {doneCount}/{allItems.length} itens concluídos</p>
      </div>

      <div className="space-y-4">
        {learningTracks.map((track) => {
          const trackDone = track.items.filter((item) => completedItems[item.id]).length;
          return (
            <div key={track.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Nível {track.title}</p>
                <p className="text-xs text-gray-500">{track.subtitle}</p>
                <p className="text-xs text-gray-600 mt-1">Concluídos: {trackDone}/{track.items.length}</p>
              </div>

              <div className="space-y-3">
                {track.items.map((item) => {
                  const videosReady = isVideosReady(item);
                  const passed = Boolean(quizPassed[item.id]);
                  const done = Boolean(completedItems[item.id]);
                  return (
                    <div key={item.id} className="border border-gray-100 rounded-lg p-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                        </div>
                        <span className={`text-[11px] px-2 py-1 rounded border ${done ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-gray-200 text-gray-600'}`}>
                          {done ? 'Concluído' : 'Em andamento'}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-800 mb-1">Guia de aprendizagem</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {item.guide.map((step, stepIndex) => (
                            <li key={`${item.id}-step-${stepIndex}`} className="text-xs text-gray-600">{step}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-800 mb-1">Vídeos obrigatórios</p>
                        <div className="space-y-2">
                          {item.videos.map((video, videoIndex) => {
                            const watched = Boolean(watchedVideos[getVideoKey(item.id, videoIndex)]);
                            const embedUrl = getYoutubeEmbedUrl(video.url);
                            return (
                              <div key={`${item.id}-video-${videoIndex}`} className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => embedUrl ? setPlayingVideo({ title: video.title, url: video.url, embedUrl }) : window.open(video.url, '_blank', 'noopener,noreferrer')}
                                  className="text-xs px-2 py-1 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                >
                                  Assistir no app: {video.title}
                                </button>
                                <a href={video.url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50">
                                  Abrir no YouTube
                                </a>
                                <button
                                  onClick={() => markVideoWatched(item.id, videoIndex)}
                                  className={`text-xs px-2 py-1 rounded border ${watched ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}`}
                                >
                                  {watched ? 'Assistido' : 'Marcar como assistido'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border border-gray-100 rounded p-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-800">Quiz obrigatório</p>
                          <span className={`text-[11px] px-2 py-1 rounded border ${passed ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-gray-200 text-gray-600'}`}>
                            {passed ? 'Aprovado' : 'Pendente'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {item.quiz.map((question, questionIndex) => (
                            <div key={`${item.id}-quiz-${questionIndex}`} className="border border-gray-100 rounded p-2">
                              <p className="text-xs text-gray-700 mb-1">{questionIndex + 1}. {question.question}</p>
                              <div className="space-y-1">
                                {question.options.map((option, optionIndex) => (
                                  <label key={`${item.id}-quiz-${questionIndex}-opt-${optionIndex}`} className="flex items-center gap-2 text-xs text-gray-600">
                                    <input
                                      type="radio"
                                      name={`${item.id}-quiz-${questionIndex}`}
                                      checked={quizAnswers[item.id]?.[questionIndex] === optionIndex}
                                      disabled={passed}
                                      onChange={() => handleQuizAnswer(item.id, questionIndex, optionIndex)}
                                    />
                                    {option}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => handleSubmitQuiz(item)}
                          disabled={passed || !videosReady}
                          className={`text-xs px-3 py-1.5 rounded border ${
                            passed || !videosReady
                              ? 'border-gray-200 text-gray-500 opacity-70 cursor-not-allowed'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {passed ? 'Quiz aprovado' : 'Enviar quiz'}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-600">
                          {!videosReady && 'Assista e marque todos os vídeos para liberar o quiz.'}
                          {videosReady && !passed && 'Vídeos concluídos. Falta aprovação no quiz.'}
                          {videosReady && passed && !done && 'Item liberado para conclusão.'}
                          {done && 'Item finalizado com sucesso.'}
                        </p>
                        <button
                          onClick={() => markItemCompleted(item)}
                          disabled={done || !isItemReady(item)}
                          className={`text-xs px-3 py-1.5 rounded border ${
                            done || !isItemReady(item)
                              ? 'border-gray-200 text-gray-500 opacity-70 cursor-not-allowed'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {done ? 'Concluído' : 'Concluir item'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {playingVideo && (
        <div className="fixed inset-0 z-[100] bg-black/70 p-4 flex items-center justify-center" onClick={() => setPlayingVideo(null)}>
          <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-900 truncate">{playingVideo.title}</p>
              <button onClick={() => setPlayingVideo(null)} className="text-gray-500 hover:text-gray-700 text-sm">Fechar</button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={playingVideo.embedUrl}
                title={playingVideo.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="px-4 py-3 border-t border-gray-200">
              <a href={playingVideo.url} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 hover:text-emerald-800">
                Abrir este vídeo diretamente no YouTube
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxLearningCenter;
