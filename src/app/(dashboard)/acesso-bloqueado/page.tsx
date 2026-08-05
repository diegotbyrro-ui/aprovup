import Link from 'next/link';
import { requireCurrentUser } from '@/lib/auth';
import { getCurrentUserSaasAccess } from '@/lib/saasAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function AcessoBloqueadoPage() {
  const user = await requireCurrentUser();
  const access = await getCurrentUserSaasAccess();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-600">
          AprovUp
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
          Acesso bloqueado
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Este recurso nao esta liberado para a sua assinatura atual.
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
          <p>
            Usuario: <strong>{user.name || user.email}</strong>
          </p>

          <p className="mt-2">
            Plano atual: <strong>{access.subscription?.plan?.name || 'Sem plano ativo'}</strong>
          </p>

          <p className="mt-2">
            Status: <strong>{access.subscription?.status || 'Sem assinatura ativa'}</strong>
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/clientes"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Voltar ao sistema
          </Link>

          <a
            href="https://wa.me/5582981122022"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Falar com AprovUp
          </a>
        </div>
      </section>
    </div>
  );
}