'use client';

import { useCallback, useEffect, useState } from 'react';

type Creator = { account?: string; privacyOptions?: string[]; canTest?: boolean; maxDuration?: number;
  commentsDisabled?: boolean; duetDisabled?: boolean; stitchDisabled?: boolean; error?: string; reconnect?: boolean };
type PostStatus = { status?: string; providerStatus?: string; publishId?: string; complete?: boolean; failReason?: string; error?: string; uploadedBytes?: number | null; elapsedSeconds?: number; canAbandon?: boolean;
  uploadDiagnostic?: { phase: string; httpStatus?: number | null; diagnosticCode?: string | null; sizeBytes?: number | null } | null };

export function TikTokSandboxPublishPanel({ contentId, selected, hasVideo, initialCaption }: {
  contentId: string; selected: boolean; hasVideo: boolean; initialCaption: string;
}) {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [checking, setChecking] = useState(false);
  const [caption, setCaption] = useState(initialCaption);
  const [confirmed, setConfirmed] = useState(false);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<PostStatus | null>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch(`/api/integrations/tiktok/sandbox/post-status?contentId=${encodeURIComponent(contentId)}`, { cache: 'no-store' });
      const result = await response.json() as PostStatus;
      if (!response.ok) throw new Error(result.error || 'Não foi possível consultar o envio.');
      setStatus(result);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao consultar TikTok.'); }
    finally { setChecking(false); }
  }, [contentId]);

  useEffect(() => {
    if (!selected || !hasVideo) return;
    let active = true;
    fetch('/api/integrations/tiktok/sandbox/creator-info', { cache: 'no-store' })
      .then(async r => { const d = await r.json() as Creator; if (!r.ok) throw new Error(d.error || 'Conexão indisponível.'); return d; })
      .then(d => { if (active) setCreator(d); })
      .catch(e => { if (active) setCreator({ error: e instanceof Error ? e.message : 'Falha na consulta.' }); });
    // Initial status fetch stays asynchronous inside the effect.
    // Calling refresh() here sets state synchronously and violates react-hooks/set-state-in-effect.
    fetch(`/api/integrations/tiktok/sandbox/post-status?contentId=${encodeURIComponent(contentId)}`, { cache: 'no-store' })
      .then(async response => {
        const data = await response.json() as PostStatus;
        if (!response.ok) throw new Error(data.error || 'Não foi possível consultar o envio.');
        return data;
      })
      .then(data => { if (active) setStatus(data); })
      .catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Falha ao consultar status.'); });
    return () => { active = false; };
  }, [selected, hasVideo, contentId]);

  async function abandonStalledUpload() {
    if (!status?.canAbandon || posting) return;
    if (!window.confirm('O TikTok informa zero bytes recebidos ha mais de 30 minutos. Remover somente o rastreamento local? Isso NAO cancela a tarefa no TikTok e NAO publica outro video automaticamente. Confira antes o perfil privado.')) return;
    setPosting(true); setMessage('');
    try {
      const response = await fetch('/api/integrations/tiktok/sandbox/abandon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, confirm: 'DESCARTAR_RASTREAMENTO' }),
      });
      const data = await response.json() as PostStatus & { message?: string };
      if (!response.ok) throw new Error(data.error || 'Nao foi possivel encerrar o rastreamento.');
      setStatus({ status: 'NENHUM_ENVIO' });
      setConfirmed(false);
      setMessage(data.message || 'Rastreamento local encerrado. Nenhum video foi enviado.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao liberar teste.'); }
    finally { setPosting(false); }
  }

  async function publish() {
    if (posting || !selected || !hasVideo || !creator?.canTest || !confirmed || !caption.trim()) return;
    if (!window.confirm(`Enviar este vídeo à conta ${creator.account || 'TikTok Sandbox'} como SOMENTE EU? O envio é real, mas privado.`)) return;
    setPosting(true); setMessage('');
    try {
      const response = await fetch('/api/integrations/tiktok/sandbox/post', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, title: caption.trim(), privacy: 'SELF_ONLY', consent: true }),
      });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || 'TikTok não aceitou o envio.');
      setMessage(data.message || 'Vídeo enviado para processamento.');
      setConfirmed(false);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro no envio.');
      // Mostrar diagnostico persistido, inclusive quando o PUT falhou apos gerar publish_id.
      await refresh();
    }
    finally { setPosting(false); }
  }

  if (!selected) return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">TikTok: selecione a plataforma acima para preparar o envio de teste.</div>;
  return <section className="space-y-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-slate-900">
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-cyan-800">TikTok · Publicação em Sandbox</p>
      <p className="mt-1 text-xs text-slate-600">Teste real e privado, exclusivo da diretoria. Não marca o conteúdo como publicado para o cliente.</p>
    </div>
    {!hasVideo ? <p role="alert" className="text-amber-800">Envie um arquivo MP4 final para liberar este teste.</p> : <>
      <p className="text-xs"><b>Conta de destino:</b> {creator?.account || 'Consultando conta...'}</p>
      {creator?.error ? <p role="alert" className="text-xs font-semibold text-red-700">{creator.error} <a className="underline" href="/configuracoes/integracoes/tiktok-sandbox">Abrir TikTok Sandbox</a></p> : null}
      <div className="rounded-lg bg-white p-3 text-xs">
        <b>Privacidade: Somente eu (SELF_ONLY)</b>
        <p className="mt-1 text-slate-500">Opções autorizadas nesta conta: {(creator?.privacyOptions || []).join(', ') || 'Consultando...'}. O teste utiliza somente a opção privada.</p>
        <p className="mt-1 text-slate-500">Comentários, Duetos e Costuras desativados neste envio. Limite de duração informado pelo TikTok: {creator?.maxDuration ? `${creator.maxDuration} segundos` : 'não informado'}.</p>
      </div>
      <label className="block text-xs font-bold" htmlFor={`sandbox-caption-${contentId}`}>Legenda TikTok (editável, apenas para este teste)</label>
      <textarea id={`sandbox-caption-${contentId}`} value={caption} onChange={e => setCaption(e.target.value)} maxLength={2200} rows={3}
        className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs outline-none focus:border-cyan-500" />
      <label className="flex items-start gap-2 text-xs leading-relaxed">
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />
        <span>Confirmo que revisei o vídeo e a legenda e autorizo enviar este conteúdo real ao meu TikTok como <b>Somente eu</b>, sujeito ao processamento e às regras do TikTok.</span>
      </label>
      <button type="button" disabled={posting || !creator?.canTest || !confirmed || !caption.trim() || (status?.status !== 'NENHUM_ENVIO' && Boolean(status?.publishId))}
        onClick={() => void publish()} className="w-full rounded-lg bg-slate-950 px-3 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">
        {posting ? 'Enviando arquivo...' : 'Publicar teste privado no TikTok'}
      </button>
      {message ? <p role="status" className="text-xs text-slate-700">{message}</p> : null}
      <div className="flex items-center justify-between gap-2 border-t border-cyan-200 pt-3">
        <div className="text-xs"><b>Status TikTok:</b> {status?.status === 'PUBLICADO_PRIVADO' ? 'Publicado como Somente eu' : status?.status === 'FALHA_NA_TRANSFERENCIA' ? 'Falha no upload do arquivo' : status?.status || 'Consultando...'}</div>
        <button type="button" onClick={() => void refresh()} disabled={checking || posting}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">
          {checking ? 'Verificando...' : 'Atualizar status'}
        </button>
      </div>
      {status?.uploadDiagnostic?.phase === 'ARQUIVO_NAO_CONFIRMADO' ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-950">
          <b>Arquivo ainda nao confirmado pelo servidor:</b> a solicitacao de publicacao recebeu um identificador,
          mas o upload binario nao teve confirmacao HTTP 201.
          {' '}Resultado da transferencia: <b>{status.uploadDiagnostic.httpStatus == null ? 'sem resposta HTTP' : `HTTP ${status.uploadDiagnostic.httpStatus}`}</b>.
          {' '}Diagnostico: <b>{status.uploadDiagnostic.diagnosticCode || 'indisponivel'}</b>.
          {' '}Tamanho do arquivo: <b>{status.uploadDiagnostic.sizeBytes == null ? 'nao informado' : `${status.uploadDiagnostic.sizeBytes.toLocaleString('pt-BR')} bytes`}</b>.
          {' '}Nao tente novamente sem conferir o perfil privado e o status remoto.
        </p>
      ) : null}
      {status?.providerStatus === 'PROCESSING_UPLOAD' ? (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
          O TikTok ainda informa <b>envio do arquivo em andamento</b>.
          {' '}Bytes recebidos: <b>{status.uploadedBytes == null ? 'não informados pela API' : status.uploadedBytes.toLocaleString('pt-BR')}</b>.
          {' '}Tempo desde o início: <b>{status.elapsedSeconds == null ? 'não disponível' : `${Math.floor(status.elapsedSeconds / 60)} min`}</b>.
          {typeof status.elapsedSeconds === 'number' && status.elapsedSeconds >= 900
            ? ' O envio está demorando mais que o esperado. Não tente publicar novamente antes de verificar o resultado e o arquivo.'
            : ' Use Atualizar status para consultar o andamento real.'}
        </p>
      ) : null}
      {status?.canAbandon ? (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-white p-3 text-xs">
          <p><b>Upload parado:</b> a API informa zero bytes ha mais de 30 minutos. O arquivo anterior nao foi confirmado. Confira o perfil privado antes de qualquer novo teste.</p>
          <button type="button" onClick={() => void abandonStalledUpload()} disabled={posting}
            className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 font-bold text-amber-950 disabled:opacity-50">
            Encerrar rastreamento travado (nao republica)
          </button>
        </div>
      ) : null}
      {status?.uploadDiagnostic?.phase === 'ARQUIVO_CONFIRMADO' ? (
        <p role="status" className="rounded-lg border border-cyan-200 bg-white p-2 text-xs text-cyan-950">
          Transferencia HTTP do MP4 confirmada pelo TikTok: <b>HTTP {status.uploadDiagnostic.httpStatus}</b>.
          {' '}A publicacao ainda depende do estado remoto PUBLISH_COMPLETE. Nao republicar enquanto houver rastreamento.
        </p>
      ) : null}
      {status?.failReason ? <p className="text-xs text-red-700">TikTok informou falha: {status.failReason}</p> : null}
      {status?.publishId ? <p className="break-all text-[10px] text-slate-500">ID de rastreio: {status.publishId}</p> : null}
      <p className="text-[10px] text-slate-500">O envio não significa publicação concluída. A confirmação depende de PUBLISH_COMPLETE no TikTok. O teste não altera os estados de publicação do cliente.</p>
    </>}
  </section>;
}
