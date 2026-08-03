import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCommanderAccess } from '@/lib/commanderAccess';
import { isValidDailyAccessCode } from '@/lib/dailyAccess';
import { prisma } from '@/lib/prisma';

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

function yesNo(value: boolean) {
  return value ? 'Liberado' : 'Bloqueado';
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
              Controle dos planos comerciais do AprovUp. Aqui ficam os recursos liberados para cada pacote: IA, CRM, postagem automática e relatórios.
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

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <h2 className="text-xl font-bold text-slate-950">
            Planos comerciais
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Esta é a primeira versão de visualização. Na próxima etapa vamos adicionar botões para editar, pausar e liberar módulos.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">Plano</th>
                <th className="px-6 py-4">Preço</th>
                <th className="px-6 py-4">Clientes</th>
                <th className="px-6 py-4">Usuários</th>
                <th className="px-6 py-4">IA</th>
                <th className="px-6 py-4">CRM</th>
                <th className="px-6 py-4">Social</th>
                <th className="px-6 py-4">Relatórios</th>
                <th className="px-6 py-4">Assinaturas</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-5">
                    <div>
                      <strong className="block font-bold text-slate-950">
                        {plan.name}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        {plan.slug}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-5 font-bold text-slate-950">
                    {formatMoney(plan.priceCents)}
                  </td>

                  <td className="px-6 py-5 text-slate-600">
                    {plan.maxClients}
                  </td>

                  <td className="px-6 py-5 text-slate-600">
                    {plan.maxUsers}
                  </td>

                  <td className="px-6 py-5 text-slate-600">
                    {yesNo(plan.canUseAi)}
                  </td>

                  <td className="px-6 py-5 text-slate-600">
                    {yesNo(plan.canUseCrm)}
                  </td>

                  <td className="px-6 py-5 text-slate-600">
                    {yesNo(plan.canUseSocialPosting)}
                  </td>

                  <td className="px-6 py-5 text-slate-600">
                    {yesNo(plan.canUseReports)}
                  </td>

                  <td className="px-6 py-5 text-slate-600">
                    {plan._count.subscriptions}
                  </td>

                  <td className="px-6 py-5">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {plan.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}