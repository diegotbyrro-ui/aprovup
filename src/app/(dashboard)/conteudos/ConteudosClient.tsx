import Link from 'next/link';

type ConteudoItem = {
  id: string;
  title?: string | null;
  caption?: string | null;
  status?: string | null;
  area?: string | null;
  format?: string | null;
  platform?: string | null;
  priority?: string | null;
  plannedDate?: Date | string | null;
  publishDate?: Date | string | null;
  createdAt?: Date | string | null;
  client?: {
    name?: string | null;
  } | null;
};

function formatDate(value?: Date | string | null) {
  if (!value) return 'Sem data';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sem data';
  }

  return date.toLocaleDateString('pt-BR');
}

function label(value?: string | null) {
  if (!value) return 'Não informado';

  const labels: Record<string, string> = {
    SOCIAL_MEDIA: 'Social Media',
    DESIGN: 'Design',
    FILMMAKER: 'Filmaker',
    RASCUNHO: 'Rascunho',
    EM_PRODUCAO: 'Em produção',
    EM_APROVACAO: 'Em aprovação',
    APROVADO: 'Aprovado',
    ALTERACAO_SOLICITADA: 'Alteração solicitada',
    ENVIADO_AO_CLIENTE: 'Enviado ao cliente',
    PRONTO_PARA_POSTAR: 'Pronto para postar',
    POST_ESTATICO: 'Post estático',
    CARROSSEL: 'Carrossel',
    REELS: 'Reels',
    STORY: 'Story',
    VIDEO: 'Vídeo',
    ALTA: 'Alta',
    MEDIA: 'Média',
    BAIXA: 'Baixa',
  };

  return labels[value] || value.replaceAll('_', ' ');
}

export default function ConteudosClient({
  contents = [],
  clients = [],
}: {
  contents?: ConteudoItem[];
  clients?: Array<{ id: string; name?: string | null }>;
}) {
  void clients;
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
          Conteúdos
        </p>

        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Biblioteca de conteúdos
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
              Acompanhe os conteúdos planejados, em aprovação e em produção.
            </p>
          </div>

          <Link
            href="/conteudos/novo"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
          >
            Novo conteúdo
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {contents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <h2 className="text-lg font-bold text-slate-900">
              Nenhum conteúdo encontrado
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Crie um conteúdo ou acesse um cliente para planejar o calendário.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {contents.map((content) => (
              <Link
                key={content.id}
                href={`/conteudos/${content.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {label(content.area)}
                  </span>

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    {label(content.status)}
                  </span>

                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                    {label(content.priority)}
                  </span>
                </div>

                <h2 className="mt-4 line-clamp-2 text-lg font-bold text-slate-900">
                  {content.title || 'Conteúdo sem título'}
                </h2>

                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">
                  {content.caption || 'Sem legenda cadastrada.'}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <p>
                    <strong className="text-slate-700">Cliente:</strong>{' '}
                    {content.client?.name || 'Não informado'}
                  </p>

                  <p>
                    <strong className="text-slate-700">Formato:</strong>{' '}
                    {label(content.format)}
                  </p>

                  <p>
                    <strong className="text-slate-700">Plataforma:</strong>{' '}
                    {label(content.platform)}
                  </p>

                  <p>
                    <strong className="text-slate-700">Data:</strong>{' '}
                    {formatDate(content.publishDate || content.plannedDate || content.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
