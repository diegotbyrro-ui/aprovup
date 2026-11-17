'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

const OPTIONS = [
  { value: 'TODOS', label: 'Todos os dias' },
  { value: 'HOJE', label: 'Hoje' },
  { value: 'AMANHA', label: 'Amanhã' },
  { value: 'SEMANA', label: 'Esta semana' },
  { value: '7_DIAS', label: 'Próximos 7 dias' },
  { value: 'DATA', label: 'Dia específico' },
  { value: 'SEM_DATA', label: 'Sem data' },
];

export function ProductionDeadlineFilter() {
  const router = useRouter();
  const path = usePathname();
  const query = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const requested = (query.get('periodo') || 'TODOS').toUpperCase();
  const period = OPTIONS.some((option) => option.value === requested) ? requested : 'TODOS';
  const day = query.get('dia') || '';

  function apply(nextPeriod: string, nextDay: string) {
    const next = new URLSearchParams(query.toString());
    next.delete('visao');
    if (nextPeriod === 'TODOS') {
      next.delete('periodo');
      next.delete('dia');
    } else {
      next.set('periodo', nextPeriod);
      if (nextPeriod === 'DATA' && nextDay) next.set('dia', nextDay);
      else next.delete('dia');
    }
    const suffix = next.toString();
    startTransition(() => router.replace(path + (suffix ? `?${suffix}` : ''), { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtro por dia de entrega">
      <label className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 shadow-sm">
        <span className="whitespace-nowrap text-[9px] font-bold text-slate-500">Entrega</span>
        <select
          aria-label="Filtrar demandas pelo dia da entrega"
          value={period}
          disabled={isPending}
          onChange={(event) => apply(event.target.value, day)}
          className="max-w-[170px] bg-transparent text-[10px] font-semibold text-slate-700 outline-none"
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      {period === 'DATA' ? (
        <label className="flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 shadow-sm">
          <span className="text-[9px] font-bold text-slate-500">Dia</span>
          <input
            aria-label="Escolher dia específico de entrega"
            type="date"
            value={day}
            disabled={isPending}
            onChange={(event) => apply('DATA', event.target.value)}
            className="bg-transparent text-[10px] font-semibold text-slate-700 outline-none"
          />
        </label>
      ) : null}
    </div>
  );
}