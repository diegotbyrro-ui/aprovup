'use client';
import { useEffect, useState } from 'react';

type Video = { id: string; title: string; publishedAt: number | null; shareUrl: string | null;
  views: number; likes: number; comments: number; shares: number };
type Data = {
  connected: boolean; account?: string; scopes?: string[]; canList?: boolean; canStats?: boolean;
  stats?: { followers: number | null; likes: number | null; videos: number | null } | null;
  videos?: Video[]; hasMore?: boolean; error?: string; note?: string;
};
const labels: Record<string, string> = {
  conectado: 'Conta de testes autorizada. Verificando dados reais…',
  desconectado: 'Sessão de testes desconectada deste navegador.',
  'autorizacao-falhou': 'O TikTok não concluiu a autorização. Confirme credenciais e Redirect URI do Sandbox.',
  'sessao-invalida': 'Sessão de autorização inválida ou expirada. Tente novamente.',
  'acesso-cancelado': 'A autorização foi cancelada no TikTok.',
  'acesso-negado': 'Somente a diretoria pode acessar este ambiente.',
  'configuracao-pendente': 'As credenciais do Sandbox ainda não foram configuradas.',
};
const number = (value: number | null | undefined) => value == null ? 'Não disponível' : new Intl.NumberFormat('pt-BR').format(value);

export function TikTokSandboxPanel({ configured, feedback }: { configured: boolean; feedback: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/integrations/tiktok/sandbox/data', { cache: 'no-store', signal: controller.signal })
      .then(async r => await r.json() as Data).then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(() => { if (!controller.signal.aborted) setData({ connected: false, error: 'Não foi possível consultar o modo de teste.' }); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [nonce]);
  return <div className="space-y-5">
    {feedback && labels[feedback] ? <p role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">{labels[feedback]}</p> : null}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">Conexão Sandbox (separada da produção)</p>
          <p className="mt-2 text-lg font-bold text-slate-950">{loading ? 'Consultando…' : data?.connected ? data.account || 'Conta conectada' : 'Aguardando conexão de teste'}</p>
          {data?.scopes?.length ? <p className="mt-1 text-xs text-slate-500">Escopos autorizados: {data.scopes.join(', ')}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {configured ? <a href="/api/integrations/tiktok/sandbox/connect" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">{data?.connected ? 'Reconectar Sandbox' : 'Conectar Sandbox'}</a> : null}
          <button type="button" onClick={() => { setLoading(true); setNonce(v => v + 1); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Atualizar métricas</button>
          {data?.connected ? <form method="post" action="/api/integrations/tiktok/sandbox/disconnect"><button type="submit" className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700">Encerrar teste</button></form> : null}
        </div>
      </div>
      {data?.error ? <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{data.error}</p> : null}
    </section>
    {data?.connected ? <>
      {!data.canList ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">O TikTok ainda não concedeu <code>video.list</code> nesta autorização. Confira os escopos do Sandbox e reconecte.</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: 'Seguidores', value: data.stats?.followers }, { label: 'Curtidas do perfil', value: data.stats?.likes }, { label: 'Vídeos públicos do perfil', value: data.stats?.videos }].map(item => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-black text-slate-950">{number(item.value)}</p></div>)}
      </div>
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Vídeos públicos recentes ({data.videos?.length || 0})</h2>
        <p className="text-xs text-slate-500">{data.note || 'Consulta das métricas disponíveis no Sandbox.'}{data.hasMore ? ' Há mais vídeos além dos 20 apresentados.' : ''}</p>
        {!data.videos?.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Nenhum vídeo retornado. Verifique a autorização e se o perfil de teste tem vídeos públicos.</p> : <div className="divide-y divide-slate-100">{data.videos.map(video => <article key={video.id} className="space-y-2 py-3"><div className="flex flex-wrap items-start justify-between gap-2"><p className="max-w-3xl text-sm font-bold text-slate-900">{video.title}</p>{video.shareUrl ? <a href={video.shareUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-700">Abrir no TikTok ↗</a> : null}</div><p className="text-xs text-slate-500">{number(video.views)} visualizações · {number(video.likes)} curtidas · {number(video.comments)} comentários · {number(video.shares)} compartilhamentos</p></article>)}</div>}
      </section>
    </> : null}
    <p className="text-xs leading-relaxed text-slate-500">Segurança: sessão de teste criptografada em cookie HttpOnly, vinculada ao diretor e expira após três dias. Não altera os registros SocialConnection, não publica vídeos e não substitui a autenticação de produção.</p>
  </div>;
}
