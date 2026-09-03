import { formatLabel } from '@/lib/formatLabel';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { deleteContentAction } from './delete-actions';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { updateContent, addComment, addTask, completeTask } from '@/app/actions';
import { InstagramPreview } from '@/components/content/InstagramPreview';
import { CoverImageUpload } from './CoverImageUpload';
import { CarouselFinalUpload } from '@/components/content/CarouselFinalUpload';
import { inputClasses, labelClasses } from '@/lib/styles';
import { generateApprovalLink } from './contentActions';

const areaLabels: Record<string, string> = {
  DESIGN: 'Design',
  FILMMAKER: 'Filmmaker',
  SOCIAL_DESIGN: 'Design',
  AUDIOVISUAL: 'Filmmaker',
  GERAL: 'Geral',
};

const priorityLabels: Record<string, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

const priorityClasses: Record<string, string> = {
  BAIXA: 'bg-slate-100 text-slate-600 border-slate-200',
  MEDIA: 'bg-blue-50 text-blue-700 border-blue-100',
  ALTA: 'bg-orange-50 text-orange-700 border-orange-200',
  URGENTE: 'bg-red-50 text-red-700 border-red-200',
};

const statusOptions = [
  { value: 'IDEIA', label: 'Ideia' },
  { value: 'ROTEIRO', label: 'Roteiro' },
  { value: 'AGENDAMENTO_PRODUCAO', label: 'Agendamento de Produção' },
  { value: 'DESIGN', label: 'Design / Pré-produção' },
  { value: 'EDICAO', label: 'Edição' },
  { value: 'REVISAO_INTERNA', label: 'Revisão Interna' },
  { value: 'ENVIADO_CLIENTE', label: 'ENVIADO_AO_CLIENTE' },
  { value: 'ALTERACAO_SOLICITADA', label: 'Alteração Solicitada' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'PRONTO_PARA_POSTAR', label: 'PRONTO_PARA_POSTAR' },
  { value: 'PUBLICADO_MANUALMENTE', label: 'Publicado manualmente' },
  { value: 'PUBLICADO', label: 'Publicado automaticamente' },
  { value: 'ARQUIVADO', label: 'Arquivado' },
];

const priorities = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

function formatDate(date: Date | null) {
  if (!date) return 'Sem data';

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(date: Date | null) {
  if (!date) return 'Sem data';

  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateInput(date: Date | null) {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

function isLate(date: Date | null, status: string) {
  if (!date) return false;

  if (['PUBLICADO', 'PUBLICADO_MANUALMENTE', 'ARQUIVADO'].includes(status)) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const current = new Date(date);
  current.setHours(0, 0, 0, 0);

  return current < today;
}

function getNextStep(status: string, area: string) {
  if (status === 'IDEIA') {
    return {
      title: 'Organizar planejamento',
      description:
        'Preencha objetivo, briefing, legenda base, área responsável, prioridade e data prevista antes de avançar.',
      color: 'slate',
      actionLabel: 'Salvar planejamento',
      nextStatus: null,
    };
  }

  if (status === 'ROTEIRO') {
    return {
      title: 'Finalizar roteiro ou briefing',
      description:
        'Deixe o direcionamento pronto para que o cliente aprove no calendário mensal ou para liberar internamente.',
      color: 'purple',
      actionLabel: 'Liberar para produção',
      nextStatus: 'AGENDAMENTO_PRODUCAO',
    };
  }

  if (status === 'AGENDAMENTO_PRODUCAO') {
    return {
      title:
        (area === 'FILMMAKER' || area === 'AUDIOVISUAL')
          ? 'Iniciar produção audiovisual'
          : (area === 'DESIGN' || area === 'SOCIAL_DESIGN')
            ? 'Iniciar criação visual'
            : 'Iniciar produção',
      description:
        'O planejamento já foi aprovado. Agora a equipe pode iniciar a produção da peça.',
      color: 'cyan',
      actionLabel:
        (area === 'FILMMAKER' || area === 'AUDIOVISUAL')
          ? 'Mover para pré-produção'
          : 'Mover para design',
      nextStatus: 'DESIGN',
    };
  }

  if (status === 'DESIGN') {
    return {
      title:
        (area === 'FILMMAKER' || area === 'AUDIOVISUAL')
          ? 'Organizar pré-produção'
          : 'Produzir material visual',
      description:
        'Finalize a peça, arte, carrossel, criativo ou preparação audiovisual. Depois envie para revisão interna.',
      color: 'blue',
      actionLabel: 'Enviar para revisão interna',
      nextStatus: 'REVISAO_INTERNA',
    };
  }

  if (status === 'EDICAO') {
    return {
      title: 'Finalizar edição',
      description:
        'Finalize cortes, ajustes, trilha, legenda e acabamento. Depois envie para revisão interna.',
      color: 'blue',
      actionLabel: 'Enviar para revisão interna',
      nextStatus: 'REVISAO_INTERNA',
    };
  }

  if (status === 'REVISAO_INTERNA') {
    return {
      title: 'Revisar antes de enviar ao cliente',
      description:
        'Confira briefing, legenda, material final, link do arquivo e qualidade da peça antes de enviar para aprovação.',
      color: 'yellow',
      actionLabel: 'Marcar como enviado ao cliente',
      nextStatus: 'ENVIADO_CLIENTE',
    };
  }

  if (status === 'ENVIADO_CLIENTE') {
    return {
      title: 'Aguardar aprovação final',
      description:
        'O material está com o cliente. Use o link de aprovação final para o cliente aprovar ou pedir alteração.',
      color: 'orange',
      actionLabel: 'Abrir link de aprovação',
      nextStatus: null,
    };
  }

  if (status === 'ALTERACAO_SOLICITADA') {
    return {
      title: 'Executar ajuste solicitado',
      description:
        'Leia o comentário do cliente, ajuste a peça e envie novamente para revisão interna.',
      color: 'red',
      actionLabel: 'Enviar ajuste para revisão interna',
      nextStatus: 'REVISAO_INTERNA',
    };
  }

  if (status === 'APROVADO') {
    return {
      title: 'Preparar para postagem',
      description:
        'O cliente aprovou. Confira legenda e material final antes de mandar para a fila de postagem.',
      color: 'emerald',
      actionLabel: 'Mover para pronto para postar',
      nextStatus: 'PRONTO_PARA_POSTAR',
    };
  }

  if (status === 'PRONTO_PARA_POSTAR') {
    return {
      title: 'Publicar manualmente',
      description:
        'Copie a legenda, abra o material final e marque como publicado após postar na plataforma correta.',
      color: 'emerald',
      actionLabel: 'Marcar como publicado',
      nextStatus: 'PUBLICADO_MANUALMENTE',
    };
  }

  if (['PUBLICADO', 'PUBLICADO_MANUALMENTE'].includes(status)) {
    return {
      title: 'Conteúdo publicado',
      description:
        'Esse conteúdo já foi finalizado no fluxo operacional.',
      color: 'slate',
      actionLabel: null,
      nextStatus: null,
    };
  }

  return {
    title: 'Acompanhar conteúdo',
    description:
      'Verifique status, briefing, comentários, tarefas e histórico antes de avançar.',
    color: 'slate',
    actionLabel: null,
    nextStatus: null,
  };
}


function getClientCommentTone(
  message: string
) {

  const normalized =
    String(
      message ||
      ''
    )
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .toLowerCase();


  const positiveWords = [
    'aprovado',
    'aprovada',
    'aprovacao',
    'material aprovado',
    'planejamento aprovado',
    'conteudo aprovado',
  ];


  const negativeWords = [
    'alteracao solicitada',
    'alteracao',
    'reprovado',
    'reprovada',
    'erro',
    'corrigir',
    'correcao',
    'ajuste solicitado',
  ];


  if (
    negativeWords.some(
      (
        word
      ) =>
        normalized.includes(
          word
        )
    )
  ) {

    return 'error';

  }


  if (
    positiveWords.some(
      (
        word
      ) =>
        normalized.includes(
          word
        )
    )
  ) {

    return 'success';

  }


  return 'neutral';
}


function clientCommentSectionClasses(
  status: string
) {

  if (
    status ===
    'ALTERACAO_SOLICITADA'
  ) {

    return {
      section:
        'border-red-200 bg-red-50',

      title:
        'text-emerald-800',

      subtitle:
        'text-red-600',
    };

  }


  if (
    [
      'APROVADO',
      'PRONTO_PARA_POSTAR',
      'PUBLICADO',
      'PUBLICADO_MANUALMENTE',
    ].includes(
      status
    )
  ) {

    return {
      section:
        'border-emerald-200 bg-emerald-50',

      title:
        'text-emerald-800',

      subtitle:
        'text-emerald-600',
    };

  }


  return {
    section:
      'border-slate-200 bg-white',

    title:
      'text-slate-900',

    subtitle:
      'text-slate-500',
  };
}


function clientCommentCardClasses(
  message: string
) {

  const tone =
    getClientCommentTone(
      message
    );


  if (
    tone ===
    'success'
  ) {

    return {
      card:
        'border-emerald-200 bg-white',

      author:
        'text-emerald-800',

      date:
        'text-emerald-500',

      message:
        'text-slate-700',
    };

  }


  if (
    tone ===
    'error'
  ) {

    return {
      card:
        'border-emerald-200 bg-white',

      author:
        'text-emerald-800',

      date:
        'text-emerald-500',

      message:
        'text-slate-700',
    };

  }


  return {
    card:
      'border-slate-200 bg-white',

    author:
      'text-slate-800',

    date:
      'text-slate-400',

    message:
      'text-slate-700',
  };
}



function getClientFeedbackTone(
  message: string
): 'success' | 'error' | 'neutral' {

  const normalized =
    String(message || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();


  const errorTerms = [
    'alteracao solicitada',
    'ajuste solicitado',
    'reprovado',
    'reprovada',
    'erro',
    'corrigir',
    'correcao',
  ];


  if (
    errorTerms.some(
      (term) =>
        normalized.includes(term)
    )
  ) {
    return 'error';
  }


  const successTerms = [
    'aprovado',
    'aprovada',
    'aprovacao',
  ];


  if (
    successTerms.some(
      (term) =>
        normalized.includes(term)
    )
  ) {
    return 'success';
  }


  return 'neutral';
}


function getContentFeedbackTone(
  status: string
): 'success' | 'error' | 'neutral' {

  if (
    status ===
    'ALTERACAO_SOLICITADA'
  ) {
    return 'error';
  }


  if (
    [
      'APROVADO',
      'PRONTO_PARA_POSTAR',
      'PUBLICADO',
      'PUBLICADO_MANUALMENTE',
    ].includes(status)
  ) {
    return 'success';
  }


  return 'neutral';
}


function formatClientFeedbackMessage(
  message: string
) {

  return String(message || '')
    .replace(
      /APROVACAO FINAL:/gi,
      'APROVAÇÃO FINAL:'
    )
    .replace(
      /2a Etapa de Aprovacao/gi,
      '2ª Etapa de Aprovação'
    )
    .replace(
      /Aprovacao/gi,
      'Aprovação'
    );
}


function nextStepClasses(color: string) {
  const classes: Record<string, string> = {
    slate: 'border-slate-200 bg-white text-slate-700',
    purple: 'border-purple-100 bg-purple-50 text-purple-700',
    cyan: 'border-cyan-100 bg-cyan-50 text-cyan-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    yellow: 'border-yellow-100 bg-yellow-50 text-yellow-700',
    orange: 'border-orange-100 bg-orange-50 text-orange-700',
    red: 'border-red-100 bg-red-50 text-red-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  };

  return classes[color] || classes.slate;
}


import {
  CommentAudioPlayer,
} from '@/components/aprovup/CommentAudioPlayer';
export default async function ConteudoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      client: true,
      tasks: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      comments: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      approvals: {
        orderBy: {
          createdAt: 'desc',
        },
      },

      instagramMediaAssets: {
        orderBy: {
          position: 'asc',
        },
      },
    },
  });

  if (!content) {
    notFound();
  }

  const contentSafe = content as NonNullable<typeof content>;


  if (!content) return notFound();

  const historyLogs = await prisma.historyLog.findMany({
    where: {
      entityId: id,
      entityType: 'CONTENT',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const users = await prisma.user.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  const approvalToken =
    contentSafe.approvals.find((approval) => approval.status === 'PENDENTE')?.token ||
    contentSafe.approvals[0]?.token;

  const latestApproval = contentSafe.approvals[0];

  const updateContentAction = updateContent.bind(null, id);
  const addCommentAction = addComment.bind(null, id);
  const addTaskAction = addTask.bind(null, id);
  const generateApprovalLinkAction = generateApprovalLink.bind(null, id);

  const currentArea = contentSafe.area || 'GERAL';
  const currentPriority = contentSafe.priority || 'MEDIA';

  const normalizedContentFormat =
    String(
      contentSafe.format ||
      ''
    )
      .trim()
      .toUpperCase();

  const isDesignCarousel =
    ['DESIGN', 'SOCIAL_DESIGN'].includes(
      currentArea
    ) &&
    (
      normalizedContentFormat.includes(
        'CARROSSEL'
      ) ||
      normalizedContentFormat.includes(
        'CAROUSEL'
      ) ||
      normalizedContentFormat.includes(
        'ALBUM'
      )
    );
  const late = isLate(contentSafe.plannedDate, contentSafe.status);

  const pendingTasks = contentSafe.tasks.filter(
    (task) => task.status !== 'FINALIZADO'
  );

  const completedTasks = contentSafe.tasks.filter(
    (task) => task.status === 'FINALIZADO'
  );

  const clientComments = contentSafe.comments.filter(
    (comment) => comment.authorRole === 'CLIENTE'
  );

  const internalComments = contentSafe.comments.filter(
    (comment) => comment.authorRole !== 'CLIENTE'
  );


  const historyAudioComments =
    contentSafe.comments.filter(
      (comment) =>
        Boolean(
          comment.audioUrl
        )
    );
  const nextStep = getNextStep(contentSafe.status, currentArea);

  const contentFeedbackTone =
    getContentFeedbackTone(
      contentSafe.status
    );

  const clientCommentSection =
    clientCommentSectionClasses(
      contentSafe.status
    );

  function HiddenContentFields({ nextStatus }: { nextStatus: string }) {
    return (
      <>
        <input type="hidden" name="status" value={nextStatus} />
        <input type="hidden" name="area" value={currentArea} />
        <input type="hidden" name="priority" value={currentPriority} />
        <input type="hidden" name="responsible" value={contentSafe.responsible || ''} />
        <input type="hidden" name="title" value={contentSafe.title || ''} />
        <input type="hidden" name="objective" value={contentSafe.objective || ''} />
        <input type="hidden" name="format" value={contentSafe.format || ''} />
        <input type="hidden" name="platform" value={contentSafe.platform || ''} />
        <input
          type="hidden"
          name="plannedDate"
          value={formatDateInput(contentSafe.plannedDate)}
        />
        <input type="hidden" name="briefing" value={contentSafe.briefing || ''} />
        <input type="hidden" name="artText" value={contentSafe.artText || ''} />
        <input type="hidden" name="caption" value={contentSafe.caption || ''} />
        <input type="hidden" name="fileLinks" value={contentSafe.fileLinks || ''} />
        <input
          type="hidden"
          name="coverImageUrl"
          value={contentSafe.coverImageUrl || ''}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-sm">
        <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-indigo-500/20 blur-3xl"></div>

        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <Link
              href={
                contentSafe.clientId
                  ? `/clientes/${contentSafe.clientId}/visao`
                  : '/clientes'
              }
              className="mb-3 inline-block text-sm text-blue-200 hover:underline"
            >
              &larr; Voltar para visão do cliente
            </Link>

            <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
              Conteúdo da Operação
            </p>

            <h1 className="mt-2 max-w-4xl text-4xl font-bold tracking-tight text-white">
              {contentSafe.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={formatLabel(contentSafe.status)} />

              {late && (
                <span className="rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                  Atrasado
                </span>
              )}

              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${priorityClasses[currentPriority] || priorityClasses.MEDIA
                  }`}
              >
                {priorityLabels[currentPriority] || currentPriority}
              </span>

              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
                {areaLabels[currentArea] || currentArea}
              </span>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300">
              Cliente:{' '}
              <strong className="text-white">
                {contentSafe.client?.name || 'Cliente não informado'}
              </strong>{' '}
              ⬢ Data prevista:{' '}
              <strong className={late ? 'text-red-300' : 'text-white'}>
                {formatDate(contentSafe.plannedDate)}
              </strong>{' '}
              ⬢ Responsável:{' '}
              <strong className="text-white">
                {contentSafe.responsible || 'Não definido'}
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            {contentSafe.clientId && (
              <Link
                href={`/clientes/${contentSafe.clientId}/visao`}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
              >
                Cliente
              </Link>
            )}

            <Link
              href={`/conteudos/kanban?cliente=${contentSafe.clientId || ''}`}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
            >
              Produção
            </Link>

            <Link
              href="/tarefas"
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
            >
              Tarefas
            </Link>
          </div>
        </div>
      </section>

      <section
        className={`rounded-2xl border p-5 shadow-sm ${nextStepClasses(
          nextStep.color
        )}`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-70">
              Ação recomendada
            </p>

            <h2 className="mt-1 text-xl font-bold">
              {nextStep.title}
            </h2>

            <p className="mt-1 text-sm leading-relaxed">
              {nextStep.description}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            {nextStep.nextStatus && nextStep.actionLabel && (
              <form action={updateContentAction}>
                <HiddenContentFields nextStatus={nextStep.nextStatus} />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 sm:w-auto"
                >
                  {nextStep.actionLabel}
                </button>
              </form>
            )}

            {contentSafe.status === 'ENVIADO_CLIENTE' && approvalToken && (
              <Link
                href={`/aprovacao/${approvalToken}`}
                target="_blank"
                className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-indigo-700 sm:w-auto"
              >
                Abrir aprovação final
              </Link>
            )}

            {contentSafe.status === 'ENVIADO_CLIENTE' && !approvalToken && (
              <form action={generateApprovalLinkAction}>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 sm:w-auto"
                >
                  Gerar link final
                </button>
              </form>
            )}

            {contentSafe.fileLinks && (
              <a
                href={contentSafe.fileLinks}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-50 sm:w-auto"
              >
                Abrir material
              </a>
            )}
          </div>
        </div>
      </section>

      {clientComments.length > 0 && (

        <section
          className={
            contentSafe.status === 'ALTERACAO_SOLICITADA'
              ? 'rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm'
              : [
                  'APROVADO',
                  'PRONTO_PARA_POSTAR',
                  'PUBLICADO',
                  'PUBLICADO_MANUALMENTE',
                ].includes(contentSafe.status)
                ? 'rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm'
                : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
          }
        >

          <div className="flex flex-wrap items-start justify-between gap-3">

            <div>

              <h2 className="text-lg font-bold text-slate-900">
                Comentários do Cliente
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Últimos retornos enviados pelo cliente neste conteúdo.
              </p>

            </div>


            {[
              'APROVADO',
              'PRONTO_PARA_POSTAR',
              'PUBLICADO',
              'PUBLICADO_MANUALMENTE',
            ].includes(contentSafe.status) && (

              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-700">
                ✓ Aprovado
              </span>

            )}


            {contentSafe.status === 'ALTERACAO_SOLICITADA' && (

              <span className="rounded-full border border-red-200 bg-white px-3 py-1 text-xs font-bold text-red-700">
                Atenção necessária
              </span>

            )}

          </div>


          <div className="mt-4 space-y-3">

            {clientComments.map((comment) => (

              <div
                key={comment.id}
                className={
                  contentSafe.status === 'ALTERACAO_SOLICITADA'
                    ? 'rounded-xl border border-red-200 bg-white p-4'
                    : [
                        'APROVADO',
                        'PRONTO_PARA_POSTAR',
                        'PUBLICADO',
                        'PUBLICADO_MANUALMENTE',
                      ].includes(contentSafe.status)
                      ? 'rounded-xl border border-emerald-100 bg-white p-4'
                      : 'rounded-xl border border-slate-200 bg-white p-4'
                }
              >

                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">

                  <span className="font-bold text-slate-900">
                    {comment.authorName || 'Cliente'}
                  </span>

                  <span
                    className={
                      contentSafe.status === 'ALTERACAO_SOLICITADA'
                        ? 'text-xs text-red-500'
                        : 'text-xs text-slate-400'
                    }
                  >
                    {formatDateTime(comment.createdAt)}
                  </span>

                </div>


                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {
                    comment.message
                      .replace(
                        /APROVACAO FINAL:/gi,
                        'APROVAÇÃO FINAL:'
                      )
                      .replace(
                        /2a Etapa de Aprovacao/gi,
                        '2ª Etapa de Aprovação'
                      )
                  }
                </p>

                <CommentAudioPlayer
                  audioUrl={
                    comment.audioUrl
                  }
                  audioDurationMs={
                    comment.audioDurationMs
                  }
                />

              </div>

            ))}

          </div>

        </section>

      )}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Status
          </p>
          <div className="mt-3">
            <StatusBadge status={formatLabel(contentSafe.status)} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Área
          </p>
          <p className="mt-3 text-xl font-bold text-slate-900">
            {areaLabels[currentArea] || currentArea}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-5 shadow-sm ${currentPriority === 'URGENTE'
              ? 'border-red-200 bg-red-50'
              : currentPriority === 'ALTA'
                ? 'border-orange-200 bg-orange-50'
                : 'border-slate-200 bg-white'
            }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Prioridade
          </p>
          <p className="mt-3 text-xl font-bold text-slate-900">
            {priorityLabels[currentPriority] || currentPriority}
          </p>
        </div>

        <div
          className={`rounded-2xl border p-5 shadow-sm ${late ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
            }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Data prevista
          </p>
          <p
            className={`mt-3 text-xl font-bold ${late ? 'text-red-700' : 'text-slate-900'
              }`}
          >
            {formatDate(contentSafe.plannedDate)}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <form action={updateContentAction} className="space-y-6">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Detalhes do Conteúdo
                  </h2>

                  <p className="text-sm text-slate-500">
                    Edite as informações principais da demanda.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Salvar alterações
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label className={labelClasses}>Status</label>
                  <select
                    name="status"
                    defaultValue={formatLabel(contentSafe.status)}
                    className={inputClasses}
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Área responsável</label>
                  <select
                    name="area"
                    defaultValue={
                      currentArea === 'FILMMAKER' ||
                      currentArea === 'AUDIOVISUAL'
                        ? 'FILMMAKER'
                        : 'DESIGN'
                    }
                    className={inputClasses}
                  >
                    <option value="DESIGN">
                      Design
                    </option>

                    <option value="FILMMAKER">
                      Filmmaker
                    </option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Prioridade</label>
                  <select
                    name="priority"
                    defaultValue={currentPriority}
                    className={inputClasses}
                  >
                    {priorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Responsável</label>
                  <select
                    name="responsible"
                    defaultValue={contentSafe.responsible || ''}
                    className={inputClasses}
                  >
                    <option value="">Nenhum</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.name || user.id}>
                        {user.name || user.email || 'Usuário sem nome'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Título</label>
                <input
                  name="title"
                  defaultValue={contentSafe.title}
                  required
                  type="text"
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses}>Objetivo Estratégico</label>
                <input
                  name="objective"
                  defaultValue={contentSafe.objective || ''}
                  type="text"
                  placeholder="Ex: gerar autoridade, conversão, prova social, relacionamento..."
                  className={inputClasses}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className={labelClasses}>Formato</label>
                  <select
                    name="format"
                    defaultValue={
                      contentSafe.format ||
                      'IMAGEM'
                    }
                    className={inputClasses}
                  >
                    <option value="IMAGEM">
                      Imagem única
                    </option>

                    <option value="CARROSSEL">
                      Carrossel
                    </option>

                    <option value="REEL">
                      Reel
                    </option>

                    <option value="VIDEO">
                      Vídeo
                    </option>

                    <option value="STORY">
                      Story
                    </option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Plataforma</label>
                  <input
                    name="platform"
                    defaultValue={contentSafe.platform || ''}
                    type="text"
                    placeholder="Ex: Instagram"
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Data Prevista</label>
                  <input
                    name="plannedDate"
                    defaultValue={formatDateInput(contentSafe.plannedDate)}
                    type="date"
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClasses}>Roteiro / Briefing</label>
                  <textarea
                    name="briefing"
                    defaultValue={contentSafe.briefing || ''}
                    rows={5}
                    placeholder="Direcionamento, objetivo, estrutura, cenas, referências ou orientações para criação."
                    className={inputClasses}
                  ></textarea>
                </div>

                <div>
                  <label className={labelClasses}>Texto da Arte</label>
                  <textarea
                    name="artText"
                    defaultValue={contentSafe.artText || ''}
                    rows={5}
                    placeholder="Texto interno que deve aparecer na arte, carrossel ou criativo."
                    className={inputClasses}
                  ></textarea>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Legenda Final</label>
                <textarea
                  name="caption"
                  defaultValue={contentSafe.caption || ''}
                  rows={5}
                  placeholder="Legenda final da publicação."
                  className={inputClasses}
                ></textarea>
              </div>

              {contentSafe.caption && (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Legenda para copiar
                  </p>

                  <textarea
                    readOnly
                    value={contentSafe.caption || ''}
                    className="min-h-28 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}

              <div>
                <label className={labelClasses}>Links / Anexos da Mídia</label>
                <input
                  name="fileLinks"
                  defaultValue={contentSafe.fileLinks || ''}
                  type="url"
                  placeholder="https://drive.google.com/..."
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses}>URL pública de imagem/capa</label>
                <input
                  name="coverImageUrl"
                  defaultValue={contentSafe.coverImageUrl || ''}
                  type="url"
                  placeholder="https://exemplo.com/imagem.jpg"
                  className={inputClasses}
                />
              </div>
            </form>
          </section>

          {isDesignCarousel && (

                <CarouselFinalUpload
                  contentId={
                    contentSafe.id
                  }
                  status={
                    contentSafe.status
                  }
                  assets={
                    contentSafe.instagramMediaAssets.map(
                      (asset) => ({
                        id: asset.id,
                        url: asset.url,
                        mimeType: asset.mimeType,
                        position: asset.position,
                      })
                    )
                  }
                />

              )}

              <CoverImageUpload
            contentId={contentSafe.id}
            currentImageUrl={contentSafe.coverImageUrl}
          />
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Comentários Internos
              </h2>

              <p className="text-sm text-slate-500">
                Use este espaço para alinhamentos da equipe.
              </p>
            </div>

            <div className="mb-4 space-y-4">
              {internalComments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Nenhum comentário interno ainda.
                </p>
              ) : (
                internalComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {comment.authorName}
                        </span>

                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          {comment.authorRole}
                        </span>
                      </div>

                      <span className="text-xs text-slate-400">
                        {formatDateTime(comment.createdAt)}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {comment.message}
                    </p>

                    <CommentAudioPlayer
                      audioUrl={
                        comment.audioUrl
                      }
                      audioDurationMs={
                        comment.audioDurationMs
                      }
                    />
                  </div>
                ))
              )}
            </div>

            <form action={addCommentAction} className="flex flex-col gap-2 sm:flex-row">
              <input
                name="message"
                required
                type="text"
                placeholder="Escreva um comentário interno..."
                className={inputClasses}
              />

              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                Enviar
              </button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="border-b border-slate-100 pb-3 text-lg font-bold text-slate-900">
              Aprovação Final
            </h2>

            <div className="mt-4 space-y-3">
              {latestApproval ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Status do link
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {latestApproval.status}
                  </p>

                  {latestApproval.clientComment && (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                      {latestApproval.clientComment}
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Nenhum link de aprovação final gerado ainda.
                </p>
              )}

              {approvalToken ? (
                <Link
                  href={`/aprovacao/${approvalToken}`}
                  target="_blank"
                  className="block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-bold text-white hover:bg-indigo-700"
                >
                  Abrir link de aprovação final
                </Link>
              ) : (
                <form action={generateApprovalLinkAction}>
                  <button
                    type="submit"
                    className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                  >
                    Gerar link de aprovação final
                  </button>
                </form>
              )}

              <p className="text-xs leading-relaxed text-slate-500">
                Use este link somente quando a arte, vídeo ou peça final já estiver pronta para aprovação do cliente.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="border-b border-slate-100 pb-3 text-lg font-bold text-slate-900">
              Ações secundárias
            </h2>

            <div className="mt-4 space-y-2">
              <form action={updateContentAction}>
                <HiddenContentFields nextStatus="REVISAO_INTERNA" />
                <button
                  type="submit"
                  className="w-full rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm font-bold text-yellow-700 hover:bg-yellow-100"
                >
                  Enviar para revisão interna
                </button>
              </form>

              <form action={updateContentAction}>
                <HiddenContentFields nextStatus="ENVIADO_CLIENTE" />
                <button
                  type="submit"
                  className="w-full rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  Marcar como enviado ao cliente
                </button>
              </form>

              <form action={updateContentAction}>
                <HiddenContentFields nextStatus="Pronto para Postar" />
                <button
                  type="submit"
                  className="w-full rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  Marcar como pronto para postar
                </button>
              </form>

              <form action={updateContentAction}>
                <HiddenContentFields nextStatus="PUBLICADO_MANUALMENTE" />
                <button
                  type="submit"
                  className="w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                >
                  Marcar como publicado
                </button>
              </form>

              {contentSafe.fileLinks && (
                <a
                  href={contentSafe.fileLinks}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Abrir anexo/link
                </a>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Tarefas Internas
                </h2>

                <p className="text-sm text-slate-500">
                  {pendingTasks.length} pendente(s) ⬢ {completedTasks.length} finalizada(s)
                </p>
              </div>
            </div>

            <div className="mb-4 space-y-3">
              {contentSafe.tasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Nenhuma tarefa criada.
                </p>
              ) : (
                contentSafe.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-xl border p-3 ${task.status === 'FINALIZADO'
                        ? 'border-emerald-100 bg-emerald-50'
                        : task.priority === 'URGENTE'
                          ? 'border-red-200 bg-red-50'
                          : task.priority === 'ALTA'
                            ? 'border-orange-200 bg-orange-50'
                            : 'border-slate-100 bg-slate-50'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <form action={completeTask.bind(null, task.id)}>
                        <button
                          type="submit"
                          className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-xs ${task.status === 'FINALIZADO'
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-slate-300 bg-white text-slate-400'
                            }`}
                        >
                          {task.status === 'FINALIZADO' ? 'Ã¢Å“â€œ' : ''}
                        </button>
                      </form>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-bold ${task.status === 'FINALIZADO'
                              ? 'text-emerald-700 line-through'
                              : 'text-slate-900'
                            }`}
                        >
                          {task.title}
                        </p>

                        {task.description && (
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-500">
                            {task.description}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap gap-1">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityClasses[task.priority || 'MEDIA'] ||
                              priorityClasses.MEDIA
                              }`}
                          >
                            {priorityLabels[task.priority || 'MEDIA'] || task.priority}
                          </span>

                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            {task.status}
                          </span>

                          {task.dueDate && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              action={addTaskAction}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <input
                name="title"
                required
                type="text"
                placeholder="Nova tarefa..."
                className={inputClasses}
              />

              <div className="grid grid-cols-1 gap-2">
                <select
                  name="priority"
                  defaultValue="MEDIA"
                  className="rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>

                <input
                  name="dueDate"
                  type="date"
                  className="rounded-md border border-slate-300 bg-white p-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Adicionar tarefa
                </button>
              </div>
            </form>
          </section>

          <InstagramPreview
            clientName={contentSafe.client?.name || 'Cliente'}
            caption={contentSafe.caption || ''}
            format={contentSafe.format || 'Feed'}
            platform={contentSafe.platform || 'Instagram'}
            imageUrl={contentSafe.coverImageUrl || ''}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="border-b border-slate-100 pb-3 text-lg font-bold text-slate-900">
              Histórico
            </h2>

            <div className="mt-4 space-y-4">
              {historyLogs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Nenhum registro ainda.
                </p>
              ) : (
                historyLogs.map((log) => (
                  <div
                    key={log.id}
                    className="relative border-l-2 border-slate-200 pb-2 pl-4 last:border-0 last:pb-0"
                  >
                    <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-slate-400"></div>

                    <p className="mb-0.5 text-xs text-slate-500">
                      {formatDateTime(log.createdAt)} ⬢ {log.authorName}
                    </p>

                    <p className="text-sm font-medium text-slate-800">
                      {log.description}
                    </p>
                  </div>
                ))
              )}
            </div>

            {historyAudioComments.length > 0 ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Áudios do histórico
                </p>

                <div className="space-y-3">
                  {historyAudioComments.map(
                    (comment) => (
                      <div
                        key={
                          `history-audio-${comment.id}`
                        }
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-bold text-slate-700">
                            {comment.authorName ||
                              comment.authorRole ||
                              'Equipe'}
                            {' • '}
                            {comment.authorRole ||
                              'COMENTÁRIO'}
                          </p>

                          <span className="text-[9px] text-slate-400">
                            {formatDateTime(
                              comment.createdAt
                            )}
                          </span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-slate-600">
                          {comment.message}
                        </p>

                        <CommentAudioPlayer
                          audioUrl={
                            comment.audioUrl
                          }
                          audioDurationMs={
                            comment.audioDurationMs
                          }
                          compact
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
      <section className="rounded-3xl border border-red-100 bg-red-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              Zona de exclusão
            </p>

            <h2 className="mt-1 text-xl font-bold text-red-700">
              Excluir este conteúdo
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-red-600">
              Use esta opção apenas se este conteúdo foi criado por engano ou não será mais utilizado no calendário.
            </p>
          </div>

          <form action={deleteContentAction.bind(null, contentSafe.id)}>
            <button
              type="submit"
              className="rounded-2xl bg-red-600 px-6 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
            >
              Excluir conteúdo
            </button>
          </form>
        </div>
      </section>

    </div>
  );
}
