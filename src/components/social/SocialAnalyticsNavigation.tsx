import Link from 'next/link';

type Platform = 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE';
const platforms: Array<{ id: Platform; label: string; slug: string }> = [
  { id: 'INSTAGRAM', label: 'Instagram', slug: 'instagram' },
  { id: 'TIKTOK', label: 'TikTok', slug: 'tiktok' },
  { id: 'YOUTUBE', label: 'YouTube', slug: 'youtube' },
];

export function SocialAnalyticsNavigation({ clientId, active }: { clientId: string; active?: Platform }) {
  return (
    <nav aria-label="Análises de redes sociais" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <span className="mr-2 px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Análises</span>
      {platforms.map(platform => (
        <Link key={platform.id} href={`/clientes/${encodeURIComponent(clientId)}/${platform.slug}`}
          aria-current={active === platform.id ? 'page' : undefined}
          className={active === platform.id
            ? 'rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white'
            : 'rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100'}>
          {platform.label}
        </Link>
      ))}
      <Link href={`/pronto-para-postar?cliente=${encodeURIComponent(clientId)}`}
        className="ml-auto rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
        Pronto para Postar →
      </Link>
    </nav>
  );
}
