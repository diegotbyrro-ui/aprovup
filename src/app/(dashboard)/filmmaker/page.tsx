import { formatLabel } from '@/lib/formatLabel';

import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  Eye,
  Video,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Plus,
  CalendarDays,
  Scissors,
  Camera,
  ClipboardList,
  Pencil,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import {
  updateFilmmakerStatusAction,
  sendFilmmakerQuestionAction,
  createFilmmakerColumnAction,
  updateFilmmakerColumnTitleAction,
  moveFilmmakerColumnAction,
  archiveFilmmakerColumnAction,
  ensureDefaultFilmmakerColumns,
} from './actions';
import DraggableColumn from './DraggableColumn';
import { DraggableContentCard, DroppableFilmmakerColumn } from './DraggableContentCard';
function normalizeRole(role?: string | null) {
  return String(role || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isFilmmaker(role?: string | null) {
  const value = normalizeRole(role);
  return value === 'filmmaker' || value === 'audiovisual' || value === 'video';
}

function getColumnIcon(statusKey: string) {
  const icons: Record<string, any> = {
    APROVADO: Video,
    FILMMAKER_PRE_PRODUCAO: ClipboardList,
    FILMMAKER_AGENDAMENTO: CalendarDays,
    FILMMAKER_GRAVANDO: Camera,
    FILMMAKER_EDICAO: Scissors,
    FILMMAKER_ANALISE: Eye,
    FILMMAKER_DUVIDA_SOCIAL: HelpCircle,
    'ALTERACAO_SOLICITADA': AlertTriangle,
    'PRONTO_PARA_POSTAR': CheckCircle2,
  };

  return icons[statusKey] || Plus;
}

function getColumnDescription(statusKey: string) {
  const descriptions: Record<string, string> = {
    APROVADO: 'Aprovadas e liberadas para audiovisual.',
    FILMMAKER_PRE_PRODUCAO: 'Roteiro, referências e preparação.',
    FILMMAKER_AGENDAMENTO: 'Aguardando data com cliente ou equipe.',
    FILMMAKER_GRAVANDO: 'Captação em andamento.',
    FILMMAKER_EDICAO: 'Vídeo em edição.',
    FILMMAKER_ANALISE: 'Aguardando conferência interna.',
    FILMMAKER_DUVIDA_SOCIAL: 'Aguardando resposta da Social Media.',
    'ALTERACAO_SOLICITADA': 'Demandas que voltaram com ajuste.',
    'PRONTO_PARA_POSTAR': 'Prontos para postagem.',
  };

  return descriptions[statusKey] || 'Coluna personalizada do Kanban.';
}

function formatDate(date?: Date | null) {
  if (!date) return 'Sem data';

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function isLate(plannedDate?: Date | null, status?: string) {
  if (!plannedDate) return false;

  if (['PRONTO_PARA_POSTAR', 'PUBLICADO'].includes(String(status))) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(plannedDate);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

function getPercentage(value: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function getClientLinks(client: any) {
  const links = String(client?.usefulLinks || '')
    .split(/\r?\n|,|;/)
    .map((link) => link.trim())
    .filter(Boolean);

  return {
    banco: client?.databaseLink || links[0] || '',
    drive: client?.driveLink || links[1] || links[0] || '',
    logo: client?.logoLink || links[2] || '',
  };
}

function AssetLinkButton({ href, label }: { href: string; label: string }) {
  if (!href) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-center text-xs font-medium text-slate-400">
        {label} não cadastrado
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-100"
    >
      {label}
    </a>
  );
}

function ClientAssetCard({ client }: { client: any }) {
  const links = getClientLinks(client);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-sm font-bold text-white">
          {client.logoUrl ? (
            <img src={client.logoUrl} alt={client.name} className="h-full w-full object-cover" />
          ) : (
            client.name?.charAt(0) || 'C'
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-bold text-slate-900">
            {client.name}
          </h3>

          <p className="mt-1 text-xs font-medium text-slate-500">
            {client.segment || 'Sem segmento definido'}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <AssetLinkButton href={links.banco} label="Banco de dados" />
        <AssetLinkButton href={links.drive} label="Drive" />
        <AssetLinkButton href={links.logo} label="Logo" />
      </div>
    </article>
  );
}

function ColumnMenu({ column }: { column: any }) {
  return (
    <details className="relative">
      <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <MoreHorizontal size={18} />
      </summary>

      <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <form action={updateFilmmakerColumnTitleAction.bind(null, column.id)} className="space-y-2">
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
          <form action={moveFilmmakerColumnAction.bind(null, column.id, 'left')}>
            <button
              type="submit"
              title="Mover para esquerda"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Esquerda
            </button>
          </form>

          <form action={moveFilmmakerColumnAction.bind(null, column.id, 'right')}>
            <button
              type="submit"
              title="Mover para direita"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Direita
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        <form action={archiveFilmmakerColumnAction.bind(null, column.id)} className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-100"
          >
            <Trash2 size={16} />
            Excluir coluna
          </button>
        </form>

        <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs font-medium leading-relaxed text-blue-700">
          Para trocar a posição, clique, segure e arraste a coluna para o local desejado.
        </p>
      </div>
    </details>
  );
}

function StatusMoveButton({
  contentId,
  nextStatus,
  label,
}: {
  contentId: string;
  nextStatus: string;
  label: string;
}) {
  return (
    <form action={updateFilmmakerStatusAction.bind(null, contentId, nextStatus)}>
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
      >
        {label}
        <ArrowRight size={13} />
      </button>
    </form>
  );
}

function FilmmakerCard({
  content,
  columns,
}: {
  content: any;
  columns: any[];
}) {
  const late = isLate(content.plannedDate, content.status);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {content.coverImageUrl ? (
        <div className="overflow-hidden rounded-t-2xl border-b border-slate-100 bg-slate-100">
          <img src={content.coverImageUrl} alt={content.title} className="h-40 w-full object-cover" />
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-t-2xl border-b border-slate-100 bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
          Sem capa
        </div>
      )}

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="line-clamp-2 text-sm font-bold text-slate-900">
              {content.title}
            </h3>

            <p className="mt-1 text-xs font-medium text-slate-500">
              {content.client?.name || 'Cliente não informado'}
            </p>
          </div>

          {late && (
            <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold uppercase text-red-600">
              Atrasado
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
            {formatDate(content.plannedDate)}
          </span>

          <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-600">
            {formatLabel(content.format) || 'Formato'}
          </span>
        </div>

        {content.briefing && (
          <p className="line-clamp-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            {content.briefing}
          </p>
        )}

        <form action={sendFilmmakerQuestionAction.bind(null, content.id)} className="rounded-xl border border-yellow-100 bg-yellow-50 p-3">
          <label className="block text-xs font-bold text-yellow-800">
            Dúvida para Social Media
          </label>

          <textarea
            name="question"
            rows={2}
            placeholder="Escreva a dúvida..."
            className="mt-2 w-full rounded-xl border border-yellow-100 bg-white px-3 py-2 text-xs text-slate-700 outline-none"
          />

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-yellow-500 px-3 py-2 text-xs font-bold text-white hover:bg-yellow-600"
          >
            Enviar dúvida
          </button>
        </form>

        <div className="grid grid-cols-1 gap-2">

          <Link
            href={`/captacoes/nova?cliente=${content.clientId}&conteudo=${content.id}`}
            className="rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-bold text-white transition hover:bg-blue-700"
          >Reagendamento</Link>

          <Link
            href={`/conteudos/${content.id}/visualizar`}
            className="rounded-lg bg-slate-900 px-3 py-2 text-center text-xs font-bold text-white transition hover:bg-slate-800"
          >
            Abrir conteúdo
          </Link>
        </div>
      </div>
    </article>
  );
}

function MetricCard({
  label,
  value,
  description,
  type,
}: {
  label: string;
  value: string;
  description: string;
  type: 'dark' | 'blue' | 'yellow' | 'red' | 'green';
}) {
  const styles = {
    dark: 'border-slate-200 bg-white text-slate-900',
    blue: 'border-blue-100 bg-blue-50 text-blue-800',
    yellow: 'border-yellow-100 bg-yellow-50 text-yellow-800',
    red: 'border-red-100 bg-red-50 text-red-800',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  }[type];

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${styles}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-2 text-xs font-medium opacity-70">
        {description}
      </p>
    </div>
  );
}

export default async function FilmmakerPage() {
  const currentUser = await requireCurrentUser();

  if (!isDirector(currentUser.role) && !isFilmmaker(currentUser.role)) {
    redirect('/clientes');
  }

  await ensureDefaultFilmmakerColumns();

  const clients = await prisma.client.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  const columns = await prisma.filmmakerKanbanColumn.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      order: 'asc',
    },
  });

  const contents = await prisma.content.findMany({
    where: {
      area: 'FILMMAKER',
      status: {
        in: columns.map((column) => column.statusKey),
      },
    },
    include: {
      client: true,
      comments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
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

  const total = contents.length;
  const scheduled = contents.filter((item) => item.status === 'FILMMAKER_AGENDAMENTO').length;
  const recording = contents.filter((item) => item.status === 'FILMMAKER_GRAVANDO').length;
  const editing = contents.filter((item) => item.status === 'FILMMAKER_EDICAO').length;
  const finished = contents.filter((item) => item.status === 'PRONTO_PARA_POSTAR').length;
  const late = contents.filter((item) => isLate(item.plannedDate, item.status)).length;

  const finishedPercentage = getPercentage(finished, total);
  const latePercentage = getPercentage(late, total);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
          Filmmaker
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          Área do Filmmaker
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Acompanhe demandas de audiovisual, materiais dos clientes, pré-produção, agendamento, gravação, edição e finalização.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-6">
        <MetricCard label="Demandas" value={String(total)} description="Total de demandas no Filmmaker." type="dark" />
        <MetricCard label="Agendadas" value={String(scheduled)} description="Demandas aguardando captação." type="blue" />
        <MetricCard label="Gravando" value={String(recording)} description="Captações em andamento." type="yellow" />
        <MetricCard label="Edição" value={String(editing)} description="Vídeos em edição." type="blue" />
        <MetricCard label="Atrasos" value={`${latePercentage}%`} description={`${late} de ${total} atrasadas.`} type="red" />
        <MetricCard label="Finalização" value={`${finishedPercentage}%`} description={`${finished} de ${total} finalizadas.`} type="green" />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={createFilmmakerColumnAction} className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Criar nova coluna do Kanban
            </label>

            <input
              name="title"
              required
              placeholder="Ex: Falta gravar, Separar equipamento, Programado..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            Criar coluna
          </button>
        </form>
      </section>

      <section className="relative h-[calc(100vh-230px)] min-h-[620px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex h-full max-w-[calc(100vw-320px)] gap-4 overflow-x-auto overflow-y-hidden pb-5 pr-6 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500">
          <div className="flex h-full w-80 min-w-80 shrink-0 flex-col rounded-3xl border border-slate-200 bg-slate-100/70 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Video size={18} className="text-slate-600" />

                  <h2 className="text-base font-bold text-slate-900">
                    Clientes / banco, Drive e logos
                  </h2>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Acesso rápido aos materiais principais de cada cliente.
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                {clients.length}
              </span>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {clients.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-xs font-medium text-slate-400">
                  Nenhum cliente cadastrado.
                </div>
              ) : (
                clients.map((client) => (
                  <ClientAssetCard key={client.id} client={client} />
                ))
              )}
            </div>
          </div>

          {columns.map((column) => {
            const Icon = getColumnIcon(column.statusKey);
            const description = getColumnDescription(column.statusKey);
            const items = contents.filter((item) => item.status === column.statusKey);

            return (
              <DraggableColumn key={column.id} columnId={column.id}>
                <div className="flex h-full w-80 min-w-80 shrink-0 flex-col rounded-3xl border border-slate-200 bg-slate-100/70 p-4">
                  <div className="mb-4 flex items-start justify-between gap-3 pl-8">
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon size={18} className="text-slate-600" />

                        <h2 className="text-base font-bold text-slate-900">
                          {column.title}
                        </h2>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">
                        {items.length}
                      </span>

                      <ColumnMenu column={column} />
                    </div>
                  </div>

                  <DroppableFilmmakerColumn statusKey={column.statusKey}>
                    {items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-xs font-medium text-slate-400">
                        Nenhuma demanda aqui.
                      </div>
                    ) : (
                      items.map((content) => (
                      <DraggableContentCard key={content.id} contentId={content.id}>
                        <FilmmakerCard
                          content={content}
                          columns={columns}
                        />
                      </DraggableContentCard>
                    ))
                    )}
                  </DroppableFilmmakerColumn>
                </div>
              </DraggableColumn>
            );
          })}
        </div>
      </section>
    </div>
  );
}
