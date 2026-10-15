/** Dashboard da Diretoria. Somente classificacao; sem escrita nem emissao. */
export type DirectorLane = "DESIGN" | "FILMMAKER" | "SOCIAL_MEDIA";
export type DirectorOverdueKind = "PRODUCAO" | "PUBLICACAO" | "BAIXA_PENDENTE";

export type DirectorContentSnapshot = {
  area: string;
  status: string;
  plannedDate: Date | string | null;
  productionDeadline: Date | string | null;
  instagramPublication?: { status: string } | null;
  instagramStoryPublication?: { status: string } | null;
  socialPublications?: { selected: boolean; status: string }[];
};

const finished = new Set(["PUBLICADO", "PUBLICADO_MANUALMENTE"]);
const designDelivered = new Set([
  "DESIGN_ANALISE", "ENVIADO_CLIENTE", "ALTERACAO_SOLICITADA",
  "PRONTO_PARA_POSTAR", "PUBLICADO", "PUBLICADO_MANUALMENTE",
]);
const filmmakerDelivered = new Set([
  "FILMMAKER_ANALISE", "ENVIADO_CLIENTE", "ALTERACAO_SOLICITADA",
  "PRONTO_PARA_POSTAR", "PUBLICADO", "PUBLICADO_MANUALMENTE",
]);

export function directorLane(content: Pick<DirectorContentSnapshot, "area" | "status">): DirectorLane {
  if (content.area === "DESIGN" || content.status.startsWith("DESIGN_")) return "DESIGN";
  if (content.area === "FILMMAKER" || content.status.startsWith("FILMMAKER_")) return "FILMMAKER";
  return "SOCIAL_MEDIA";
}

export function classifyDirectorOverdue(
  content: DirectorContentSnapshot,
  now: Date,
): DirectorOverdueKind | null {
  if (finished.has(content.status)) return null;
  const planned = content.plannedDate ? new Date(content.plannedDate) : null;
  const lane = directorLane(content);
  // plannedDate representa DIA editorial, nao horario de postagem.
  // Evita classificar conteudos de hoje como atrasados ja pela manha.
  const todayLocal = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Maceio", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const publicationOverdue = !!planned && !Number.isNaN(planned.getTime()) &&
    planned.toISOString().slice(0, 10) < todayLocal;
  const productionOverdue = content.productionDeadline
    ? new Date(content.productionDeadline) < now
    : publicationOverdue;
  const knownPosts = [
    ...(content.instagramPublication ? [content.instagramPublication] : []),
    ...(content.instagramStoryPublication ? [content.instagramStoryPublication] : []),
    ...(content.socialPublications || []).filter(item => item.selected),
  ];
  // So considerar baixa automatica quando TODAS as publicacoes rastreadas foram confirmadas.
  // Um post confirmado em uma rede nao elimina pendencias nas outras.
  const allPostsConfirmed = knownPosts.length > 0 && knownPosts.every(item => item.status === "PUBLICADO");
  if (allPostsConfirmed && (productionOverdue || publicationOverdue)) return "BAIXA_PENDENTE";
  if (productionOverdue && lane === "DESIGN" && !designDelivered.has(content.status)) return "PRODUCAO";
  if (productionOverdue && lane === "FILMMAKER" && !filmmakerDelivered.has(content.status)) return "PRODUCAO";
  if (publicationOverdue) return "PUBLICACAO";
  return null;
}

export function daysOverdue(date: Date | string | null, now: Date): number {
  if (!date) return 0;
  const d = new Date(date);
  if (Number.isNaN(d.getTime()) || d >= now) return 0;
  const todayLocal = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Maceio", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const midnight = (day: string) => new Date(`${day}T00:00:00.000Z`).getTime();
  return Math.max(1, Math.round((midnight(todayLocal) - midnight(d.toISOString().slice(0, 10))) / 86400000));
}

/** URLs apenas como provas registradas, sem chamadas externas. */
export function validatePublicationProof(input: string): string[] {
  const lines = input.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!lines.length || lines.length > 6 || input.length > 3000) throw new Error("Informe de 1 a 6 links de comprovacao (ate 3000 caracteres).");
  for (const link of lines) {
    let url: URL;
    try { url = new URL(link); } catch { throw new Error("Link de publicacao invalido."); }
    if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password ||
        /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname)) {
      throw new Error("Use somente links publicos HTTPS, sem usuario ou senha.");
    }
  }
  return lines;
}
