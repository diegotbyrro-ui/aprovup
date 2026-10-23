'use client';

import Link from 'next/link';
import { useState } from 'react';

type Network = 'YOUTUBE' | 'TIKTOK';
type Tab = 'visao' | 'conteudos' | 'relatorios';

export function SocialPeriodPicker({ clientId, network, activeTab, selectedPeriod, startDate, endDate,
  fallbackStart, fallbackEnd, maxDate, initialCustomOpen = false }: {
  clientId: string;
  network: Network;
  activeTab: Tab;
  selectedPeriod: number | 'custom';
  startDate?: string;
  endDate?: string;
  fallbackStart: string;
  fallbackEnd: string;
  maxDate: string;
  initialCustomOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialCustomOpen || selectedPeriod === 'custom');
  const [from, setFrom] = useState(startDate || fallbackStart);
  const [to, setTo] = useState(endDate || fallbackEnd);
  const slug = network === 'YOUTUBE' ? 'youtube' : 'tiktok';
  const periodParam = network === 'YOUTUBE' ? 'period' : 'periodo';
  const base = `/clientes/${encodeURIComponent(clientId)}/${slug}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold text-slate-300">Período</span>
        {([7, 30, 90] as const).map(days => (
          <Link key={days} href={`${base}?aba=${activeTab}&${periodParam}=${days}`}
            aria-current={selectedPeriod === days ? 'page' : undefined}
            className={selectedPeriod === days
              ? 'rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950'
              : 'rounded-xl border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10'}>
            {days} dias
          </Link>
        ))}
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
          className={selectedPeriod === 'custom'
            ? 'rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950'
            : 'rounded-xl border border-white/20 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10'}>
          Personalizado
        </button>
      </div>
      {open ? (
        <form action={base} method="get"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
          <input type="hidden" name="aba" value={activeTab} />
          <input type="hidden" name={periodParam} value="custom" />
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-200">
            Data inicial
            <input type="date" name="inicio" required value={from} max={to || maxDate}
              onChange={event => setFrom(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-200">
            Data final
            <input type="date" name="fim" required value={to} min={from || undefined} max={maxDate}
              onChange={event => setTo(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900" />
          </label>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500">
            Aplicar período
          </button>
          <p className="w-full text-[11px] leading-relaxed text-slate-300">
            Intervalo inclusivo, até 366 dias. O YouTube pode não ter dados processados nos últimos três dias.
            O TikTok exibe contadores atuais dos vídeos publicados no intervalo.
          </p>
        </form>
      ) : null}
    </div>
  );
}
