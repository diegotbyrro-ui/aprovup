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

export default async function BasePage({ params }: PageProps) {
  const user = await requireCommanderAccess();
  const { code } = await params;

  if (!isValidDailyAccessCode(user.id, code)) {
    notFound();
  }

  const [totalLeads, totalPlans, totalSubscriptions, pendingPayments, totalCoupons] = await Promise.all([
    prisma.aprovUpLead.count(),
    prisma.saasPlan.count(),
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
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-600">
          AprovUp
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
          Central
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Área restrita para gestão sensível do AprovUp. O endereço desta área muda automaticamente todos os dias e o acesso continua protegido pela sua conta principal.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Leads captados</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {totalLeads}
          </strong>

          <Link
            href="/site/leads"
            className="mt-5 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Ver leads
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Planos</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {totalPlans}
          </strong>

          <Link
            href={`/base/${code}/planos`}
            className="mt-5 inline-flex rounded-full bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-700"
          >
            Ver planos
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Assinaturas</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {totalSubscriptions}
          </strong>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Próxima etapa: controle por agência.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Pagamentos pendentes</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {pendingPayments}
          </strong>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Próxima etapa: histórico financeiro.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Cupons</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {totalCoupons}
          </strong>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Próxima etapa: cupons de desconto.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Planos</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Liberar, pausar ou cancelar acesso de clientes ao AprovUp.
          </p>

          <Link
            href={`/base/${code}/planos`}
            className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir planos
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Pagamentos</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Separar pendentes, pagos e recebidos, com histórico por cliente.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Cupons</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Criar códigos promocionais, limitar validade e controlar uso.
          </p>
        </div>
      </section>
    </div>
  );
}