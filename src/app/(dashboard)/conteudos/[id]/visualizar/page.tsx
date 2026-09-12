import { formatLabel } from '@/lib/formatLabel';
import { prisma } from '@/lib/prisma';
import { requireAgencyContext } from '@/lib/tenant';
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.45)]">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />

        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
          {title}
        </p>
      </div>

      <div className="mt-3 whitespace-pre-line text-[13px] leading-6 text-slate-700">
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
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-[0_8px_24px_-24px_rgba(15,23,42,0.5)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-[13px] font-black text-slate-950">
          {value}
        </p>
      </div>
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
  const {
    agencyId,
  } =
    await requireAgencyContext();

  const { id } = await params;

  const content = await prisma.content.findFirst({
    where: {
      id,

      client: {
        agencyId,
      },
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

  const finalExternalUrl =
    item.finalExternalUrl ||
    '';

  const storyMediaUrl =
    item.storyMediaUrl ||
    '';

  const storyCoverUrl =
    item.storyCoverUrl ||
    '';

  const storyMediaType =
    item.storyMediaType ||
    '';

  const isDesignContent =
    [
      'DESIGN',
      'SOCIAL_DESIGN',
      'SOCIAL_MEDIA',
    ].includes(
      String(
        item.area ||
        ''
      ).toUpperCase()
    );

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
        'SOCIAL_DESIGN' ||
      item.area ===
        'SOCIAL_MEDIA'
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

  const backHref =
    `/conteudos/${item.id}`;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 lg:px-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-950"
      >
        <ArrowLeft size={16} />
        Voltar para o conteúdo
      </Link>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_-34px_rgba(15,23,42,0.55)]">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" />

        <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
                Produção
              </span>

              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">
                {formatLabel(item.area) || 'Área'}
              </span>

              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-700">
                {formatLabel(item.status) || 'Status'}
              </span>
            </div>

            <h1 className="mt-3 max-w-4xl text-2xl font-black leading-tight tracking-tight text-slate-950 lg:text-3xl">
              {title}
            </h1>

            <p className="mt-1.5 max-w-3xl text-[12px] leading-5 text-slate-500">
              Briefing, legenda, arquivos finais e histórico reunidos em um único workspace de entrega.
            </p>
          </div>

          <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-500">
              Cliente
            </p>

            <p className="mt-0.5 max-w-[260px] truncate text-[13px] font-black text-blue-950">
              {clientName}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_460px] xl:grid-cols-[minmax(0,1fr)_520px]">
        <div className="space-y-4">
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
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_-34px_rgba(15,23,42,0.55)]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">
                    Central de entrega
                  </p>

                  <h2 className="mt-1 text-[17px] font-black tracking-tight text-slate-950">
                    {
                      isDesignCarousel
                        ? 'Carrossel + Stories'
                        : isDesignContent
                          ? 'Feed + Stories'
                          : 'Entrega do material final'
                    }
                  </h2>
                </div>

                <span
                  className={[
                    "rounded-full",
                    "border",
                    "px-2.5",
                    "py-1",
                    "text-[9px]",
                    "font-black",
                    "uppercase",
                    "tracking-[0.1em]",
                    isDesignContent
                      ? "border-violet-100 bg-violet-50 text-violet-700"
                      : "border-blue-100 bg-blue-50 text-blue-700",
                  ].join(" ")}
                >
                  {isDesignContent
                    ? 'Design'
                    : 'Filmmaker'}
                </span>
              </div>

              <p className="mt-2 max-w-xl text-[11px] leading-5 text-slate-500">
                {
                  isDesignCarousel
                    ? 'Organize as páginas do carrossel e envie a versão de Stories quando houver.'
                    : isDesignContent
                      ? 'Envie Feed e Stories de forma organizada. Você pode substituir apenas o arquivo que precisar.'
                      : 'Envie o vídeo final e, se necessário, a capa. Arquivos grandes também podem ser entregues por link.'
                }
              </p>
            </div>

            <div className="p-4">


            {isDesignCarousel ? (
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
                        id:
                          asset.id,

                        url:
                          asset.url,

                        mimeType:
                          asset.mimeType,

                        position:
                          asset.position,
                      })
                    )
                  }
                />
              </div>
            ) : null}


            {!isDesignContent &&
              !isDesignCarousel &&
              (finalMediaUrl || finalCoverUrl || finalExternalUrl) ? (
                <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                  Material enviado para conferência interna.
                </div>
              ) : null}


            {!isDesignContent &&
              !isDesignCarousel &&
              imagePreviewUrl ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-blue-100 bg-white">
                  <img
                    src={
                      imagePreviewUrl
                    }
                    alt="Preview do material final"
                    className="h-44 w-full object-cover"
                  />
                </div>
              ) : null}


            {!isDesignContent &&
              !isDesignCarousel &&
              videoPreviewUrl ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-blue-100 bg-black">
                  <video
                    src={
                      videoPreviewUrl
                    }
                    controls
                    preload="metadata"
                    className="aspect-video w-full bg-black"
                  >
                    Seu navegador não conseguiu reproduzir este vídeo.
                  </video>
                </div>
              ) : null}


            {!isDesignContent &&
              !isDesignCarousel &&
              finalMediaUrl ? (
                <a
                  href={
                    finalMediaUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block rounded-2xl bg-white px-4 py-3 text-center text-sm font-bold text-blue-700 shadow-sm hover:bg-blue-100"
                >
                  Abrir arquivo final enviado
                </a>
              ) : null}


            <FinalUploadForm
              contentId={
                item.id
              }
              area={
                item.area
              }
              feedMode={
                isDesignCarousel
                  ? 'carousel'
                  : 'single'
              }
              currentFinalMediaUrl={
                finalMediaUrl
              }
              currentFinalCoverUrl={
                finalCoverUrl
              }
              currentFinalMediaType={
                finalMediaType
              }
              currentFinalExternalUrl={
                finalExternalUrl
              }
              currentStoryMediaUrl={
                storyMediaUrl
              }
              currentStoryCoverUrl={
                storyCoverUrl
              }
              currentStoryMediaType={
                storyMediaType
              }
            />
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_-26px_rgba(15,23,42,0.45)]">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <MessageSquare size={18} className="text-slate-500" />

              <h2 className="text-[15px] font-black text-slate-950">
                Histórico / comentários
              </h2>
            </div>

            {item.comments?.length ? (
              <div className="space-y-3">
                {item.comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Link
              href={backHref}
              className="flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-[11px] font-black text-white transition hover:bg-slate-800"
            >
              Voltar ao conteúdo
            </Link>

            <form action={deleteContentAction.bind(null, item.id)}>
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center rounded-xl border border-red-100 bg-white px-4 text-[11px] font-black text-red-600 transition hover:bg-red-50"
              >
                Excluir conteúdo
              </button>
            </form>
          </div>
        </aside>
      </section>
    </div>
  );
}
