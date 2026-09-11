import {
  DownloadContentButton,
} from '@/components/content/DownloadContentButton';

import {
  SocialMediaQuickUpload,
} from './SocialMediaQuickUpload';


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


type SocialMediaProductionPanelProps = {
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
};


export function SocialMediaProductionPanel({
  contentId,
  status,
  format,
  canManage,
  finalMediaUrl,
  finalCoverUrl,
  finalExternalUrl,
  assets,
}: SocialMediaProductionPanelProps) {
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

  const hasMaterial =
    isCarousel
      ? assets.length >=
        2
      : Boolean(
          finalMediaUrl ||
          finalCoverUrl ||
          finalExternalUrl
        );


  return (
    <section
      id="producao-social-media"
      className="scroll-mt-24 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
            Social Media
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-950">
            Material final
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Anexe o arquivo final e salve. O conteúdo irá direto para Pronto para Postar.
          </p>
        </div>

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
      </div>

      <div className="mt-5">
        {!canManage ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
            Você não possui permissão para alterar o material deste conteúdo.
          </div>
        ) : (
          <SocialMediaQuickUpload
            contentId={
              contentId
            }
            status={
              status
            }
            isCarousel={
              isCarousel
            }
            assets={
              assets
            }
            hasExistingMaterial={
              hasMaterial
            }
          />
        )}
      </div>
    </section>
  );
}
