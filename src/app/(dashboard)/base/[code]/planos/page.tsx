import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCommanderAccess } from '@/lib/commanderAccess';
import { isValidDailyAccessCode } from '@/lib/dailyAccess';
import { prisma } from '@/lib/prisma';
import { toggleSaasPlanStatusAction, updateSaasPlanAction } from './actions';

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

function formatInputMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function moduleBadge(enabled: boolean, label: string) {
  return (
    <span
      className={[
        'rounded-full px-3 py-1 text-xs font-bold',
        enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
      ].join(' ')}
    >
      {label}: {enabled ? 'Liberado' : 'Bloqueado'}
    </span>
  );
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    PAUSED: 'bg-amber-50 text-amber-700',
    ARCHIVED: 'bg-slate-100 text-slate-500',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] || styles.ARCHIVED}`}>
      {status}
    </span>
  );
}

export default async function CentralPlanosPage({ params }: PageProps) {
  const user = await requireCommanderAccess();
  const { code } = await params;

  if (!isValidDailyAccessCode(user.id, code)) {
    notFound();
  }

  const [plans, subscriptionsCount, paymentsPendingCount, couponsCount] = await Promise.all([
    prisma.saasPlan.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    }),
    prisma.saasSubscription.count(),
    prisma.saasPayment.count({
      where: {
        status: 'PENDING',
      },
    }),
    prisma.saasCoupon.count(),
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-600">
              Central AprovUp
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              Planos e upsells
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              Controle dos planos comerciais do AprovUp. Aqui você define preço, limites e quais módulos cada plano libera.
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
          <p className="text-sm text-slate-500">Planos cadastrados</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {plans.length}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Assinaturas</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {subscriptionsCount}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Pagamentos pendentes</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {paymentsPendingCount}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Cupons cadastrados</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {couponsCount}
          </strong>
        </div>
      </section>

      <section className="space-y-5">
        {plans.map((plan) => (
          <form
            key={plan.id}
            action={updateSaasPlanAction}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <input type="hidden" name="code" value={code} />
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="currentStatus" value={plan.status} />

            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-950">
                    {plan.name}
                  </h2>

                  {statusBadge(plan.status)}
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  {plan.slug} • {formatMoney(plan.priceCents)} / mês • {plan._count.subscriptions} assinatura(s)
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {moduleBadge(plan.canUseAi, 'IA')}
                  {moduleBadge(plan.canUseCrm, 'CRM')}
                  {moduleBadge(plan.canUseSocialPosting, 'Social')}
                  {moduleBadge(plan.canUseReports, 'Relatórios')}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  formAction={toggleSaasPlanStatusAction}
                  className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  {plan.status === 'ACTIVE' ? 'Pausar plano' : 'Ativar plano'}
                </button>

                <button
                  type="submit"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Salvar alterações
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-4">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nome do plano
                </span>
                <input
                  name="name"
                  defaultValue={plan.name}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Slug
                </span>
                <input
                  name="slug"
                  defaultValue={plan.slug}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status
                </span>
                <select
                  name="status"
                  defaultValue={plan.status}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="PAUSED">Pausado</option>
                  <option value="ARCHIVED">Arquivado</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Preço mensal em R$
                </span>
                <input
                  name="priceBrl"
                  defaultValue={formatInputMoney(plan.priceCents)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-4">
              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Taxa inicial em R$
                </span>
                <input
                  name="setupFeeBrl"
                  defaultValue={formatInputMoney(plan.setupFeeCents)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Máximo de clientes
                </span>
                <input
                  name="maxClients"
                  defaultValue={plan.maxClients}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Máximo de usuários
                </span>
                <input
                  name="maxUsers"
                  defaultValue={plan.maxUsers}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Limite IA em R$
                </span>
                <input
                  name="monthlyAiLimitBrl"
                  defaultValue={formatInputMoney(plan.monthlyAiLimitCents)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                />
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Descrição
              </span>
              <textarea
                name="description"
                defaultValue={plan.description || ''}
                rows={2}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              />
            </label>

            <div className="mt-5 grid gap-3 md:grid-cols-5">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                <input name="canUseAi" type="checkbox" defaultChecked={plan.canUseAi} />
                IA
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                <input name="canUseCrm" type="checkbox" defaultChecked={plan.canUseCrm} />
                CRM
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                <input name="canUseSocialPosting" type="checkbox" defaultChecked={plan.canUseSocialPosting} />
                Social/Postagem
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                <input name="canUseReports" type="checkbox" defaultChecked={plan.canUseReports} />
                Relatórios
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                <input name="isPublic" type="checkbox" defaultChecked={plan.isPublic} />
                Público no site
              </label>
            </div>
          </form>
        ))}
      </section>
    </div>
  );
}