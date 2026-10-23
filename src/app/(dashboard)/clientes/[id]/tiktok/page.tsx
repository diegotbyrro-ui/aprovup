import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { canAccessClient } from '@/lib/clientAccess';
import { requirePermission } from '@/lib/userAccess';
import { SocialAnalyticsNavigation } from '@/components/social/SocialAnalyticsNavigation';
import { SocialInsightsTabs } from '@/components/social/SocialInsightsTabs';
import { SocialPeriodPicker } from '@/components/social/SocialPeriodPicker';
import { isValidSocialRange, socialPresetRange, socialTodayMaceio, type SocialDateRange } from '@/lib/socialAnalyticsPeriod';
import { SocialConnectionManagement } from '@/components/social/SocialConnectionManagement';
import { getTikTokDashboard, type TikTokVideo } from '@/lib/tiktokDashboard';

export const dynamic = 'force-dynamic';
const numberLabel = (value: number | null | undefined) => value === null || value === undefined ? 'Não disponível' : new Intl.NumberFormat('pt-BR').format(value);
const dateLabel = (timestamp: number) => timestamp > 0 ? new Date(timestamp * 1000).toLocaleDateString('pt-BR', { timeZone: 'America/Maceio' }) : 'Sem data';

function Metric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-bold text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    <p className="mt-2 text-xs text-slate-500">{helper}</p>
  </div>;
}

function VideoList({ videos }: { videos: TikTokVideo[] }) {
  if (!videos.length) return <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">Nenhum vídeo público encontrado neste período dentro do histórico consultado.</p>;
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {videos.map(video => <article key={video.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex gap-3 p-4">
        {video.coverUrl ? <img src={video.coverUrl} alt="Capa do vídeo" className="h-24 w-20 rounded-lg object-cover" /> : <div className="flex h-24 w-20 items-center justify-center rounded-lg bg-slate-900 text-xs text-white">TikTok</div>}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-3 text-sm font-bold text-slate-900">{video.title}</p>
          <p className="mt-2 text-xs text-slate-500">Publicado em {dateLabel(video.createdAt)}</p>
          <p className="mt-2 text-xs font-bold text-slate-700">{numberLabel(video.views)} visualizações</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 bg-slate-50 p-3 text-center text-[11px] text-slate-600">
        <span><b className="block text-slate-900">{numberLabel(video.likes)}</b>Curtidas</span>
        <span><b className="block text-slate-900">{numberLabel(video.comments)}</b>Comentários</span>
        <span><b className="block text-slate-900">{numberLabel(video.shares)}</b>Compart.</span>
      </div>
      {video.shareUrl && <a href={video.shareUrl} target="_blank" rel="noopener noreferrer" className="block border-t border-slate-100 px-4 py-3 text-xs font-bold text-blue-700 hover:bg-blue-50">Abrir no TikTok ↗</a>}
    </article>)}
  </div>;
}

export default async function ClientTikTokPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ aba?: string; periodo?: string; tiktok?: string; inicio?: string; fim?: string }>;
}) {
  const user = await requirePermission('social.view');
  const { id } = await params;
  const query = await searchParams;
  const customRequested = query?.periodo === 'custom';
  const customRange: SocialDateRange | undefined = customRequested && isValidSocialRange(query?.inicio, query?.fim)
    ? { startDate: query!.inicio!, endDate: query!.fim! } : undefined;
  const customError = customRequested && !customRange;
  const value = Number(query?.periodo || 30);
  const days = value === 7 || value === 90 ? value : 30;
  const selectedPeriod = customRange ? 'custom' : days;
  const fallbackRange = socialPresetRange(30);
  const tab = query?.aba === 'conteudos' || query?.aba === 'relatorios' ? query.aba : 'visao';
  const client = await prisma.client.findFirst({
    where: { id, agencyId: user.agencyId },
    select: { id: true, name: true, logoUrl: true, agencyId: true, internalResponsible: true },
  });
  if (!client || !canAccessClient(user, client)) notFound();
  const connection = await prisma.socialConnection.findUnique({
    where: { clientId_platform: { clientId: client.id, platform: 'TIKTOK' } },
    select: { status: true, accountName: true },
  });
  let dashboard: Awaited<ReturnType<typeof getTikTokDashboard>> | null = null;
  let error = '';
  try { dashboard = await getTikTokDashboard(client.id, days, customRange); }
  catch (caught) { console.error('APROVUP_TIKTOK_DASHBOARD_ERROR', caught); error = caught instanceof Error ? caught.message : 'Falha ao carregar vídeos do TikTok.'; }
  const videos = dashboard?.periodVideos || [];
  const totals = dashboard?.totals;
  const top = [...videos].sort((a, b) => b.views - a.views).slice(0, 10);
  const maxViews = Math.max(1, ...top.map(item => item.views));
  return <div className="mx-auto max-w-7xl space-y-5 p-1 pb-10">
    <header className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm">
      <Link href="/clientes" className="text-xs font-bold text-blue-200 hover:underline">← Voltar para clientes</Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-xl font-black text-slate-950">
            {client.logoUrl ? <img src={client.logoUrl} alt="" className="h-full w-full object-cover" /> : client.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-cyan-300">TikTok Analytics</p>
            <h1 className="mt-1 text-3xl font-black">{client.name}</h1>
            <p className="mt-2 text-sm text-slate-300">{dashboard?.accountName || connection?.accountName || 'Perfil não conectado'}</p>
          </div>
        </div>
        <SocialPeriodPicker clientId={client.id} network="TIKTOK" activeTab={tab}
          selectedPeriod={selectedPeriod} startDate={customRange?.startDate} endDate={customRange?.endDate}
          fallbackStart={fallbackRange.startDate} fallbackEnd={fallbackRange.endDate}
          maxDate={socialTodayMaceio()} initialCustomOpen={customRequested} />
      </div>
    </header>
    <SocialAnalyticsNavigation clientId={client.id} active="TIKTOK" />
    {customError ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Intervalo inválido. Selecione datas até hoje, em ordem crescente, com até 366 dias. Exibindo os últimos 30 dias.</p> : null}
    <SocialInsightsTabs clientId={client.id} network="TIKTOK" active={tab} period={selectedPeriod} startDate={customRange?.startDate} endDate={customRange?.endDate} />
    <SocialConnectionManagement platform="TIKTOK" clientId={client.id} status={connection?.status} accountName={connection?.accountName} feedback={query?.tiktok} />
    {!dashboard?.connected ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-lg font-black text-amber-900">TikTok ainda não conectado</h2>
      <p className="mt-2 text-sm text-amber-800">Vincule o TikTok deste cliente para carregar dados autorizados.</p>
      <Link href={`/api/integrations/tiktok/connect?clientId=${encodeURIComponent(client.id)}`} className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Conectar conta</Link>
    </section> : !dashboard.scopeReady ? <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <h2 className="text-sm font-bold text-amber-950">Aguardando autorização para analisar os vídeos do TikTok</h2>
      <p className="mt-2 text-xs leading-relaxed text-amber-900">A conta está conectada, mas não autorizou o escopo <b>video.list</b>. Após a aprovação do Display API no TikTok for Developers, ative <code>TIKTOK_DISPLAY_API_ENABLED=true</code> na hospedagem e use o botão <b>Reconectar TikTok</b> na seção acima. Nenhuma métrica será simulada.</p>
    </section> : null}
    {error && <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><b>Não foi possível carregar os dados do TikTok:</b> {error}</section>}
    {dashboard?.scopeReady && !error && <>

      {tab !== 'conteudos' && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Visualizações acumuladas" value={numberLabel(totals?.views)} helper="Dos vídeos publicados no período; não são visualizações ocorridas apenas neste período" />
        <Metric label="Curtidas" value={numberLabel(totals?.likes)} helper="Curtidas atuais desses vídeos" />
        <Metric label="Comentários" value={numberLabel(totals?.comments)} helper="Comentários atuais desses vídeos" />
        <Metric label="Compartilhamentos" value={numberLabel(totals?.shares)} helper="Compartilhamentos atuais desses vídeos" />
        <Metric label="Vídeos publicados" value={numberLabel(videos.length)} helper="Nos últimos dias selecionados, limitado aos 100 vídeos recentes consultados" />
        <Metric label="Seguidores do perfil" value={numberLabel(dashboard.profile?.followers)} helper="Disponível somente com autorização user.info.stats" />
        <Metric label="Total de vídeos públicos" value={numberLabel(dashboard.profile?.videoCount)} helper="Disponível somente com autorização user.info.stats" />
        <Metric label="Curtidas do perfil" value={numberLabel(dashboard.profile?.likes)} helper="Disponível somente com autorização user.info.stats" />
      </section>}
      {tab === 'visao' || tab === 'relatorios' ? <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4"><h2 className="text-lg font-black text-slate-900">Ranking de vídeos por visualizações</h2><p className="mt-1 text-xs text-slate-500">Cada barra representa o acumulado atual de visualizações do vídeo; não é uma série histórica diária.</p></div>
        {top.length ? <div className="space-y-4">{top.map(v => <div key={v.id}><div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="max-w-[70%] truncate font-bold text-slate-700">{v.title}</span><span className="font-black">{numberLabel(v.views)}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-3 rounded-full bg-cyan-600" style={{ width: `${v.views / maxViews * 100}%` }} /></div></div>)}</div> : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Não há vídeos para comparar no período.</p>}
      </section> : null}
      {tab === 'visao' || tab === 'conteudos' ? <section className="space-y-4"><h2 className="text-lg font-black text-slate-950">Vídeos do período</h2><VideoList videos={videos} /></section> : null}
      {tab === 'relatorios' && <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-600"><b>Sobre os dados:</b> o TikTok Display API fornece contadores atuais por vídeo, não a evolução histórica diária de visualizações. Esta página consulta até 100 vídeos públicos recentes. A comparação com o Instagram e o YouTube deve respeitar as diferenças de cada plataforma. {dashboard.hasMore ? 'Há vídeos mais antigos além do limite consultado.' : ''}</section>}
    </>}
  </div>;
}
