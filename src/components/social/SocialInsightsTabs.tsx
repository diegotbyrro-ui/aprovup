import Link from 'next/link';

type Network = 'TIKTOK' | 'YOUTUBE';
type ActiveTab = 'visao' | 'conteudos' | 'relatorios';

const tabLabels: Array<{ id: ActiveTab; label: string }> = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'conteudos', label: 'Conteúdos' },
  { id: 'relatorios', label: 'Relatórios' },
];

export function SocialInsightsTabs({
  clientId,
  network,
  active,
  period,
  startDate,
  endDate,
}: {
  clientId: string;
  network: Network;
  active: ActiveTab;
  period: number | 'custom';
  startDate?: string;
  endDate?: string;
}) {
  const slug = network === 'YOUTUBE' ? 'youtube' : 'tiktok';
  const periodParam = network === 'YOUTUBE' ? 'period' : 'periodo';
  const base = `/clientes/${encodeURIComponent(clientId)}/${slug}`;

  return (
    <nav aria-label={`Seções de análise do ${network === 'YOUTUBE' ? 'YouTube' : 'TikTok'}`}
      className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex gap-2 overflow-x-auto">
        {tabLabels.map(tab => (
          <Link
            key={tab.id}
            href={`${base}?aba=${tab.id}&${periodParam}=${period}${period === 'custom' && startDate && endDate ? `&inicio=${encodeURIComponent(startDate)}&fim=${encodeURIComponent(endDate)}` : ''}`}
            aria-current={active === tab.id ? 'page' : undefined}
            className={active === tab.id
              ? 'whitespace-nowrap rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white'
              : 'whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100'}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
