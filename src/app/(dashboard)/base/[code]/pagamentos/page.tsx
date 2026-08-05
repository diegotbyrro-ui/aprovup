import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCommanderAccess } from '@/lib/commanderAccess';
import { isValidDailyAccessCode } from '@/lib/dailyAccess';
import { prisma } from '@/lib/prisma';
import { createPaymentAction, updatePaymentStatusAction } from './actions';

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

function formatDate(date: Date | null) {
  if (!date) return 'Não definido';

  return date.toLocaleDateString('pt-BR');
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700',
    PAID: 'bg-emerald-50 text-emerald-700',
    FAILED: 'bg-red-50 text-red-700',
    CANCELED: 'bg-slate-100 text-slate-500',
    REFUNDED: 'bg-cyan-50 text-cyan-700',
  };

  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    PAID: 'Pago',
    FAILED: 'Falhou',
    CANCELED: 'Cancelado',
    REFUNDED: 'Reembolsado',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] || styles.CANCELED}`}>
      {labels[status] || status}
    </span>
  );
}

export default async function CentralPagamentosPage({ params }: PageProps) {
  const user = await requireCommanderAccess();
  const { code } = await params;

  if (!isValidDailyAccessCode(user.id, code)) {
    notFound();
  }

  const [subscriptions, payments, pendingPayments, paidPayments, failedPayments] = await Promise.all([
    prisma.saasSubscription.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        plan: true,
      },
    }),
    prisma.saasPayment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    }),
    prisma.saasPayment.findMany({
      where: {
        status: 'PENDING',
      },
      select: {
        amountCents: true,
      },
    }),
    prisma.saasPayment.findMany({
      where: {
        status: 'PAID',
      },
      select: {
        amountCents: true,
      },
    }),
    prisma.saasPayment.findMany({
      where: {
        status: 'FAILED',
      },
      select: {
        amountCents: true,
      },
    }),
  ]);

  const pendingTotal = pendingPayments.reduce((total, payment) => total + payment.amountCents, 0);
  const paidTotal = paidPayments.reduce((total, payment) => total + payment.amountCents, 0);
  const failedTotal = failedPayments.reduce((total, payment) => total + payment.amountCents, 0);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-600">
              Central AprovUp
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              Pagamentos
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              Controle manual de cobranças, pagamentos pendentes, recebidos, falhas e cancelamentos.
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
          <p className="text-sm text-slate-500">Total recebido</p>
          <strong className="mt-3 block text-3xl font-bold text-slate-950">
            {formatMoney(paidTotal)}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total pendente</p>
          <strong className="mt-3 block text-3xl font-bold text-slate-950">
            {formatMoney(pendingTotal)}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Falhas</p>
          <strong className="mt-3 block text-3xl font-bold text-slate-950">
            {formatMoney(failedTotal)}
          </strong>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Cobranças</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {payments.length}
          </strong>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">
          Criar cobrança manual
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Use para registrar cobranças manuais enquanto ainda não conectamos gateway de pagamento.
        </p>

        {subscriptions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            Nenhuma assinatura cadastrada. Crie uma assinatura antes de registrar pagamento.
          </div>
        ) : (
          <form action={createPaymentAction} className="mt-6 grid gap-4 lg:grid-cols-5">
            <input type="hidden" name="code" value={code} />

            <label className="space-y-2 lg:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Assinatura / Agência
              </span>
              <select
                name="subscriptionId"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="">Selecione uma assinatura</option>
                {subscriptions.map((subscription) => (
                  <option key={subscription.id} value={subscription.id}>
                    {subscription.agencyName || subscription.ownerEmail} - {subscription.plan.name} - {formatMoney(subscription.priceCents)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Valor em R$
              </span>
              <input
                name="amountBrl"
                required
                defaultValue={formatInputMoney(subscriptions[0]?.priceCents || 0)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Vencimento
              </span>
              <input
                name="dueDate"
                type="date"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Status
              </span>
              <select
                name="status"
                defaultValue="PENDING"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              >
                <option value="PENDING">Pendente</option>
                <option value="PAID">Pago</option>
                <option value="FAILED">Falhou</option>
                <option value="CANCELED">Cancelado</option>
                <option value="REFUNDED">Reembolsado</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Método
              </span>
              <input
                name="method"
                placeholder="Pix, cartão, boleto..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Referência externa
              </span>
              <input
                name="externalReference"
                placeholder="ID Mercado Pago, Stripe..."
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              />
            </label>

            <label className="space-y-2 lg:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Observação
              </span>
              <input
                name="notes"
                placeholder="Observação interna sobre esta cobrança"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
              />
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Criar cobrança
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-950">
            Histórico de cobranças
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Atualize rapidamente o status financeiro de cada cobrança.
          </p>
        </div>

        {payments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-slate-950">
              Nenhuma cobrança cadastrada ainda
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Crie uma cobrança manual usando o formulário acima.
            </p>
          </div>
        ) : (
          payments.map((payment) => (
            <div
              key={payment.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold text-slate-950">
                      {payment.agencyName || payment.ownerEmail || 'Agência sem nome'}
                    </h3>

                    {statusBadge(payment.status)}
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {payment.ownerEmail || payment.ownerUserId || 'Sem responsável'}
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-950">
                    {formatMoney(payment.amountCents)} • {payment.method || 'Método não informado'}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Vencimento: {formatDate(payment.dueDate)} • Pago em: {formatDate(payment.paidAt)}
                  </p>

                  {payment.externalReference ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Referência: {payment.externalReference}
                    </p>
                  ) : null}

                  {payment.notes ? (
                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                      {payment.notes}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                  <form action={updatePaymentStatusAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <input type="hidden" name="status" value="PAID" />
                    <button className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700">
                      Marcar pago
                    </button>
                  </form>

                  <form action={updatePaymentStatusAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <input type="hidden" name="status" value="PENDING" />
                    <button className="w-full rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600">
                      Pendente
                    </button>
                  </form>

                  <form action={updatePaymentStatusAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <input type="hidden" name="status" value="FAILED" />
                    <button className="w-full rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600">
                      Falhou
                    </button>
                  </form>

                  <form action={updatePaymentStatusAction}>
                    <input type="hidden" name="code" value={code} />
                    <input type="hidden" name="paymentId" value={payment.id} />
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