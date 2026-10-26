import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/userAccess';
import { sandboxConfig } from '@/lib/tiktokSandbox';
import { TikTokSandboxPanel } from './TikTokSandboxPanel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TikTokSandboxPage({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requirePermission('settings.manage');
  if (user.role !== 'DIRECTOR') redirect('/acesso-bloqueado');
  const query = await searchParams;
  const config = sandboxConfig();
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-2 pb-12">
      <div className="rounded-3xl bg-slate-950 p-7 text-white">
        <Link href="/configuracoes/integracoes" className="text-xs font-semibold text-blue-200 hover:underline">← Voltar para integrações</Link>
        <p className="mt-6 text-xs font-black uppercase tracking-widest text-cyan-300">Ambiente exclusivo da diretoria</p>
        <h1 className="mt-2 text-3xl font-black">TikTok Sandbox</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">Teste de autorização e leitura de métricas para a revisão do TikTok. Não altera as conexões dos clientes, não publica vídeos e não grava tokens de teste no banco de produção.</p>
      </div>
      {!config.ready ? <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <b>Configuração pendente.</b> Adicione na Hostinger <code>TIKTOK_SANDBOX_CLIENT_KEY</code> e <code>TIKTOK_SANDBOX_CLIENT_SECRET</code> com as credenciais do Sandbox (nunca as da produção). Depois atualize a aplicação.
      </section> : null}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <b>Redirect URI exclusivo do Sandbox</b>
        <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-3 font-mono text-xs">{config.redirectUri}</p>
        <p className="mt-2 text-xs text-slate-500">Adicione esta URL à lista Web do Login Kit no Sandbox do TikTok Developers, mantendo também a URL de produção já cadastrada.</p>
      </div>
      <TikTokSandboxPanel configured={config.ready} feedback={query.status || ''} />
    </div>
  );
}
