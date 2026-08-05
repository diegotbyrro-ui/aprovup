import { getCurrentUserSaasAccess } from '@/lib/saasAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function moduleCard(label: string, enabled: boolean) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <strong className={['mt-3 block text-2xl font-bold', enabled ? 'text-emerald-600' : 'text-slate-400'].join(' ')}>
        {enabled ? 'Liberado' : 'Bloqueado'}
      </strong>
    </div>
  );
}

export default async function MinhaAssinaturaPage() {
  const access = await getCurrentUserSaasAccess();

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-600">
          AprovUp
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
          Minha assinatura
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Veja qual plano esta ativo e quais recursos estao liberados para sua agencia.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Plano atual</p>

        <h2 className="mt-2 text-3xl font-bold text-slate-950">
          {access.isCommander ? 'Acesso total do AprovUp' : access.subscription?.plan?.name || 'Sem plano ativo'}
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</p>
            <p className="mt-1 text-sm font-bold text-slate-950">
              {access.isCommander ? 'ACESSO TOTAL' : access.subscription?.status || 'Sem assinatura'}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Valor</p>
            <p className="mt-1 text-sm font-bold text-slate-950">
              {access.subscription ? formatMoney(access.subscription.priceCents) : '-'}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Limite IA</p>
            <p className="mt-1 text-sm font-bold text-slate-950">
              {access.subscription ? formatMoney(access.subscription.monthlyAiLimitCents) : access.isCommander ? 'Ilimitado' : '-'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        {moduleCard('IA', access.permissions.canUseAi)}
        {moduleCard('CRM', access.permissions.canUseCrm)}
        {moduleCard('Social / Postagem', access.permissions.canUseSocialPosting)}
        {moduleCard('Relatorios', access.permissions.canUseReports)}
      </section>
    </div>
  );
}