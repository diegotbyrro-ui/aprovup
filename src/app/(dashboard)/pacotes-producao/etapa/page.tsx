import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAgencyContext } from "@/lib/tenant";
import { requirePermission } from "@/lib/userAccess";
import { listAprovUpReferenceFiles } from "@/lib/aprovupStorage";
import { formatLabel } from "@/lib/formatLabel";

export const dynamic = "force-dynamic";

function periodKey(value: Date | null) {
  if (!value) return "SEM_DATA";
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Maceio",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value);
  const find = (type: string) => parts.find((p) => p.type === type)?.value || "0";
  return `${find("year")}-${find("month")}`;
}

function friendlyPeriod(key: string) {
  if (key === "SEM_DATA") return "Sem período";
  const [year, month] = key.split("-").map(Number);
  const months = [
    "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[month] || "Mês"} ${year}`;
}

function displayDate(value: Date | null, withTime = false) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Maceio",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(value);
}

function invalidPackage(message: string) {
  return (
    <div className="p-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h1 className="text-lg font-black text-amber-900">Pacote indisponível</h1>
        <p className="mt-2 text-sm text-amber-800">{message}</p>
      </div>
    </div>
  );
}

export default async function ProductionStagePackagePage({
  searchParams,
}: {
  searchParams: Promise<{
    cliente?: string;
    area?: string;
    etapa?: string;
    periodo?: string;
  }>;
}) {
  const params = await searchParams;
  const area = params.area === "FILMMAKER" ? "FILMMAKER" : "DESIGN";
  const etapa = String(params.etapa || "");
  const periodo = String(params.periodo || "");
  const clientId = String(params.cliente || "");

  if (area === "FILMMAKER") {
    await requirePermission("filmmaker.view");
  }
  const { agencyId } = await requireAgencyContext();

  if (!etapa || !clientId || !(periodo === "SEM_DATA" || /^\d{4}-(0[1-9]|1[0-2])$/.test(periodo))) {
    return invalidPackage("Os parâmetros do pacote são inválidos.");
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, agencyId },
    select: { id: true, name: true },
  });

  if (!client) {
    return invalidPackage("O cliente não foi encontrado nesta agência.");
  }

  const column = area === "FILMMAKER"
    ? await prisma.filmmakerKanbanColumn.findFirst({
        where: { agencyId, statusKey: etapa, isActive: true },
      })
    : await prisma.designKanbanColumn.findFirst({
        where: { agencyId, statusKey: etapa, isActive: true },
      });

  if (!column || etapa === "APROVADO") {
    return invalidPackage("Esta etapa não existe ou não está disponível.");
  }

  const graphicColumn = area === "DESIGN" && (
    etapa === "DESIGN_GRAFICO" ||
    ["design grafico", "design offline", "offline"].includes(
      String(column.title || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
    )
  );

  const statuses = area === "DESIGN" && etapa === "DESIGN_ANALISE"
    ? ["DESIGN_ANALISE", "ENVIADO_CLIENTE", "ALTERACAO_SOLICITADA"]
    : area === "DESIGN" && etapa === "PRONTO_PARA_POSTAR"
      ? ["PRONTO_PARA_POSTAR", "PUBLICADO", "PUBLICADO_MANUALMENTE"]
      : [etapa];

  const rawContents = await prisma.content.findMany({
    where: {
      clientId: client.id,
      area,
      status: { in: statuses },
    },
    orderBy: [
      { plannedDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  const contents = rawContents.filter((content) => {
    if (periodKey(content.plannedDate) !== periodo) return false;
    if (graphicColumn) return content.format === "DESIGN_GRAFICO";
    if (etapa === "DESIGN_ANALISE") return true;
    return content.format !== "DEMANDA_EMERGENCIAL";
  });

  const items = await Promise.all(contents.map(async (content) => ({
    content,
    references: await listAprovUpReferenceFiles(content.id),
  })));

  const back = area === "FILMMAKER"
    ? `/filmmaker?cliente=${encodeURIComponent(client.id)}`
    : `/design?cliente=${encodeURIComponent(client.id)}`;

  return (
    <main className="mx-auto max-w-[1320px] space-y-5 p-4 pb-12 md:p-7">
      <Link href={back} className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline">
        ← Voltar ao Kanban de {area === "FILMMAKER" ? "Filmmaker" : "Design"}
      </Link>

      <header className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white p-5 shadow-sm md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
              Pacote completo • {area === "FILMMAKER" ? "Filmmaker" : "Design"}
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">{client.name} • {friendlyPeriod(periodo)}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">Etapa: {column.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              Todos os conteúdos deste cliente e período que estão nesta etapa.
            </p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-white px-5 py-3 text-center">
            <p className="text-2xl font-black text-indigo-700">{items.length}</p>
            <p className="text-[10px] font-bold text-slate-500">conteúdos</p>
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Não há conteúdos nesta etapa neste momento.</p>
          <p className="mt-2 text-xs text-slate-500">Eles podem ter sido movidos desde que você abriu o Kanban.</p>
        </section>
      ) : (
        <section className="space-y-5">
          {items.map(({ content, references }, index) => {
            const media = content.finalMediaUrl || content.finalExternalUrl;
            const isImage = String(content.finalMediaType || "").startsWith("image/");
            const preview = content.finalCoverUrl || (isImage ? content.finalMediaUrl : "");
            const hasReferenceLink = /^https?:\/\//i.test(String(content.fileLinks || "").trim());

            return (
              <article key={content.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 p-4 md:p-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                      Conteúdo {index + 1} de {items.length} • {formatLabel(content.format || "Conteúdo")}
                    </p>
                    <h2 className="mt-1 text-lg font-black text-slate-900">{content.title}</h2>
                    <p className="mt-2 text-xs font-medium text-slate-500">
                      Publicação: {displayDate(content.plannedDate)} • Entrega: {displayDate(content.productionDeadline, true)}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-indigo-600">Status: {formatLabel(content.status)}</p>
                  </div>
                  <Link href={`/conteudos/${content.id}/visualizar`} className="rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-700">
                    Abrir conteúdo completo
                  </Link>
                </div>

                <div className="grid gap-5 p-4 md:grid-cols-2 md:p-5">
                  <div className="space-y-4">
                    <section>
                      <h3 className="text-xs font-black uppercase tracking-wide text-slate-800">Briefing e orientações</h3>
                      <div className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                        {content.briefing || "Sem briefing cadastrado."}
                      </div>
                    </section>
                    <section>
                      <h3 className="text-xs font-black uppercase tracking-wide text-slate-800">Legenda</h3>
                      <div className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                        {content.caption || "Sem legenda cadastrada."}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-4">
                    <section className="rounded-xl border border-slate-200 p-4">
                      <h3 className="text-xs font-black uppercase tracking-wide text-slate-800">Material enviado</h3>
                      {preview ? (
                        <img src={preview} alt="Prévia do material final" className="mt-3 max-h-64 w-full rounded-lg bg-slate-100 object-contain" />
                      ) : (
                        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Sem prévia de imagem. O arquivo pode ser vídeo, documento ou link externo.</p>
                      )}
                      {media ? (
                        <a href={media} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-lg border border-indigo-200 px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-50">
                          Visualizar material final ↗
                        </a>
                      ) : (
                        <p className="mt-3 text-xs text-slate-500">Material final ainda não anexado.</p>
                      )}
                    </section>

                    <section className="rounded-xl border border-slate-200 p-4">
                      <h3 className="text-xs font-black uppercase tracking-wide text-slate-800">Referências e arquivos</h3>
                      {hasReferenceLink && (
                        <a href={String(content.fileLinks).trim()} target="_blank" rel="noopener noreferrer" className="mt-2 block break-words text-xs font-semibold text-indigo-700 underline">
                          Abrir link de referência ↗
                        </a>
                      )}
                      {content.fileLinks && !hasReferenceLink && (
                        <p className="mt-2 whitespace-pre-wrap break-all text-xs text-slate-600">{content.fileLinks}</p>
                      )}
                      {references.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {references.map((file, i) => (
                            <div key={`${file.name}:${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                              <span className="min-w-0 break-all text-xs font-medium text-slate-700">{file.originalName || file.name}</span>
                              <a href={file.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-black text-indigo-700 hover:underline">Abrir ↗</a>
                            </div>
                          ))}
                        </div>
                      ) : !content.fileLinks ? (
                        <p className="mt-2 text-xs text-slate-500">Sem referências cadastradas.</p>
                      ) : null}
                    </section>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}