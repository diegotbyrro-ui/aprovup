import { formatLabel } from '@/lib/formatLabel';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { requirePermission } from '@/lib/userAccess';
import Link from 'next/link';
import { deleteContentAction } from '../delete-actions';
import FinalUploadForm from './FinalUploadForm';
import { CarouselFinalUpload } from '@/components/content/CarouselFinalUpload';
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  MessageSquare,
  Target,
  User,
} from 'lucide-react';

function formatDate(date?: Date | string | null) {
  if (!date) return 'Sem data';

  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function TextBlock({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  if (!value) return null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
        {value}
      </div>
    </section>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-base font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}


import {
  CommentAudioPlayer,
} from '@/components/aprovup/CommentAudioPlayer';
export default async function ViewContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCurrentUser();

  const { id } = await params;

  const content = await prisma.content.findUnique({
    where: {
      id,
    },
    include: {
      client: true,
      comments: {
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
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">
            Conteúdo não encontrado
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Não conseguimos localizar essa demanda.
          </p>

          <Link
            href="/clientes"
            className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  const requiredPermission =
    content.area === 'FILMMAKER'
      ? 'filmmaker.manage'
      : content.area === 'DESIGN'
        ? 'design.manage'
        : 'social.manage';

  await requirePermission(
    requiredPermission
  );

  const item: any = content;

  const title = item.title || 'Conteúdo sem título';
  const clientName = item.client?.name || 'Cliente';
  const objective = item.objective || '';
  const briefing = item.briefing || item.description || '';
  const artText = item.artText || item.textArt || item.designText || '';
  const script = item.script || item.scriptText || item.videoScript || item.roteiro || '';
  const caption =
    item.caption ||
    item.legend ||
    item.instagramCaption ||
    item.finalCaption ||
    item.captionText ||
    '';

  const notes = item.notes || item.observations || item.reference || '';

  const finalMediaUrl = item.finalMediaUrl || '';
  const finalCoverUrl = item.finalCoverUrl || '';
  const finalMediaType = item.finalMediaType || '';

  const normalizedFormat =
    String(
      item.format ||
      ''
    )
      .trim()
      .toUpperCase();

  const isDesignCarousel =
    (
      item.area ===
        'DESIGN' ||
      item.area ===
        'SOCIAL_DESIGN'
    ) &&
    (
      normalizedFormat.includes(
        'CARROSSEL'
      ) ||
      normalizedFormat.includes(
        'CAROUSEL'
      ) ||
      normalizedFormat.includes(
        'ALBUM'
      )
    );

  const finalIsVideo =
    finalMediaType.startsWith('video/');

  const finalIsImage =
    finalMediaType.startsWith('image/');

  const imagePreviewUrl =
    finalCoverUrl ||
    (finalIsImage ? finalMediaUrl : '');

  const videoPreviewUrl =
    !finalCoverUrl && finalIsVideo
      ? finalMediaUrl
      : '';

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Link
        href={item.area === 'FILMMAKER' ? '/filmmaker' : '/design'}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950"
      >
        <ArrowLeft size={16} />
        Voltar para {item.area === 'FILMMAKER' ? 'Filmaker' : 'Design'}
      </Link>

      <section className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
          Visualização da demanda
        </p>

        <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight md:text-4xl">
          {title}
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
          Esta tela é apenas para consulta. Use as informações abaixo para executar a demanda. Caso tenha dúvida, volte ao Kanban e envie uma dúvida para o Social Media.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="Cliente"
          value={clientName}
          icon={<User size={18} />}
        />

        <InfoCard
          label="Data prevista"
          value={formatDate(item.plannedDate)}
          icon={<CalendarDays size={18} />}
        />

        <InfoCard
          label="Formato"
          value={formatLabel(item.format) || 'Formato'}
          icon={<FileText size={18} />}
        />

        <InfoCard
          label="Área / Status"
          value={`${formatLabel(item.area) || 'Área'} • ${formatLabel(item.status) || 'Status'}`}
          icon={<Target size={18} />}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <TextBlock
            title="Objetivo estratégico"
            value={objective}
          />

          <TextBlock
            title="Direcionamento / briefing"
            value={briefing}
          />

          <TextBlock
            title="Roteiro / orientação de vídeo"
            value={script}
          />

          <TextBlock
            title="Texto da arte"
            value={artText}
          />

          <TextBlock
            title="Legenda"
            value={caption}
          />

          <TextBlock
            title="Observações"
            value={notes}
          />
        </div>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Upload do material final
            </p>

            <h2 className="mt-2 text-lg font-bold text-blue-950">
              {
                isDesignCarousel
                  ? 'Montar carrossel para conferência'
                  : 'Enviar arquivo pronto para conferência'
              }
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-blue-800">
              {
                isDesignCarousel
                  ? 'Adicione todas as páginas na ordem correta. O carrossel completo seguirá para conferência interna e depois para a 2ª Etapa de aprovação do cliente.'
                  : 'Suba aqui a arte final, vídeo editado ou capa do vídeo. Depois do envio, o material segue para conferência interna antes de avançar para a Etapa 2 de aprovação do cliente.'
              }
            </p>

            {isDesignCarousel && (

              <div className="mt-5">

                <CarouselFinalUpload
                  contentId={
                    item.id
                  }
                  status={
                    item.status
                  }
                  assets={
                    item.instagramMediaAssets.map(
                      (asset: any) => ({
                        id: asset.id,
                        url: asset.url,
                        mimeType: asset.mimeType,
                        position: asset.position,
                      })
                    )
                  }
                />

              </div>

            )}

            {!isDesignCarousel && (finalMediaUrl || finalCoverUrl) && (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                Material enviado para conferência interna.
              </div>
            )}

            {!isDesignCarousel && imagePreviewUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-blue-100 bg-white">
                <img
                  src={imagePreviewUrl}
                  alt="Preview do material final"
                  className="h-44 w-full object-cover"
                />
              </div>
            )}

            {!isDesignCarousel && videoPreviewUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-blue-100 bg-black">
                <video
                  src={videoPreviewUrl}
                  controls
                  preload="metadata"
                  className="aspect-video w-full bg-black"
                >
                  Seu navegador não conseguiu reproduzir este vídeo.
                </video>
              </div>
            )}

            {!isDesignCarousel &&
              finalMediaUrl &&
              !imagePreviewUrl &&
              !videoPreviewUrl && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 text-center">
                  <p className="text-sm font-bold text-slate-700">
                    Arquivo final enviado.
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Use o botão abaixo para visualizar o arquivo.
                  </p>
                </div>
              )}

            {!isDesignCarousel && finalMediaUrl && (
              <a
                href={finalMediaUrl}
                target="_blank"
                className="mt-3 block rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-100"
              >
                Abrir arquivo final enviado
              </a>
            )}

            {!isDesignCarousel && (
              <FinalUploadForm
                contentId={
                  item.id
                }
              />
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-slate-500" />

              <h2 className="text-lg font-bold text-slate-950">
                Histórico / comentários
              </h2>
            </div>

            {item.comments?.length ? (
              <div className="space-y-3">
                {item.comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className="rounded-2xl bg-slate-50 p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {comment.authorName || 'Equipe'} • {comment.authorRole || 'Comentário'}
                    </p>

                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
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
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Nenhum comentário registrado até agora.
              </p>
            )}
          </section>

          <Link
            href={item.area === 'FILMMAKER' ? '/filmmaker' : '/design'}
            className="block rounded-2xl bg-slate-950 px-5 py-4 text-center text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Voltar
          </Link>
          <form action={deleteContentAction.bind(null, item.id)}>
            <button
              type="submit"
              className="mt-3 w-full rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-center text-sm font-bold text-red-600 transition hover:bg-red-100"
            >
              Excluir conteúdo
            </button>
          </form>
        </aside>
      </section>
    </div>
  );
}
