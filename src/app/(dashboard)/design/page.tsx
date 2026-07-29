import { formatLabel } from '@/lib/formatLabel';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  MoreHorizontal,
  Palette,
  Pencil,
  Pin,
  Send,
  Trash2,
} from 'lucide-react';
import {
  archiveDesignColumnAction,
  createDesignColumnAction,
  moveDesignColumnAction,
  sendDesignQuestionAction,
  updateDesignColumnTitleAction,
} from './actions';
import { DraggableDesignCard, DroppableDesignColumn } from './DraggableDesignCard';
function formatDate(date?: Date | null) {
  if (!date) return 'Sem data';

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getInitials(name?: string | null) {
  const value = String(name || 'C').trim();

  return value
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function getColumnDescription(statusKey: string, title: string) {
  const descriptions: Record<string, string> = {
    APROVADO: 'Aprovadas e liberadas para design.',
    DESIGN_FAZENDO: 'Em produção pelo designer.',
    DESIGN_ANALISE: 'Aguardando conferência.',
    DESIGN_DUVIDA: 'Aguardando resposta da Social Media.',
    'PRONTO_PARA_POSTAR': 'Pronto para postagem.',
  };

  return descriptions[statusKey] || `Coluna personalizada: ${title}.`;
}

function ColumnMenu({ column }: { column: any }) {
  return (
    <details className="relative">
      <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <MoreHorizontal size={18} />
      </summary>

      <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <form action={updateDesignColumnTitleAction.bind(null, column.id)} className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Editar nome da coluna
          </label>

          <input
            name="title"
            defaultValue={column.title}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            <Pencil size={15} />
            Salvar nome
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <form action={moveDesignColumnAction.bind(null, column.id, 'left')}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Esquerda
            </button>
          </form>

          <form action={moveDesignColumnAction.bind(null, column.id, 'right')}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Direita
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        <form action={archiveDesignColumnAction.bind(null, column.id)} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-100"
          >
            <Trash2 size={16} />
            Excluir coluna
          </button>
        </form>

        <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs font-medium leading-relaxed text-blue-700">
          Para trocar a posição, use os botões de esquerda/direita. Para mover demandas, arraste o card entre as colunas.
        </p>
      </div>
    </details>
  );
}

function ClientAssetCard({ client }: { client: any }) {
  const databaseLink = client.databaseLink || '';
  const driveLink = client.driveLink || '';
  const logoLink = client.logoLink || client.logoUrl || '';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
          {getInitials(client.name)}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">
            {client.name}
          </p>

          <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">
            {client.segment || 'Sem segmento definido'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {databaseLink ? (
          <a
            href={databaseLink}
            target="_blank"
            className="rounded-xl bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-100"
          >
            Banco de dados
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-400">
            Banco de dados não cadastrado
          </div>
        )}

        {driveLink ? (
          <a
            href={driveLink}
            target="_blank"
            className="rounded-xl bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-100"
          >
            Drive
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-400">
            Drive não cadastrado
          </div>
        )}

        {logoLink ? (
          <a
            href={logoLink}
            target="_blank"
            className="rounded-xl bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-100"
          >
            Logo
          </a>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-center text-xs font-bold text-slate-400">
            Logo não cadastrado
          </div>
        )}
      </div>
    </div>
  );
}

function DesignCard({ content }: { content: any }) {
  const clientName = content.client?.name || 'Cliente';

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-28 items-center justify-center bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
        {content.coverUrl ? (
          <img
            src={content.coverUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          'Sem capa'
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="line-clamp-2 text-sm font-bold text-slate-900">
              {content.title}
            </h3>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              {clientName}
            </p>
          </div>

          {content.plannedDate && new Date(content.plannedDate) < new Date() && (
            <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold uppercase text-red-600">
              Atrasado
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {formatDate(content.plannedDate)}
          </span>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {content.format || 'Design'}
          </span>
        </div>

        {(content.objective || content.briefing) && (
          <div className="line-clamp-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            {content.objective || content.briefing}
          </div>
        )}

        <details className="rounded-xl border border-amber-100 bg-amber-50 p-3">
          <summary className="cursor-pointer list-none text-xs font-bold text-amber-800 [&::-webkit-details-marker]:hidden">
            Tenho dúvida para Social Media
          </summary>

          <form action={sendDesignQuestionAction.bind(null, content.id)} className="mt-3 space-y-2">
            <textarea
              name="message"
              rows={3}
              placeholder="Escreva a dúvida..."
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            />

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-3 text-xs font-bold text-white hover:bg-amber-600"
            >
              <Send size={14} />
              Enviar dúvida
            </button>
          </form>
        </details>

        <Link
          href={`/conteudos/${content.id}/visualizar`}
          className="block rounded-xl bg-slate-900 px-4 py-3 text-center text-xs font-bold text-white hover:bg-slate-800"
        >
          Abrir conteúdo
        </Link>
      </div>
    </article>
  );
}

function MetricCard({
  title,
  value,
  description,
  tone = 'white',
}: {
  title: string;
  value: string | number;
  description: string;
  tone?: 'white' | 'blue' | 'yellow' | 'red' | 'green';
}) {
  const styles = {
    white: 'border-slate-200 bg-white text-slate-900',
    blue: 'border-blue-100 bg-blue-50 text-blue-800',
    yellow: 'border-yellow-100 bg-yellow-50 text-yellow-800',
    red: 'border-red-100 bg-red-50 text-red-800',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  };

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${styles[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-3 text-sm font-medium opacity-75">
        {description}
      </p>
    </div>
  );
}

export default async function DesignPage() {
  await requireCurrentUser();

  const columnCount = await prisma.designKanbanColumn.count();

  if (columnCount === 0) {
    await prisma.designKanbanColumn.createMany({
      data: [
        {
          title: 'Demandas',
          statusKey: 'APROVADO',
          order: 1,
          isActive: true,
        },
        {
          title: 'Fazendo',
          statusKey: 'DESIGN_FAZENDO',
          order: 2,
          isActive: true,
        },
        {
          title: 'Análise',
          statusKey: 'DESIGN_ANALISE',
          order: 3,
          isActive: true,
        },
        {
          title: 'Dúvidas',
          statusKey: 'DESIGN_DUVIDA',
          order: 4,
          isActive: true,
        },
        {
          title: 'Finalizado',
          statusKey: 'PRONTO_PARA_POSTAR',
          order: 5,
          isActive: true,
        },
      ],
    });
  }

  const columns = await prisma.designKanbanColumn.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      order: 'asc',
    },
  });

  const statusKeys = columns.map((column) => column.statusKey);

  const contents = await prisma.content.findMany({
    where: {
      area: 'DESIGN',
      status: {
        in: statusKeys,
      },
    },
    include: {
      client: true,
    },
    orderBy: [
      {
        plannedDate: 'asc',
      },
      {
        createdAt: 'desc',
      },
    ],
  });

  const clients: any[] = await prisma.client.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  const doingCount = contents.filter((content) => content.status === 'DESIGN_FAZENDO').length;
  const analysisCount = contents.filter((content) => content.status === 'DESIGN_ANALISE').length;
  const questionCount = contents.filter((content) => content.status === 'DESIGN_DUVIDA').length;
  const doneCount = contents.filter((content) => content.status === 'PRONTO_PARA_POSTAR').length;
  const lateCount = contents.filter(
    (content) => content.plannedDate && new Date(content.plannedDate) < new Date() && content.status !== 'PRONTO_PARA_POSTAR'
  ).length;

  const latePercent = contents.length ? Math.round((lateCount / contents.length) * 100) : 0;
  const donePercent = contents.length ? Math.round((doneCount / contents.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
          Design
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          Área do Design
        </h1>

        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-300">
          Acompanhe demandas de design, materiais dos clientes, dúvidas com Social Media, produção, análise e finalização.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          title="Demandas"
          value={contents.length}
          description="Total de demandas visíveis no Design."
        />

        <MetricCard
          title="Fazendo"
          value={doingCount}
          description="Demandas em produção."
          tone="blue"
        />

        <MetricCard
          title="Análise"
          value={analysisCount}
          description="Aguardando conferência."
          tone="yellow"
        />

        <MetricCard
          title="Dúvidas"
          value={questionCount}
          description="Aguardando resposta da Social Media."
          tone="yellow"
        />

        <MetricCard
          title="Atrasos"
          value={`${latePercent}%`}
          description={`${lateCount} de ${contents.length} demandas atrasadas.`}
          tone="red"
        />

        <MetricCard
          title="Finalização"
          value={`${donePercent}%`}
          description={`${doneCount} de ${contents.length} demandas finalizadas.`}
          tone="green"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={createDesignColumnAction} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_150px]">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Criar nova coluna do Kanban
            </label>

            <input
              name="title"
              placeholder="Ex: Falta programar, Banco de imagens, Programado..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <button
            type="submit"
            className="self-end rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            Criar coluna
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto pb-3 [scrollbar-width:thin]">
          <div className="flex min-h-[620px] gap-4">
            <div className="flex w-[320px] shrink-0 flex-col rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Pin size={18} className="text-slate-600" />

                    <h2 className="text-lg font-bold text-slate-900">
                      Clientes / banco, Drive e logos
                    </h2>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Acesso rápido aos materiais principais de cada cliente.
                  </p>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                  {clients.length}
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
                {clients.map((client) => (
                  <ClientAssetCard key={client.id} client={client} />
                ))}
              </div>
            </div>

            {columns.map((column) => {
              const items = contents.filter((content) => content.status === column.statusKey);

              return (
                <div
                  key={column.id}
                  className="flex w-[320px] shrink-0 flex-col rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Palette size={18} className="text-slate-600" />

                        <h2 className="text-lg font-bold text-slate-900">
                          {column.title}
                        </h2>
                      </div>

                      <p className="mt-2 text-sm leading-relaxed text-slate-500">
                        {getColumnDescription(column.statusKey, column.title)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                        {items.length}
                      </span>

                      <ColumnMenu column={column} />
                    </div>
                  </div>

                  <DroppableDesignColumn statusKey={column.statusKey}>
                    {items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm font-medium text-slate-400">
                        Nenhuma demanda aqui.
                      </div>
                    ) : (
                      items.map((content) => (
                        <DraggableDesignCard key={content.id} contentId={content.id}>
                          <DesignCard content={content} />
                        </DraggableDesignCard>
                      ))
                    )}
                  </DroppableDesignColumn>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
