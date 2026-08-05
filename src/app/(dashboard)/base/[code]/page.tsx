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

  const [totalLeads, totalPlans, totalSubscriptions, pendingPayments, paidPayments, totalCoupons] = await Promise.all([
    prisma.aprovUpLead.count(),
    prisma.saasPlan.count(),
    prisma.saasSubscription.count(),
    prisma.saasPayment.count({
      where: {
        status: 'PENDING',
      },
    }),
    prisma.saasPayment.count({
      where: {
        status: 'PAID',
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
          Area restrita para gestao sensivel do AprovUp. O endereco desta area muda automaticamente todos os dias e o acesso continua protegido pela sua conta principal.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Leads</p>
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

          <Link
            href={`/base/${code}/assinaturas`}
            className="mt-5 inline-flex rounded-full bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-700"
          >
            Ver assinaturas
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Pendentes</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {pendingPayments}
          </strong>

          <Link
            href={`/base/${code}/pagamentos`}
            className="mt-5 inline-flex rounded-full bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-700"
          >
            Ver pagamentos
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Pagos</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {paidPayments}
          </strong>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Recebimentos confirmados.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Cupons</p>
          <strong className="mt-3 block text-4xl font-bold text-slate-950">
            {totalCoupons}
          </strong>

          <Link
            href={`/base/${code}/cupons`}
            className="mt-5 inline-flex rounded-full bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-700"
          >
            Ver cupons
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Planos</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Editar precos, limites e modulos liberados por pacote.
          </p>

          <Link
            href={`/base/${code}/planos`}
            className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir planos
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Assinaturas</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Liberar planos por agencia, pausar acesso e controlar modulos contratados.
          </p>

          <Link
            href={`/base/${code}/assinaturas`}
            className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir assinaturas
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Pagamentos</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Registrar cobrancas, pagamentos recebidos, pendentes e cancelados.
          </p>

          <Link
            href={`/base/${code}/pagamentos`}
            className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir pagamentos
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Cupons</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Criar codigos promocionais, limitar validade e controlar uso.
          </p>

          <Link
            href={`/base/${code}/cupons`}
            className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir cupons
          </Link>
        </div>
      </section>
    </div>
  );
}