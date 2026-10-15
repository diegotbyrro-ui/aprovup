/** Retorno seguro para a Central da Diretoria (sem redirecionamentos externos). */
const BASE = "/social-media/diretoria";
const ALLOWED = new Set(["situacao", "setor", "cliente", "busca", "mes", "pagina"]);
const SITUATIONS = new Set(["TODOS", "ATRASADO", "PUBLICADO", "EM_ANDAMENTO", "SEM_DATA", "ARQUIVADO"]);
const SECTORS = new Set(["TODOS", "DESIGN", "FILMMAKER", "SOCIAL_MEDIA"]);
export function getDirectorReturnUrl(input: unknown, role: string | null | undefined): string | null {
  if (role !== "DIRECTOR" || typeof input !== "string" || input.length > 1000 || input.length === 0) return null;
  if (!input.startsWith(BASE) || input.includes("\\") || input.includes("#") || /[\x00-\x1f\x7f]/.test(input)) return null;
  let url: URL;
  try { url = new URL(input, "https://aprovup.local"); } catch { return null; }
  if (url.origin !== "https://aprovup.local" || url.pathname !== BASE || url.hash) return null;
  const params = url.searchParams;
  if ([...params.keys()].some(k => !ALLOWED.has(k) || params.getAll(k).length !== 1)) return null;
  const result = new URLSearchParams();
  const situation = params.get("situacao");
  if (situation) { if (!SITUATIONS.has(situation)) return null; result.set("situacao", situation); }
  const sector = params.get("setor");
  if (sector) { if (!SECTORS.has(sector)) return null; result.set("setor", sector); }
  const client = params.get("cliente");
  if (client) { if (client !== "TODOS" && !/^[a-zA-Z0-9_-]{1,128}$/.test(client)) return null; result.set("cliente", client); }
  const search = params.get("busca");
  if (search) { if (search.length > 120) return null; result.set("busca", search); }
  const month = params.get("mes");
  if (month) { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null; result.set("mes", month); }
  const page = params.get("pagina");
  if (page) { if (!/^\d{1,6}$/.test(page) || Number(page) < 1 || Number(page) > 100000) return null; result.set("pagina", String(Number(page))); }
  return BASE + (result.toString() ? `?${result.toString()}` : "");
}
