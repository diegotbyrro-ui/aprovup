import { ExternalLink, Film, Images } from "lucide-react";
import { getDirectorMediaItems, type DirectorMediaSource } from "@/lib/directorMedia";

type Props = { content: DirectorMediaSource };

export function DirectorMediaPreview({ content }: Props) {
  const items = getDirectorMediaItems(content);
  if (items.length === 0) return null;
  const shown = items.slice(0, 4);
  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4" aria-label="Arquivos finais enviados pela equipe">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-bold text-slate-800"><Images size={15}/> Material enviado pela produção</p>
        <span className="text-[11px] text-slate-500">{items.length} arquivo(s) / link(s) disponíveis</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shown.map(media => (
          <div key={media.url} className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {media.kind === "video" ? (
              <video controls playsInline preload="none" poster={media.poster || undefined} className="h-48 w-full bg-slate-950 object-contain" src={media.url} aria-label={media.label} />
            ) : media.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt={media.label} loading="lazy" className="h-48 w-full bg-slate-100 object-contain" />
            ) : (
              <div className="flex h-48 flex-col items-center justify-center gap-2 bg-slate-100 text-slate-500"><Film size={28}/><span className="text-xs">Arquivo externo</span></div>
            )}
            <div className="flex items-center justify-between gap-2 p-2">
              <span className="min-w-0 truncate text-[11px] font-bold text-slate-700">{media.label}</span>
              <a href={media.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50" aria-label={`Abrir ${media.label} em nova guia`}><ExternalLink size={12}/> Abrir</a>
            </div>
          </div>
        ))}
      </div>
      {items.length > shown.length ? <p className="mt-2 text-xs text-slate-500">Outros {items.length - shown.length} materiais podem ser vistos em Editar / abrir.</p> : null}
      <p className="mt-2 text-[11px] text-slate-500">Arquivos enviados no APROVUP. A presença do material não comprova publicação nas redes sociais.</p>
    </section>
  );
}
