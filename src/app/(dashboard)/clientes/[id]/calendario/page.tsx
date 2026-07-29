import { prisma } from '@/lib/prisma';
import { requireCurrentUser, isDirector, isSocialMedia } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Target,
} from 'lucide-react';

function normalize(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getMonthName(month: number) {
  const date = new Date(2026, month - 1, 1);

  return date.toLocaleDateString('pt-BR', {
    month: 'long',
  });
}

function getStartOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1);
}

function getEndOfMonth(year: number, month: number) {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getPercentage(value: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    IDEIA: 'Ideia',
    RASCUNHO: 'Rascunho',
    REVISAO_INTERNA: 'Revisão',
    AGUARDANDO_CLIENTE: 'Cliente',
    APROVADO: 'Aprovado',
    AGENDAMENTO_PRODUCAO: 'Agendamento',
    ALTERACAO_SOLICITADA: 'Alteração',
    PRONTO_PARA_POSTAR: 'Pronto',
    PUBLICADO: 'Publicado',
  };

  return labels[status] || status;
}

function getStatusClass(status: string) {
  const classes: Record<string, string> = {
    IDEIA: 'border-slate-200 bg-slate-50 text-slate-700',
    RASCUNHO: 'border-blue-100 bg-blue-50 text-blue-700',
    REVISAO_INTERNA: 'border-yellow-100 bg-yellow-50 text-yellow-700',
    AGUARDANDO_CLIENTE: 'border-orange-100 bg-orange-50 text-orange-700',
    APROVADO: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    AGENDAMENTO_PRODUCAO: 'border-cyan-100 bg-cyan-50 text-cyan-700',
    ALTERACAO_SOLICITADA: 'border-red-100 bg-red-50 text-red-700',
    PRONTO_PARA_POSTAR: 'border-green-100 bg-green-50 text-green-700',
    PUBLICADO: 'border-slate-200 bg-slate-100 text-slate-700',
  };

  return classes[status] || classes.IDEIA;
}

export default async function ClienteCalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    mes?: string;
    ano?: string;
  }>;
}) {
  const currentUser = await requireCurrentUser();

  const { id } = await params;
  const query = searchParams ? await searchParams : {};

  const now = new Date();
  const selectedMonth = Number(query?.mes || now.getMonth() + 1);
  const selectedYear = Number(query?.ano || now.getFullYear());

  const month = selectedMonth >= 1 && selectedMonth <= 12
    ? selectedMonth
    : now.getMonth() + 1;

  const year = selectedYear > 2000 ? selectedYear : now.getFullYear();

  const monthStart = getStartOfMonth(year, month);
  const monthEnd = getEndOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekDay = monthStart.getDay();

  const client = await prisma.client.findUnique({
    where: {
      id,
    },
    include: {
      contents: {
        where: {
          plannedDate: {
            gte: monthStart,
            lte: monthEnd,
          },
          status: {
            not: 'ARQUIVADO',
          },
        },
        orderBy: {
          plannedDate: 'asc',
        },
      },
    },
  });

  if (!client) {
    notFound();
  }

  if (isSocialMedia(currentUser.role)) {
    const responsible = normalize(client.internalResponsible);
    const userName = normalize(currentUser.name);
    const userEmail = normalize(currentUser.email);

    const hasAccess =
      responsible.includes(userName) || responsible.includes(userEmail);

    if (!hasAccess) {
      redirect('/clientes');
    }
  }

  if (!isDirector(currentUser.role) && !isSocialMedia(currentUser.role)) {
    redirect('/clientes');
  }

  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const monthlyGoal = client.monthlyContentGoal || 0;
  const monthContents = client.contents.length;
  const progress = getPercentage(monthContents, monthlyGoal);

  const contentsByDay = new Map<number, typeof client.contents>();

  for (const content of client.contents) {
    if (!content.plannedDate) continue;

    const day = new Date(content.plannedDate).getDate();

    if (!contentsByDay.has(day)) {
      contentsByDay.set(day, []);
    }

    contentsByDay.get(day)?.push(content);
  }

  const calendarCells = [];

  for (let i = 0; i < firstWeekDay; i++) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(day);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Link
              href={`/clientes/${client.id}`}
              className="text-sm font-bold text-blue-300 hover:text-blue-200"
            >
              &larr; Voltar para o cliente
            </Link>

            <p className="mt-5 text-sm font-bold uppercase tracking-wider text-blue-300">
              Calendário de conteúdos
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
              {client.name}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
              Visualize os conteúdos planejados por dia antes de abrir cada conteúdo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/conteudos/novo-dia?cliente=${client.id}`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Novo conteúdo
            </Link>

            <Link
              href={`/clientes/${client.id}`}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
            >
              Página do cliente
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Conteúdos do mês
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {monthContents}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                criados ou planejados
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
              <FileText size={22} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                Meta mensal
              </p>

              <p className="mt-2 text-3xl font-bold text-emerald-800">
                {progress}%
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {monthContents} / {monthlyGoal} conteúdos
              </p>
            </div>

            <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
              <Target size={22} />
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
                Responsável
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-900">
                {client.internalResponsible || 'Não definido'}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                social media responsável
              </p>
            </div>

            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <CalendarDays size={22} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Mês selecionado
            </p>

            <h2 className="mt-1 text-2xl font-bold capitalize text-slate-900">
              {getMonthName(month)} de {year}
            </h2>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/clientes/${client.id}/calendario?mes=${previousMonth}&ano=${previousYear}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
              Anterior
            </Link>

            <Link
              href={`/clientes/${client.id}/calendario?mes=${nextMonth}&ano=${nextYear}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Próximo
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
          <div className="py-3">Dom</div>
          <div className="py-3">Seg</div>
          <div className="py-3">Ter</div>
          <div className="py-3">Qua</div>
          <div className="py-3">Qui</div>
          <div className="py-3">Sex</div>
          <div className="py-3">Sáb</div>
        </div>

        <div className="grid grid-cols-7">
          {calendarCells.map((day, index) => {
            const dayContents = day ? contentsByDay.get(day) || [] : [];

            return (
              <div
                key={`${day || 'empty'}-${index}`}
                className="min-h-36 border-b border-r border-slate-100 p-3 last:border-r-0"
              >
                {day && (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {day}
                      </span>

                      <Link
                        href={`/conteudos/novo-dia?cliente=${client.id}&data=${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
                        className="rounded-full px-2 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50"
                      >
                        +
                      </Link>
                    </div>

                    <div className="space-y-2">
                      {dayContents.map((content) => (
                        <Link
                          key={content.id}
                          href={`/conteudos/${content.id}`}
                          className={`block rounded-xl border p-2 text-left text-xs transition hover:shadow-sm ${getStatusClass(content.status)}`}
                        >
                          <p className="line-clamp-2 font-bold">
                            {content.title}
                          </p>

                          <p className="mt-1 text-[10px] font-bold uppercase opacity-70">
                            {getStatusLabel(content.status)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}


