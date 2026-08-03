import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCommanderAccess } from '@/lib/commanderAccess';
import { isValidDailyAccessCode } from '@/lib/dailyAccess';
import { prisma } from '@/lib/prisma';
import { saveAgencySubscriptionAction, updateSubscriptionStatusAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type PageProps = {
  params: Promise<{
    code: string;
  }>;
};

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(date: Date | null) {
  if (!date) return 'Não definido';

  return date.toLocaleDateString('pt-BR');
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    TRIAL: 'bg-cyan-50 text-cyan-700',
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    PAST_DUE: 'bg-red-50 text-red-700',
    PAUSED: 'bg-amber-50 text-amber-700',
    CANCELED: 'bg-slate-100 text-slate-500',
    EXPIRED: 'bg-slate-100 text-slate-500',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] || styles.EXPIRED}`}>
      {status}
    </span>
  );
}

function moduleBadge(enabled: boolean, label: string) {
  return (
    <span
      className={[
        'rounded-full px-3 py-1 text-xs font-bold',
        enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
      ].join(' ')}
    >
      {label}: {enabled ? 'Sim' : 'Não'}
    </span>
  );
}

export default async function CentralAssinaturasPage({ params }: PageProps) {
  const user = await requireCommanderAccess();
  const { code } = await params;

  if (!isValidDailyAccessCode(user.id, code)) {
    notFound();
  }

  const [plans, directors, subscriptions, activeSubscriptions, pausedSubscriptions, canceledSubscriptions] = await Promise.all([
    prisma.saasPlan.findMany({
      where: {
        status: {
          not: 'ARCHIVED',
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    }),
    prisma.user.findMany({
      where: {
        role: 'DIRECTOR',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.saasSubscription.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        plan: true,
      },
    }),
    prisma.saasSubscription.count({
      where: {
        status: 'ACTIVE',
      },
    }),
    prisma.saasSubscription.count({
      where: {
        status: 'PAUSED',
      },
    }),
    prisma.saasSubscription.count({
      where: {
        status: 'CANCELED',
      },
    }),
  ]);

  const defaultPlan = plans[0];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-600">
              Central AprovUp
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              Assinaturas por agência
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              Vincule um diretor/agência a um plano comercial do AprovUp e controle quais módulos ficam liberados.
            </p>
          </div>

          <Link
            href={`/base/${code}`}
            className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Voltar para Central
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total de assinaturas</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {subscriptions.length}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Ativas</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {activeSubscriptions}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Pausadas</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {pausedSubscriptions}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Canceladas</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {canceledSubscriptions}
          </strong>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">
          Criar ou atualizar assinatura
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Se o diretor/agência já tiver assinatura ativa ou pausada, o sistema atualiza o plano atual.
        </p>

        <form action={saveAgencySubscriptionAction} className="mt-6 grid gap-4 lg:grid-cols-5">
          <input type="hidden" name="code" value={code} />

          <label className="space-y-2 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Diretor / Agência
            </span>
            <select
              name="ownerUserId"
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            >
              <option value="">Selecione um diretor</option>
              {directors.map((director) => (
                <option key={director.id} value={director.id}>
                  {director.name || director.email} - {director.email}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Plano
            </span>
            <select
              name="planId"
              required
              defaultValue={defaultPlan?.id}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {formatMoney(plan.priceCents)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Status
            </span>
            <select
              name="status"
              defaultValue="ACTIVE"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            >
              <option value="TRIAL">Teste</option>
              <option value="ACTIVE">Ativa</option>
              <option value="PAUSED">Pausada</option>
              <option value="PAST_DUE">Pagamento pendente</option>
              <option value="CANCELED">Cancelada</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Nome da agência
            </span>
            <input
              name="agencyName"
              required
              placeholder="Ex: Level UP"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
          </label>

          <label className="space-y-2 lg:col-span-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Observação interna
            </span>
            <input
              name="notes"
              placeholder="Ex: cliente liberado manualmente, cupom aplicado ou negociação especial"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Salvar assinatura
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            Assinaturas cadastradas
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Controle rápido para ativar, pausar, marcar pendência ou cancelar o acesso.
          </p>
        </div>

        {subscriptions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-slate-950">
              Nenhuma assinatura cadastrada ainda
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Use o formulário acima para liberar o primeiro plano para uma agência.
            </p>
          </div>
        ) : (
          subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold text-slate-950">
                      {subscription.agencyName || subscription.ownerEmail || 'Agência sem nome'}
                    </h3>

                    {statusBadge(subscription.status)}
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {subscription.ownerEmail || subscription.ownerUserId}
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-950">
                    {subscription.plan.name} • {formatMoney(subscription.priceCents)} / mês
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Período: {formatDate(subscription.currentPeriodStart)} até {formatDate(subscription.currentPeriodEnd)}
                  </p>

                  {subscription.notes ? (
                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                      {subscription.notes}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {moduleBadge(subscription.canUseAi, 'IA')}
                    {moduleBadge(subscription.canUseCrm, 'CRM')}
                    {moduleBadge(subscription.canUseSocialPosting, 'Social')}
                    {moduleBadge(subscription.canUseReports, 'Relatórios')}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                  <form action={updateSubscriptionStatusAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="subscriptionId" value={subscription.id} />
                    <input type="hidden" name="status" value="ACTIVE" />
                    <button className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700">
                      Ativar
                    </button>
                  </form>

                  <form action={updateSubscriptionStatusAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="subscriptionId" value={subscription.id} />
                    <input type="hidden" name="status" value="PAUSED" />
                    <button className="w-full rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600">
                      Pausar
                    </button>
                  </form>

                  <form action={updateSubscriptionStatusAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="subscriptionId" value={subscription.id} />
                    <input type="hidden" name="status" value="PAST_DUE" />
                    <button className="w-full rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600">
                      Pendente
                    </button>
                  </form>

                  <form action={updateSubscriptionStatusAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="subscriptionId" value={subscription.id} />
                    <input type="hidden" name="status" value="CANCELED" />
                    <button className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                      Cancelar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}