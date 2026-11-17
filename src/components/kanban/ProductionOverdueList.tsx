import Link from 'next/link';
import { formatLabel } from '@/lib/formatLabel';

type OverdueContent = {
  id: string;
  title: string;
  status: string;
  format: string | null;
  productionDeadline: Date | string | null;
  plannedDate: Date | string | null;
  client: { name: string | null };
};

function deadlineOf(item: OverdueContent) {
  return item.productionDeadline || item.plannedDate;
}

export function ProductionOverdueList({
  contents,
}: {
  contents: OverdueContent[];
}) {
  const sorted = [...contents].sort((a, b) => {
    const aTime = new Date(deadlineOf(a) || 0).getTime();
    const bTime = new Date(deadlineOf(b) || 0).getTime();
    return aTime - bTime;
  });

  return (
    <section className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-900">Todas as demandas fora do prazo</h2>
          <p className="mt-1 text-xs text-slate-500">
            Prazo de produÃ§Ã£o vencido, sem entrega Ã  anÃ¡lise ou conclusÃ£o. Ordenadas do vencimento mais antigo ao mais recente.
          </p>
        </div>
        <span className="rounded-lg bg-red-50 px-3 py-2 text-sm font-black text-red-700">
          {sorted.length} em atraso
        </span>
      </div>
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50 p-8 text-center text-sm font-semibold text-emerald-800">
          Nenhuma demanda atrasada para o filtro de cliente atual.
        </p>
      ) : (
        <div className="grid gap-3">
          {sorted.map((item) => (
            <Link
              key={item.id}
              href={`/conteudos/${item.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-red-200 hover:bg-red-50/40"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.client.name || 'Cliente'}</p>
                <h3 className="mt-1 text-sm font-black text-slate-900">{item.title || 'Demanda sem tÃ­tulo'}</h3>
                <p className="mt-1 text-xs text-slate-600">
                  {formatLabel(item.status)} Â· {formatLabel(item.format)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase text-red-500">Prazo vencido</p>
                  <p className="text-sm font-black text-red-700">
                    {deadlineOf(item)
                      ? new Date(deadlineOf(item)!).toLocaleDateString('pt-BR', { timeZone: 'America/Maceio' })
                      : 'Sem data'}
                  </p>
                </div>
                <span className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">Abrir</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}