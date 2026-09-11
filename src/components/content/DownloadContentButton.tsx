import {
  Download,
} from 'lucide-react';


export function DownloadContentButton({
  contentId,
  isCarousel,
  compact = false,
}: {
  contentId:
    string;

  isCarousel:
    boolean;

  compact?:
    boolean;
}) {
  return (
    <a
      href={`/api/conteudos/${contentId}/download`}
      className={
        compact
          ? 'flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700'
          : 'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700'
      }
    >
      <Download
        size={
          compact
            ? 14
            : 16
        }
      />

      {isCarousel
        ? 'Baixar carrossel'
        : 'Baixar conteúdo'}
    </a>
  );
}
