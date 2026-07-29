const statusLabels: Record<string, string> = {
  IDEIA: 'Ideia',
  ROTEIRO: 'Roteiro',
  AGENDAMENTO_PRODUCAO: 'Agendamento de Produção',
  DESIGN: 'Design',
  EDICAO: 'Edição',
  REVISAO_INTERNA: 'Revisão Interna',
  ENVIADO_CLIENTE: 'Enviado ao Cliente',
  ALTERACAO_SOLICITADA: 'Alteração Solicitada',
  APROVADO: 'Aprovado',
  PRONTO_PARA_POSTAR: 'Pronto para Postar',
  PUBLICADO_MANUALMENTE: 'Publicado',
  ARQUIVADO: 'Arquivado',
};

const statusClasses: Record<string, string> = {
  IDEIA: 'bg-slate-100 text-slate-700 border-slate-200',
  ROTEIRO: 'bg-purple-50 text-purple-700 border-purple-100',
  AGENDAMENTO_PRODUCAO: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  DESIGN: 'bg-blue-50 text-blue-700 border-blue-100',
  EDICAO: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  REVISAO_INTERNA: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  ENVIADO_CLIENTE: 'bg-orange-50 text-orange-700 border-orange-100',
  ALTERACAO_SOLICITADA: 'bg-red-50 text-red-700 border-red-100',
  APROVADO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  PRONTO_PARA_POSTAR: 'bg-teal-50 text-teal-700 border-teal-100',
  PUBLICADO_MANUALMENTE: 'bg-slate-900 text-white border-slate-900',
  ARQUIVADO: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClasses[status] || statusClasses.IDEIA
        }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

