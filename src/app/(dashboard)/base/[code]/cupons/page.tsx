import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCommanderAccess } from '@/lib/commanderAccess';
import { isValidDailyAccessCode } from '@/lib/dailyAccess';
import { prisma } from '@/lib/prisma';
import { createCouponAction, resetCouponUsageAction, updateCouponStatusAction } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type PageProps = {
  params: Promise<{
    code: string;
  }>;
};

function formatMoney(cents: number | null) {
  if (cents === null || cents === undefined) return '-';

  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(date: Date | null) {
  if (!date) return 'Sem data';

  return date.toLocaleDateString('pt-BR');
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    PAUSED: 'bg-amber-50 text-amber-700',
    EXPIRED: 'bg-slate-100 text-slate-500',
  };

  const labels: Record<string, string> = {
    ACTIVE: 'Ativo',
    PAUSED: 'Pausado',
    EXPIRED: 'Expirado',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] || styles.EXPIRED}`}>
      {labels[status] || status}
    </span>
  );
}

function discountLabel(discountType: string, discountPercent: number | null, discountCents: number | null) {
  if (discountType === 'PERCENTAGE') {
    return `${discountPercent || 0}%`;
  }

  return formatMoney(discountCents);
}

export default async function CentralCuponsPage({ params }: PageProps) {
  const user = await requireCommanderAccess();
  const { code } = await params;

  if (!isValidDailyAccessCode(user.id, code)) {
    notFound();
  }

  const [plans, coupons, activeCoupons, pausedCoupons, expiredCoupons] = await Promise.all([
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
    prisma.saasCoupon.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.saasCoupon.count({
      where: {
        status: 'ACTIVE',
      },
    }),
    prisma.saasCoupon.count({
      where: {
        status: 'PAUSED',
      },
    }),
    prisma.saasCoupon.count({
      where: {
        status: 'EXPIRED',
      },
    }),
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
              Cupons
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              Crie cupons promocionais para liberar desconto em planos específicos ou em todos os planos do AprovUp.
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
          <p className="text-sm text-slate-500">Cupons cadastrados</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {coupons.length}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Ativos</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {activeCoupons}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Pausados</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {pausedCoupons}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Expirados</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {expiredCoupons}
          </strong>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">
          Criar ou atualizar cupom
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Se o código já existir, o sistema atualiza as informações do cupom.
        </p>

        <form action={createCouponAction} className="mt-6 grid gap-4 lg:grid-cols-5">
          <input type="hidden" name="centralCode" value={code} />

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Código
            </span>
            <input
              name="couponCode"
              required
              placeholder="EX: PRIMEIROMES"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tipo de desconto
            </span>
            <select
              name="discountType"
              defaultValue="PERCENTAGE"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            >
              <option value="PERCENTAGE">Porcentagem</option>
              <option value="FIXED_AMOUNT">Valor fixo em R$</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Desconto %
            </span>
            <input
              name="discountPercent"
              placeholder="Ex: 20"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Desconto R$
            </span>
            <input
              name="discountBrl"
              placeholder="Ex: 50,00"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
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
              <option value="ACTIVE">Ativo</option>
              <option value="PAUSED">Pausado</option>
              <option value="EXPIRED">Expirado</option>
            </select>
          </label>

          <label className="space-y-2 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Aplicar ao plano
            </span>
            <select
              name="appliesToPlanSlug"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            >
              <option value="">Todos os planos</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.slug}>
                  {plan.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Limite de usos
            </span>
            <input
              name="maxUses"
              placeholder="Ex: 10"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Válido de
            </span>
            <input
              name="validFrom"
              type="date"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Válido até
            </span>
            <input
              name="validUntil"
              type="date"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
          </label>

          <label className="space-y-2 lg:col-span-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Descrição
            </span>
            <input
              name="description"
              placeholder="Ex: Campanha de lançamento, desconto especial para primeiras agências..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Salvar cupom
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            Cupons cadastrados
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Controle rápido para ativar, pausar, expirar ou zerar uso de cada cupom.
          </p>
        </div>

        {coupons.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-slate-950">
              Nenhum cupom cadastrado ainda
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Crie o primeiro cupom usando o formulário acima.
            </p>
          </div>
        ) : (
          coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold uppercase text-slate-950">
                      {coupon.code}
                    </h3>

                    {statusBadge(coupon.status)}
                  </div>

                  <p className="mt-2 text-sm font-bold text-slate-950">
                    Desconto: {discountLabel(coupon.discountType, coupon.discountPercent, coupon.discountCents)}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Plano: {coupon.appliesToPlanSlug || 'Todos os planos'}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Uso: {coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''} • Validade: {formatDate(coupon.validFrom)} até {formatDate(coupon.validUntil)}
                  </p>

                  {coupon.description ? (
                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                      {coupon.description}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                  <form action={updateCouponStatusAction}>
                    <input type="hidden" name="centralCode" value={code} />
                    <input type="hidden" name="couponId" value={coupon.id} />
                    <input type="hidden" name="status" value="ACTIVE" />
                    <button className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700">
                      Ativar
                    </button>
                  </form>

                  <form action={updateCouponStatusAction}>
                    <input type="hidden" name="centralCode" value={code} />
                    <input type="hidden" name="couponId" value={coupon.id} />
                    <input type="hidden" name="status" value="PAUSED" />
                    <button className="w-full rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600">
                      Pausar
                    </button>
                  </form>

                  <form action={updateCouponStatusAction}>
                    <input type="hidden" name="centralCode" value={code} />
                    <input type="hidden" name="couponId" value={coupon.id} />
                    <input type="hidden" name="status" value="EXPIRED" />
                    <button className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                      Expirar
                    </button>
                  </form>

                  <form action={resetCouponUsageAction}>
                    <input type="hidden" name="centralCode" value={code} />
                    <input type="hidden" name="couponId" value={coupon.id} />
                    <button className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                      Zerar uso
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