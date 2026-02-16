import React, { useMemo, useState } from 'react';

type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

type YoutubeVideo = {
  title: string;
  url: string;
};

type YoutubeTopic = {
  title: string;
  url: string;
};

type YoutubeCourse = {
  level: CourseLevel;
  title: string;
  channel: string;
  url: string;
  videos: YoutubeVideo[];
  topics: YoutubeTopic[];
};

type SectionMeta = {
  id: string;
  title: string;
  description: string;
};

const ytSearchUrl = (query: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

const getYoutubeEmbedUrl = (url: string) => {
  const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watchMatch?.[1]) return `https://www.youtube.com/embed/${watchMatch[1]}?rel=0&modestbranding=1`;

  const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (shortMatch?.[1]) return `https://www.youtube.com/embed/${shortMatch[1]}?rel=0&modestbranding=1`;

  return '';
};

const sections: SectionMeta[] = [
  { id: 'bens-direitos', title: 'Bens e Direitos', description: 'Ações, FIIs, cripto, imóveis e veículos' },
  { id: 'rendimentos-isentos', title: 'Rendimentos Isentos', description: 'Dividendos, LCI/LCA e poupança' },
  { id: 'rendimentos-tributaveis', title: 'Rendimentos Tributáveis', description: 'Salário, aluguéis e rendas tributadas' },
  { id: 'tributacao-exclusiva', title: 'Tributação Exclusiva', description: 'Renda fixa e fundos com tributação na fonte' },
  { id: 'operacoes-bolsa', title: 'Operações em Bolsa', description: 'Ações, FIIs, day trade e DARF 6015' },
  { id: 'criptoativos', title: 'Criptoativos', description: 'Declaração e apuração de ganhos em cripto' },
];

const coursesBySection: Record<string, YoutubeCourse[]> = {
  'bens-direitos': [
    {
      level: 'beginner',
      title: 'IRPF: Bens e Direitos na prática',
      channel: 'Educação Fiscal BR',
      url: ytSearchUrl('IRPF bens e direitos passo a passo 2026'),
      videos: [
        { title: 'Bens e Direitos no IRPF', url: 'https://www.youtube.com/watch?v=enaV8ca9ECk' },
        { title: 'Como declarar ações e FIIs', url: 'https://www.youtube.com/watch?v=XuA6igKjaBU' },
      ],
      topics: [
        { title: 'Ficha Bens e Direitos', url: ytSearchUrl('ficha bens e direitos irpf') },
      ],
    },
  ],
  'rendimentos-isentos': [
    {
      level: 'beginner',
      title: 'Rendimentos Isentos no IRPF',
      channel: 'Tributação Descomplicada',
      url: ytSearchUrl('rendimentos isentos IRPF dividendos LCI LCA'),
      videos: [
        { title: 'Rendimentos isentos: guia', url: 'https://www.youtube.com/watch?v=-99Z7D5soeU' },
      ],
      topics: [
        { title: 'Dividendos e JCP no IRPF', url: ytSearchUrl('dividendos jcp onde declarar irpf') },
      ],
    },
  ],
  'rendimentos-tributaveis': [
    {
      level: 'beginner',
      title: 'Rendimentos Tributáveis',
      channel: 'Receita na Prática',
      url: ytSearchUrl('rendimentos tributáveis IRPF salário aluguel'),
      videos: [
        { title: 'Rendimentos tributáveis no IRPF', url: 'https://www.youtube.com/watch?v=dQnUvanrfBE' },
      ],
      topics: [
        { title: 'Carnê-leão para aluguéis', url: ytSearchUrl('aluguel carne leao irpf') },
      ],
    },
  ],
  'tributacao-exclusiva': [
    {
      level: 'intermediate',
      title: 'Tributação Exclusiva e Definitiva',
      channel: 'IR Investimentos BR',
      url: ytSearchUrl('tributação exclusiva definitiva IRPF investimentos'),
      videos: [
        { title: 'Tributação exclusiva explicada', url: 'https://www.youtube.com/watch?v=XneJkT1m6hA' },
      ],
      topics: [
        { title: 'Come-cotas em fundos', url: ytSearchUrl('come cotas fundos irpf') },
      ],
    },
  ],
  'operacoes-bolsa': [
    {
      level: 'advanced',
      title: 'IR para Ações, FIIs e Day Trade',
      channel: 'Bolsa e Imposto',
      url: ytSearchUrl('IR ações FIIs day trade DARF 6015'),
      videos: [
        { title: 'Day trade e imposto', url: 'https://www.youtube.com/watch?v=0MW20eVP3U8' },
        { title: 'DARF 6015 na prática', url: 'https://www.youtube.com/watch?v=OSxUi-8-uBo' },
      ],
      topics: [
        { title: 'Isenção de R$20 mil em ações', url: ytSearchUrl('isencao 20 mil ações imposto') },
      ],
    },
  ],
  criptoativos: [
    {
      level: 'advanced',
      title: 'Criptoativos no IRPF',
      channel: 'Cripto Tributação BR',
      url: ytSearchUrl('criptoativos IN 1888 declaração IRPF'),
      videos: [
        { title: 'Cripto e DARF 4600', url: 'https://www.youtube.com/watch?v=w_4qyOv03ik' },
      ],
      topics: [
        { title: 'Como declarar Bitcoin no IRPF', url: ytSearchUrl('como declarar bitcoin no irpf') },
      ],
    },
  ],
};

const sectionKeyAliases: Record<string, string> = {
  'bens-direitos': 'bens-direitos',
  'bens-e-direitos': 'bens-direitos',
  bensdireitos: 'bens-direitos',
  'rendimentos-isentos': 'rendimentos-isentos',
  rendimentosisentos: 'rendimentos-isentos',
  'rendimentos-tributaveis': 'rendimentos-tributaveis',
  'rendimentos-tributáveis': 'rendimentos-tributaveis',
  rendimentostributaveis: 'rendimentos-tributaveis',
  'tributacao-exclusiva': 'tributacao-exclusiva',
  'tributação-exclusiva': 'tributacao-exclusiva',
  tributacaoexclusiva: 'tributacao-exclusiva',
  'operacoes-bolsa': 'operacoes-bolsa',
  'operações-bolsa': 'operacoes-bolsa',
  operacoesbolsa: 'operacoes-bolsa',
  cripto: 'criptoativos',
  criptoativos: 'criptoativos',
};

const normalizeKey = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const resolveSectionKey = (section: SectionMeta) => {
  const candidates = [
    section.id,
    normalizeKey(section.id),
    section.id.replace(/-/g, ''),
    normalizeKey(section.title),
    normalizeKey(section.title).replace(/-/g, ''),
  ];

  for (const candidate of candidates) {
    const mapped = sectionKeyAliases[candidate] || sectionKeyAliases[normalizeKey(candidate)] || candidate;
    if (coursesBySection[mapped]) return mapped;
  }

  return section.id;
};

const TaxLearningCenter: React.FC = () => {
  const [courseLevelFilter, setCourseLevelFilter] = useState<'all' | CourseLevel>('all');
  const [playingVideo, setPlayingVideo] = useState<{ title: string; url: string; embedUrl: string } | null>(null);

  const sectionCourses = useMemo(() => (
    sections.map((section) => {
      const key = resolveSectionKey(section);
      const courses = (coursesBySection[key] || []).filter((course) => (
        courseLevelFilter === 'all' ? true : course.level === courseLevelFilter
      ));
      return { section, key, courses };
    })
  ), [courseLevelFilter]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-gray-900">Cursos YouTube por capítulo (IRPF)</h3>
          <p className="text-xs text-gray-500">Vídeos visíveis em cada capítulo com acesso direto e opção de assistir no app.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'beginner', label: 'Iniciante' },
            { id: 'intermediate', label: 'Intermediário' },
            { id: 'advanced', label: 'Avançado' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setCourseLevelFilter(filter.id as 'all' | CourseLevel)}
              className={`text-xs px-2.5 py-1.5 rounded border ${
                courseLevelFilter === filter.id
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {sectionCourses.map(({ section, courses }) => (
          <div key={section.id} className="border border-gray-200 rounded-lg p-3">
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-900">{section.title}</p>
              <p className="text-xs text-gray-500">{section.description}</p>
            </div>

            {courses.length === 0 ? (
              <p className="text-xs text-gray-500">Nenhum curso para o nível filtrado neste capítulo.</p>
            ) : (
              <div className="space-y-3">
                {courses.map((course, courseIdx) => (
                  <div key={`${section.id}-${courseIdx}`} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <div>
                        <p className="text-sm text-gray-900 font-medium">{course.title}</p>
                        <p className="text-xs text-gray-500">Canal: {course.channel}</p>
                      </div>
                      <a href={course.url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded border border-blue-200 text-blue-700 hover:bg-blue-50">
                        Vídeos similares
                      </a>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {course.videos.map((video, videoIdx) => {
                        const embedUrl = getYoutubeEmbedUrl(video.url);
                        return (
                          <div key={`${section.id}-${courseIdx}-${videoIdx}`} className="flex items-center gap-2">
                            <button
                              onClick={() => embedUrl ? setPlayingVideo({ title: video.title, url: video.url, embedUrl }) : window.open(video.url, '_blank', 'noopener,noreferrer')}
                              className="text-xs px-2 py-1 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            >
                              Assistir no app: {video.title}
                            </button>
                            <a href={video.url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50">
                              Abrir no YouTube
                            </a>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-1">
                      {course.topics.map((topic, topicIdx) => (
                        <a key={`${section.id}-${courseIdx}-topic-${topicIdx}`} href={topic.url} target="_blank" rel="noreferrer" className="block text-xs text-gray-700 hover:text-emerald-700">
                          • {topic.title}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
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
