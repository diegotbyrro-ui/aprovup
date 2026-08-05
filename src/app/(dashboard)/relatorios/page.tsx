import { requireSaasFeature } from '@/lib/saasAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function RelatoriosPage() {
  await requireSaasFeature('reports');

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-600">
          AprovUp Relatorios
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
          Relatorios
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Modulo preparado para acompanhar entregas, aprovacoes, produtividade e resultados da operacao.
        </p>
      </section>

      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-bold text-slate-950">
          Relatorios em preparacao
        </h2>

        <p className="mt-3 text-sm text-slate-500">
          O acesso ja esta protegido por plano. A proxima etapa sera conectar os indicadores reais do AprovUp.
        </p>
      </section>
    </div>
  );
}