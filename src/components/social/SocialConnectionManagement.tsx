import Link from 'next/link';
import { disconnectSocialConnectionAction } from '@/app/(dashboard)/configuracoes/integracoes/redes-sociais/actions';

type Platform = 'YOUTUBE' | 'TIKTOK';

const statusLabels: Record<string, string> = {
  ATIVO: 'Conectado', PENDENTE: 'Não conectado', EXPIRADO: 'Conexão expirada',
  ERRO: 'Erro na conexão', INATIVO: 'Desconectado',
};
const feedbackLabels: Record<string, string> = {
  connected: 'Conta conectada. Os dados serão consultados diretamente na plataforma.',
  disconnected: 'Conta desconectada.',
  state: 'A sessão de autorização expirou. Tente novamente.',
  denied: 'A autorização foi cancelada.',
  token: 'A plataforma recusou a autorização. Tente reconectar.',
  channel: 'O Google autorizou a conta, mas não identificou um canal do YouTube.',
  profile: 'Não foi possível identificar o perfil TikTok autorizado.',
  client: 'O cliente selecionado não está disponível para essa conexão.',
  'server-config': 'As credenciais desta plataforma não estão configuradas no servidor.',
};

export function SocialConnectionManagement({ platform, clientId, status, accountName, feedback }: {
  platform: Platform;
  clientId: string;
  status: string | null | undefined;
  accountName: string | null | undefined;
  feedback?: string | null;
}) {
  const isConnected = status === 'ATIVO';
  const name = platform === 'YOUTUBE' ? 'YouTube' : 'TikTok';
  const link = `/api/integrations/${platform.toLowerCase()}/connect?clientId=${encodeURIComponent(clientId)}`;
  const message = feedback ? feedbackLabels[feedback] : undefined;
  return (
    <section className="space-y-2">
      {message ? <p role="status" className={feedback === 'connected'
        ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800'
        : 'rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800'}>{message}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Conexão {name}</p>
          <p className={isConnected ? 'mt-1 text-xs font-bold text-emerald-700' : 'mt-1 text-xs font-bold text-amber-700'}>
            {statusLabels[status || ''] || 'Não conectado'}{isConnected && accountName ? ` · ${accountName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={link} prefetch={false} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
            {isConnected ? `Reconectar ${name}` : `Conectar ${name}`}
          </Link>
          {isConnected ? <form action={disconnectSocialConnectionAction}>
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="platform" value={platform} />
            <button type="submit" className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Desconectar</button>
          </form> : null}
        </div>
      </div>
    </section>
  );
}
