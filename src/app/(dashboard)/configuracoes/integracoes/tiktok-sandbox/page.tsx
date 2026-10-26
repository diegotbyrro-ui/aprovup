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
  const keyAvailable = Boolean(config.key);
  const secretAvailable = Boolean(config.secret);
  const prodKey = process.env.TIKTOK_CLIENT_KEY || '';
  const differentKeys = keyAvailable && config.key !== prodKey;
  const reason = !keyAvailable
    ? 'O servidor nao recebeu TIKTOK_SANDBOX_CLIENT_KEY.'
    : !secretAvailable
      ? 'O servidor nao recebeu TIKTOK_SANDBOX_CLIENT_SECRET.'
      : !differentKeys
        ? 'O Client Key do Sandbox coincide com o da producao. Confirme qual chave esta cadastrada em cada ambiente.'
        : 'Os tres testes foram atendidos.';
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-2 pb-12">
      <div className="rounded-3xl bg-slate-950 p-7 text-white">
        <Link href="/configuracoes/integracoes" className="text-xs font-semibold text-blue-200 hover:underline">← Voltar para integrações</Link>
        <p className="mt-6 text-xs font-black uppercase tracking-widest text-cyan-300">Ambiente exclusivo da diretoria</p>
        <h1 className="mt-2 text-3xl font-black">TikTok Sandbox</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">Teste de autorização e leitura de métricas para a revisão do TikTok. Não altera as conexões dos clientes, não publica vídeos e não grava tokens de teste no banco de produção.</p>
      </div>
      {!config.ready ? <section role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <h2 className="font-bold">Diagnóstico do TikTok Sandbox</h2>
        <p className="mt-2">{reason}</p>
        <ul className="mt-3 space-y-1 rounded-xl bg-white/70 p-3">
          <li>Client Key do Sandbox carregada: <strong>{keyAvailable ? 'SIM' : 'NÃO'}</strong></li>
          <li>Client Secret do Sandbox carregado: <strong>{secretAvailable ? 'SIM' : 'NÃO'}</strong></li>
          <li>Client Key diferente da produção: <strong>{keyAvailable ? (differentKeys ? 'SIM' : 'NÃO') : 'NÃO VERIFICÁVEL'}</strong></li>
        </ul>
        <p className="mt-2 text-xs">Nenhum valor de chave, segredo ou token é exibido. Não modifique as credenciais oficiais.</p>
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
