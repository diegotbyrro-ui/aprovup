import Link from 'next/link';

import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Send,
  UploadCloud,
} from 'lucide-react';

import {
  CarouselFinalUpload,
} from '@/components/content/CarouselFinalUpload';

import FinalUploadForm
  from './visualizar/FinalUploadForm';

import {
  sendContentToFinalApprovalAction,
} from '../../social-media/actions';

import {
  SocialApprovalLinkButton,
} from '../../social-media/SocialApprovalLinkButton';

import {
  DownloadContentButton,
} from '@/components/content/DownloadContentButton';


type MediaAsset = {
  id:
    string;

  url:
    string;

  mimeType:
    string;

  position:
    number;
};


function Step({
  label,
  done,
  active,
}: {
  label:
    string;

  done:
    boolean;

  active:
    boolean;
}) {
  return (
    <div className="flex min-w-[145px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div
        className={
          done
            ? 'flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'
            : active
              ? 'flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700'
              : 'flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400'
        }
      >
        {done ? (
          <CheckCircle2
            size={15}
          />
        ) : (
          <Clock3
            size={14}
          />
        )}
      </div>

      <span
        className={
          done
            ? 'text-xs font-black text-emerald-800'
            : active
              ? 'text-xs font-black text-blue-800'
              : 'text-xs font-bold text-slate-400'
        }
      >
        {label}
      </span>
    </div>
  );
}


function MaterialSummary({
  isCarousel,
  assets,
  finalMediaUrl,
  finalCoverUrl,
  finalMediaType,
  finalExternalUrl,
}: {
  isCarousel:
    boolean;

  assets:
    MediaAsset[];

  finalMediaUrl:
    string | null;

  finalCoverUrl:
    string | null;

  finalMediaType:
    string | null;

  finalExternalUrl:
    string | null;
}) {
  if (
    isCarousel &&
    assets.length >
      0
  ) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {assets
          .slice(
            0,
            4
          )
          .map(
            (
              asset,
              index
            ) => (
              <div
                key={
                  asset.id
                }
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <img
                  src={
                    asset.url
                  }
                  alt={`Página ${index + 1}`}
                  className="aspect-[4/5] w-full object-cover"
                />

                <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-[9px] font-black text-white">
                  {index + 1}
                </span>
              </div>
            )
          )}

        {assets.length >
        4 ? (
          <div className="col-span-2 text-xs font-bold text-slate-500 sm:col-span-4">
            + {assets.length - 4} página(s) no carrossel.
          </div>
        ) : null}
      </div>
    );
  }

  const type =
    String(
      finalMediaType ||
      ''
    ).toLowerCase();

  const imageUrl =
    finalCoverUrl ||
    (
      type.startsWith(
        'image/'
      )
        ? finalMediaUrl
        : null
    );

  const videoUrl =
    !finalCoverUrl &&
    type.startsWith(
      'video/'
    )
      ? finalMediaUrl
      : null;

  if (
    imageUrl
  ) {
    return (
      <img
        src={
          imageUrl
        }
        alt="Material final"
        className="max-h-80 w-full rounded-2xl border border-slate-200 bg-slate-100 object-contain"
      />
    );
  }

  if (
    videoUrl
  ) {
    return (
      <video
        src={
          videoUrl
        }
        controls
        preload="metadata"
        className="aspect-video w-full rounded-2xl border border-slate-800 bg-black"
      >
        Seu navegador não conseguiu reproduzir este vídeo.
      </video>
    );
  }

  if (
    finalMediaUrl ||
    finalExternalUrl
  ) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">
        O material foi anexado e está disponível pelo link abaixo.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-400">
      Nenhum material final anexado.
    </div>
  );
}


export function SocialMediaProductionPanel({
  contentId,
  clientId,
  status,
  format,
  caption,
  canManage,
  pendingApprovalToken,
  finalMediaUrl,
  finalCoverUrl,
  finalMediaType,
  finalExternalUrl,
  storyMediaUrl,
  storyCoverUrl,
  storyMediaType,
  assets,
}: {
  contentId:
    string;

  clientId:
    string;

  status:
    string;

  format:
    string | null;

  caption:
    string | null;

  canManage:
    boolean;

  pendingApprovalToken:
    string | null;

  finalMediaUrl:
    string | null;

  finalCoverUrl:
    string | null;

  finalMediaType:
    string | null;

  finalExternalUrl:
    string | null;

  storyMediaUrl:
    string | null;

  storyCoverUrl:
    string | null;

  storyMediaType:
    string | null;

  assets:
    MediaAsset[];
}) {
  const normalizedFormat =
    String(
      format ||
      ''
    )
      .trim()
      .toUpperCase();

  const isCarousel =
    normalizedFormat.includes(
      'CARROSSEL'
    ) ||
    normalizedFormat.includes(
      'CAROUSEL'
    ) ||
    normalizedFormat.includes(
      'ALBUM'
    );

  const productionOpen =
    [
      'APROVADO',
      'ALTERACAO_SOLICITADA',
    ].includes(
      status
    );

  const internalReview =
    status ===
    'REVISAO_INTERNA';

  const waitingClient =
    status ===
    'ENVIADO_CLIENTE';

  const readyToPost =
    status ===
    'PRONTO_PARA_POSTAR';

  const hasMaterial =
    isCarousel
      ? assets.length >=
        2
      : Boolean(
          finalMediaUrl ||
          finalCoverUrl ||
          finalExternalUrl
        );

  const hasCaption =
    Boolean(
      String(
        caption ||
        ''
      ).trim()
    );

  const materialDone =
    hasMaterial ||
    internalReview ||
    waitingClient ||
    readyToPost;

  const reviewDone =
    waitingClient ||
    readyToPost;

  const approvalDone =
    readyToPost;

  const sendAction =
    sendContentToFinalApprovalAction.bind(
      null,
      contentId,
      clientId
    );

  return (
    <section
      id="producao-social-media"
      className="scroll-mt-24 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-blue-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
            Produção pela Social Media
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-950">
            Material final e 2ª aprovação
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            A Social Media envia aqui a imagem, vídeo ou carrossel. Depois da conferência interna, o material segue para a 2ª aprovação do cliente e, quando aprovado, entra automaticamente em Pronto para Postar.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {hasMaterial ? (
            <DownloadContentButton
              contentId={
                contentId
              }
              isCarousel={
                isCarousel
              }
            />
          ) : null}

          <Link
            href={`/conteudos/${contentId}/visualizar`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-50"
          >
            <ExternalLink
              size={14}
            />

            Abrir em tela dedicada
          </Link>
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <Step
          label="1. Material"
          done={
            materialDone
          }
          active={
            productionOpen
          }
        />

        <Step
          label="2. Conferência"
          done={
            reviewDone
          }
          active={
            internalReview
          }
        />

        <Step
          label="3. 2ª aprovação"
          done={
            approvalDone
          }
          active={
            waitingClient
          }
        />

        <Step
          label="4. Pronto para postar"
          done={
            readyToPost
          }
          active={
            readyToPost
          }
        />
      </div>

      {productionOpen ? (
        <div className="mt-6">
          {status ===
          'ALTERACAO_SOLICITADA' ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-black text-amber-900">
                O cliente pediu alteração.
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-700">
                Ajuste ou substitua o material abaixo. Quando finalizar, ele volta para conferência interna antes de uma nova 2ª aprovação.
              </p>
            </div>
          ) : null}

          {!canManage ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-slate-500">
              Este conteúdo está em produção pela Social Media. Somente usuários com permissão de Social Media podem enviar ou alterar o material.
            </div>
          ) : (
            <div className="space-y-5">
              {isCarousel ? (
                <CarouselFinalUpload
                  contentId={
                    contentId
                  }
                  status={
                    status
                  }
                  assets={
                    assets
                  }
                />
              ) : null}

              <div className="rounded-2xl border border-blue-100 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-wider text-blue-500">
                  {isCarousel
                    ? 'Stories / link complementar'
                    : 'Arquivo principal'}
                </p>

                <FinalUploadForm
                  contentId={
                    contentId
                  }
                  area="SOCIAL_MEDIA"
                  feedMode={
                    isCarousel
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

              {isCarousel ? (
                <p className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs font-bold leading-5 text-violet-700">
                  Para carrossel: envie as páginas no bloco acima, organize a ordem e use “Enviar para análise interna”. Stories e link externo são opcionais.
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {internalReview ? (
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Material em conferência
            </p>

            <div className="mt-4">
              <MaterialSummary
                isCarousel={
                  isCarousel
                }
                assets={
                  assets
                }
                finalMediaUrl={
                  finalMediaUrl
                }
                finalCoverUrl={
                  finalCoverUrl
                }
                finalMediaType={
                  finalMediaType
                }
                finalExternalUrl={
                  finalExternalUrl
                }
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {finalMediaUrl ? (
                <a
                  href={
                    finalMediaUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  Abrir arquivo
                </a>
              ) : null}

              {finalExternalUrl ? (
                <a
                  href={
                    finalExternalUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  Abrir link externo
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-black uppercase tracking-wider text-emerald-600">
              Conferência interna
            </p>

            <h3 className="mt-1 text-lg font-black text-emerald-950">
              Pronto para enviar ao cliente?
            </h3>

            <div className="mt-4 space-y-2 text-sm">
              <p
                className={
                  hasMaterial
                    ? 'font-bold text-emerald-700'
                    : 'font-bold text-red-600'
                }
              >
                {hasMaterial
                  ? '✓ Material final anexado'
                  : '✕ Material final ainda não anexado'}
              </p>

              <p
                className={
                  hasCaption
                    ? 'font-bold text-emerald-700'
                    : 'font-bold text-red-600'
                }
              >
                {hasCaption
                  ? '✓ Legenda final preenchida'
                  : '✕ Preencha a legenda final antes de enviar'}
              </p>
            </div>

            {canManage &&
            hasMaterial &&
            hasCaption ? (
              <form
                action={
                  sendAction
                }
                className="mt-5"
              >
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  <Send
                    size={16}
                  />

                  Enviar para 2ª aprovação
                </button>
              </form>
            ) : null}

            {!hasCaption ? (
              <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
                A legenda pode ser preenchida em “Detalhes do Conteúdo”, logo acima desta área.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {waitingClient ? (
        <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-xs font-black uppercase tracking-wider text-orange-600">
            2ª aprovação
          </p>

          <h3 className="mt-1 text-lg font-black text-orange-950">
            Aguardando retorno do cliente
          </h3>

          <p className="mt-2 text-sm leading-6 text-orange-800">
            O material final já foi enviado para aprovação. Quando o cliente aprovar, o conteúdo será movido automaticamente para Pronto para Postar.
          </p>

          {pendingApprovalToken ? (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <SocialApprovalLinkButton
                path={
                  `/aprovacao-final/${pendingApprovalToken}`
                }
              />

              <Link
                href={
                  `/aprovacao-final/${pendingApprovalToken}`
                }
                target="_blank"
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-orange-200 bg-white px-3 text-[9px] font-bold text-orange-700 transition hover:bg-orange-100"
              >
                <ExternalLink
                  size={12}
                />

                Abrir aprovação
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-xs font-bold text-orange-700">
              O link de aprovação ainda não está disponível.
            </p>
          )}
        </div>
      ) : null}

      {readyToPost ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2
                size={20}
              />
            </div>

            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-600">
                2ª aprovação concluída
              </p>

              <h3 className="mt-1 text-lg font-black text-emerald-950">
                Conteúdo pronto para postar
              </h3>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                O cliente aprovou o material final. Ele já está disponível na fila de Pronto para Postar.
              </p>

              <Link
                href="/pronto-para-postar"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700"
              >
                <UploadCloud
                  size={14}
                />

                Abrir Pronto para Postar
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {!productionOpen &&
      !internalReview &&
      !waitingClient &&
      !readyToPost ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-bold text-slate-700">
            A área de produção será liberada quando este conteúdo concluir a 1ª aprovação e entrar em produção pela Social Media.
          </p>
        </div>
      ) : null}
    </section>
  );
}
