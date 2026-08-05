import Link from 'next/link';

type FeatureBlockedCardProps = {
  title: string;
  description?: string;
};

export function FeatureBlockedCard({
  title,
  description = 'Este recurso nao esta liberado para a assinatura atual da sua agencia.',
}: FeatureBlockedCardProps) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-700">
        Recurso bloqueado
      </p>

      <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {title}
      </h2>

      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-amber-900">
        {description}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/minha-assinatura"
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Ver minha assinatura
        </Link>

        <a
          href="https://wa.me/5582981122022"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-amber-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-amber-100"
        >
          Falar com AprovUp
        </a>
      </div>
    </section>
  );
}