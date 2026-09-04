import { prisma } from '@/lib/prisma';
import { canAccessClient } from '@/lib/clientAccess';

import { InstagramIcon } from '@/components/icons/InstagramIcon';
import {
  hasPermission,
  requirePermission,
} from '@/lib/userAccess';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Plus,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Pencil,
} from 'lucide-react';

function normalize(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isDirectorRole(role: string | null | undefined) {
  const normalizedRole = normalize(role);

  return (
    normalizedRole === 'director' ||
    normalizedRole === 'diretor' ||
    normalizedRole === 'admin' ||
    normalizedRole === 'administrador'
  );
}

function getPercentage(value: number, total: number) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function getInitial(name: string) {
  return name?.charAt(0)?.toUpperCase() || 'C';
}

function getGradient(index: number) {
  const gradients = [
    'from-blue-500 to-cyan-500',
    'from-fuchsia-500 to-pink-500',
    'from-cyan-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-violet-500 to-purple-500',
    'from-emerald-500 to-green-500',
  ];

  return gradients[index % gradients.length];
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    busca?: string;
    ordem?: string;
  }>;
}) {
  const currentUser = await requirePermission("social.view");

  const director =
    isDirectorRole(
      currentUser.role
    );

  const canManageSocial =
    hasPermission(
      currentUser,
      'social.manage'
    );
const query = searchParams ? await searchParams : {};
  const search = String(query?.busca || '').trim();
  const order = String(query?.ordem || 'az');

  const allClients = await prisma.client.findMany({
    where: {
      agencyId:
        currentUser.agencyId,
    },

    include: {
      contents: true,
    },
    orderBy: {
      name: order === 'za' ? 'desc' : 'asc',
    },
  });

  const visibleClients =
    allClients.filter(
      (client) =>
        canAccessClient(
          currentUser,
          client
        )
    );

  const filteredClients = visibleClients.filter((client) => {
    if (!search) return true;

    const target = normalize(
      `${client.name} ${client.segment || ''} ${client.internalResponsible || ''}`
    );

    return target.includes(normalize(search));
  });

  const totalClients = filteredClients.length;
  const totalContents = filteredClients.reduce(
    (sum, client) => sum + client.contents.length,
    0
  );

  const totalApproved = filteredClients.reduce(
    (sum, client) =>
      sum +
      client.contents.filter((content) =>
        ['APROVADO', 'AGENDAMENTO_PRODUCAO', 'PRONTO_PARA_POSTAR', 'PUBLICADO'].includes(content.status)
      ).length,
    0
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
              Social Media
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
              Clientes
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
              Gerencie os calendários, conteúdos, aprovações e demandas por cliente.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/social-media/agendamentos"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20"
            >
              <CalendarDays size={16} />
              Agendar gravações
            </Link>

            {canManageSocial && (
              <Link
                href="/clientes/novo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                <Plus size={16} />
                Novo Cliente
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Clientes
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalClients}</p>
          <p className="mt-1 text-sm text-slate-500">visíveis para seu perfil</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
            Conteúdos
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-800">{totalContents}</p>
          <p className="mt-1 text-sm text-slate-500">criados ou planejados</p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Aprovados
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-800">{totalApproved}</p>
          <p className="mt-1 text-sm text-slate-500">conteúdos aprovados ou avançados</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              name="busca"
              defaultValue={search}
              placeholder="Buscar por nome, segmento ou responsável..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <select
            name="ordem"
            defaultValue={order}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          >
            <option value="az">Nome A-Z</option>
            <option value="za">Nome Z-A</option>
          </select>
        </form>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {filteredClients.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Nenhum cliente encontrado.
          </div>
        ) : (
          filteredClients.map((client, index) => {
            const total = client.contents.length;

            const drafts = client.contents.filter((content) =>
              ['IDEIA', 'RASCUNHO'].includes(content.status)
            ).length;

            const adjustments = client.contents.filter(
              (content) => content.status === 'ALTERACAO_SOLICITADA'
            ).length;

            const approval = client.contents.filter((content) =>
              ['AGUARDANDO_CLIENTE', 'APROVADO'].includes(content.status)
            ).length;

            const approved = client.contents.filter((content) =>
              ['APROVADO', 'AGENDAMENTO_PRODUCAO', 'PRONTO_PARA_POSTAR', 'PUBLICADO'].includes(content.status)
            ).length;

            const goal = client.monthlyContentGoal || 0;
            const progress = getPercentage(total, goal);

            return (
              <article
                key={client.id}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div
                  className={`relative h-24 bg-gradient-to-r ${client.brandColor ? '' : getGradient(index)}`}
                  style={client.brandColor ? { background: client.brandColor } : undefined}
                >
                  <div className="absolute right-4 top-4 z-30 flex gap-2">
                    <Link
                      href={`/clientes/${client.id}/instagram`}
                      title="Instagram do cliente"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-600/90 text-white shadow-sm backdrop-blur transition hover:bg-pink-500"
                    >
                      <InstagramIcon size={18} />
                    </Link>

                    {canManageSocial && (
                      <Link
                        href={`/clientes/${client.id}/editar`}
                        title="Editar cliente"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900/85 text-white shadow-sm backdrop-blur transition hover:bg-slate-800"
                      >
                        <Pencil size={17} />
                      </Link>
                    )}
                  </div>
                </div>

                <Link
                  href={`/social-media?cliente=${client.id}`}
                  className="block"
                >
                  <div className="relative p-5 pt-0">
                    <div className="-mt-9 flex items-end justify-between">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-slate-950 text-2xl font-bold text-white shadow-sm">
                        {client.logoUrl ? (
                          <img
                            src={client.logoUrl}
                            alt={client.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitial(client.name)
                        )}
                      </div>

                      <span className="mb-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        Ativo
                      </span>
                    </div>

                    <div className="mt-5">
                      <h2 className="line-clamp-1 text-xl font-bold text-slate-900">
                        {client.name}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {client.segment || 'Sem segmento definido'}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                      <Users size={14} />
                      <span>{client.internalResponsible || 'Sem responsável'}</span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-100 px-3 py-2">
                        <p className="flex items-center gap-1 text-xs font-bold text-slate-600">
                          <Clock size={13} />
                          {drafts} Rascunho
                        </p>
                      </div>

                      <div className="rounded-xl bg-orange-50 px-3 py-2">
                        <p className="flex items-center gap-1 text-xs font-bold text-orange-700">
                          <AlertTriangle size={13} />
                          {adjustments} Ajuste
                        </p>
                      </div>

                      <div className="rounded-xl bg-yellow-50 px-3 py-2">
                        <p className="flex items-center gap-1 text-xs font-bold text-yellow-700">
                          <CalendarDays size={13} />
                          {approval} Aprovação
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-50 px-3 py-2">
                        <p className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 size={13} />
                          {approved} Aprovados
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>Meta mensal</span>
                        <span>{total} / {goal} — {progress}%</span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-900"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
