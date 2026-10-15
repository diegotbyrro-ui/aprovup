import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, ClipboardCheck, MessageCircle, ShieldCheck, Pencil, Archive, RotateCcw, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/userAccess";
import { classifyDirectorOverdue, daysOverdue, directorLane, type DirectorOverdueKind, type DirectorLane } from "@/lib/directorOverdue";
import { directorReviewAction } from "./actions";

export const dynamic = "force-dynamic";

const ARCHIVED = "ARQUIVADO_DIRETORIA";
type Query = { situacao?:string; setor?:string; cliente?:string; busca?:string; mes?:string; pagina?:string };
type Situation = "ATRASADO" | "PUBLICADO" | "EM_ANDAMENTO" | "SEM_DATA" | "ARQUIVADO";
const situations = [
  {value:"TODOS",label:"Todos os conteudos ativos"},
  {value:"ATRASADO",label:"Atrasados e baixas pendentes"},
  {value:"PUBLICADO",label:"Ja publicados"},
  {value:"EM_ANDAMENTO",label:"Em andamento / aguardando"},
  {value:"SEM_DATA",label:"Sem prazo e sem data"},
  {value:"ARQUIVADO",label:"Arquivados (restauraveis)"},
];
const sectors = [
  {value:"TODOS",label:"Todos os setores"},
  {value:"DESIGN",label:"Design"},
  {value:"FILMMAKER",label:"Audiovisual"},
  {value:"SOCIAL_MEDIA",label:"Social Media"},
];
const laneNames:Record<DirectorLane,string> = {DESIGN:"Design", FILMMAKER:"Audiovisual", SOCIAL_MEDIA:"Social Media"};
const overdueNames: Record<DirectorOverdueKind,string> = {
  PRODUCAO:"Producao atrasada", PUBLICACAO:"Publicacao pendente", BAIXA_PENDENTE:"Publicado na plataforma / falta baixa",
};
function dateBR(date: Date | null) {
  if (!date) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {timeZone:"America/Maceio",day:"2-digit",month:"2-digit",year:"numeric"}).format(date);
}
function monthBR(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Maceio",year:"numeric",month:"2-digit"}).format(date).slice(0,7);
}

export default async function DirectorOverduePage({searchParams}: {searchParams?:Promise<Query>}) {
  const user = await requirePermission("social.view");
  if (user.role !== "DIRECTOR") redirect("/acesso-bloqueado");
  const params = searchParams ? await searchParams : {};
  const situationFilter = situations.some(x=>x.value === params.situacao) ? String(params.situacao) : "TODOS";
  const sectorFilter = sectors.some(x=>x.value === params.setor) ? String(params.setor) : "TODOS";
  const clientFilter = String(params.cliente || "TODOS").trim();
  const search = String(params.busca || "").trim().slice(0,120).toLocaleLowerCase("pt-BR");
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(params.mes || "")) ? String(params.mes) : "";
  const requestedPage = Math.max(1, Math.min(100000, Number.parseInt(String(params.pagina || "1"), 10) || 1));
  const now = new Date();

  const [contents,clients] = await Promise.all([
    prisma.content.findMany({
      where: { client: {agencyId:user.agencyId} },
      select: {
        id:true,clientId:true,title:true,format:true,status:true,area:true,responsible:true,createdAt:true,updatedAt:true,
        plannedDate:true,productionDeadline:true,
        client:{select:{id:true,name:true}},
        instagramPublication:{select:{status:true}},
        instagramStoryPublication:{select:{status:true}},
        socialPublications:{select:{platform:true,selected:true,status:true}},
        comments:{orderBy:{createdAt:"desc"},take:16,select:{message:true,authorRole:true,authorName:true,createdAt:true}},
      },
      orderBy:[{plannedDate:"desc"},{createdAt:"desc"}],
    }),
    prisma.client.findMany({where:{agencyId:user.agencyId},select:{id:true,name:true},orderBy:{name:"asc"}}),
  ]);

  const all = contents.map(item=>{
    const archived = item.status === ARCHIVED;
    const published = ["PUBLICADO","PUBLICADO_MANUALMENTE"].includes(item.status);
    const overdue = archived || published ? null : classifyDirectorOverdue(item,now);
    const situation:Situation = archived ? "ARQUIVADO" : published ? "PUBLICADO" : overdue ? "ATRASADO" : (!item.plannedDate && !item.productionDeadline ? "SEM_DATA" : "EM_ANDAMENTO");
    const lane = directorLane(item);
    const deadline = overdue === "PRODUCAO" ? (item.productionDeadline || item.plannedDate) : item.plannedDate;
    const lastDirectorAction = item.comments.find(c=>c.authorRole === "DIRECTOR" && c.message.startsWith("DIRETORIA - "));
    const lastFollowup = item.comments.find(c=>c.authorRole === "DIRECTOR" && c.message.startsWith("DIRETORIA - SOLICITACAO DE POSICAO"));
    const sectorReply = lastFollowup ? item.comments.find(c=>c.createdAt > lastFollowup.createdAt && c.authorRole !== "DIRECTOR") : undefined;
    return {item,archived,published,overdue,situation,lane,deadline,lastDirectorAction,lastFollowup,sectorReply,days:overdue ? daysOverdue(deadline,now) : 0};
  });
  const active = all.filter(x=>!x.archived);
  const count = (s:Situation) => all.filter(x=>x.situation === s).length;
  const filtered = all.filter(x=>{
    if (situationFilter === "TODOS" && x.archived) return false;
    if (situationFilter !== "TODOS" && x.situation !== situationFilter) return false;
    if (sectorFilter !== "TODOS" && x.lane !== sectorFilter) return false;
    if (clientFilter !== "TODOS" && x.item.clientId !== clientFilter) return false;
    if (month && monthBR(x.item.plannedDate || x.item.productionDeadline || x.item.createdAt) !== month) return false;
    if (search && !(`${x.item.title} ${x.item.client.name} ${x.item.responsible || ""} ${x.item.format || ""}`).toLocaleLowerCase("pt-BR").includes(search)) return false;
    return true;
  }).sort((a,b)=>{
    if (a.situation === "ATRASADO" && b.situation !== "ATRASADO") return -1;
    if (b.situation === "ATRASADO" && a.situation !== "ATRASADO") return 1;
    return b.days-a.days || b.item.createdAt.getTime()-a.item.createdAt.getTime();
  });
  const totalPages = Math.max(1,Math.ceil(filtered.length/20));
  const currentPage = Math.min(requestedPage,totalPages);
  const listed = filtered.slice((currentPage-1)*20,currentPage*20);
  const url = (p:number)=>{
    const q = new URLSearchParams({situacao:situationFilter,setor:sectorFilter,cliente:clientFilter,pagina:String(p)});
    if (search) q.set("busca",search);
    if (month) q.set("mes",month);
    return `/social-media/diretoria?${q.toString()}`;
  };

  return <div className="space-y-5 pb-12">
    <header className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
      <Link href="/clientes" className="inline-flex items-center gap-2 text-xs font-bold text-blue-200 hover:text-white"><ArrowLeft size={15}/> Voltar para Clientes</Link>
      <div className="mt-4 flex items-center gap-3"><ShieldCheck className="text-blue-300" size={28}/><div><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Acesso exclusivo da Diretoria</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Central da Diretoria</h1></div></div>
      <p className="mt-3 max-w-4xl text-sm text-slate-300">Todos os conteudos da agencia, por cliente e setor. Confirme publicacoes, edite, arquive ou cobre posicionamento. O arquivamento preserva o historico e pode ser desfeito.</p>
    </header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {[
        {label:"Conteudos ativos",value:active.length},
        {label:"Atrasados",value:count("ATRASADO")},
        {label:"Publicados",value:count("PUBLICADO")},
        {label:"Em andamento",value:count("EM_ANDAMENTO")+count("SEM_DATA")},
        {label:"Arquivados",value:count("ARQUIVADO")},
      ].map(c=><div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{c.label}</p><p className="mt-2 text-2xl font-black text-slate-900">{c.value}</p></div>)}
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <form action="/social-media/diretoria" method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">Buscar conteudo
          <input name="busca" defaultValue={search} maxLength={120} placeholder="Titulo ou cliente" className="rounded-xl border border-slate-300 p-2.5 text-sm"/>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">Situacao
          <select name="situacao" defaultValue={situationFilter} className="rounded-xl border border-slate-300 p-2.5 text-sm">{situations.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">Setor
          <select name="setor" defaultValue={sectorFilter} className="rounded-xl border border-slate-300 p-2.5 text-sm">{sectors.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">Cliente
          <select name="cliente" defaultValue={clients.some(c=>c.id===clientFilter) ? clientFilter : "TODOS"} className="rounded-xl border border-slate-300 p-2.5 text-sm"><option value="TODOS">Todos os clientes</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">Mes (opcional)
          <input name="mes" type="month" defaultValue={month} className="rounded-xl border border-slate-300 p-2.5 text-sm"/>
        </label>
        <button type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white sm:col-span-2 xl:col-span-5"><Search size={15}/> Aplicar filtros</button>
      </form>
      <p className="mt-3 text-xs text-slate-500">{filtered.length} conteudo(s) encontrados. Mostrando {listed.length} nesta pagina. O filtro padrao inclui todos os conteudos ativos, sem limitar a atrasos.</p>
    </section>
    <section className="space-y-3">
      {!listed.length ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Nenhum conteudo encontrado.</div> : null}
      {listed.map(({item,archived,published,overdue,situation,lane,deadline,lastDirectorAction,lastFollowup,sectorReply,days})=><article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">{item.client.name} · {laneNames[lane]} · {item.responsible || "Responsavel nao informado"}</p>
            <h2 className="mt-1 text-base font-black text-slate-900">{item.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className={`rounded-lg px-2 py-1 font-bold ${situation==="ATRASADO"?"bg-red-50 text-red-700":situation==="PUBLICADO"?"bg-emerald-50 text-emerald-700":situation==="ARQUIVADO"?"bg-slate-200 text-slate-700":"bg-blue-50 text-blue-700"}`}>{overdue ? overdueNames[overdue] : situation === "PUBLICADO" ? "Publicado" : situation === "ARQUIVADO" ? "Arquivado" : situation === "SEM_DATA" ? "Sem prazo definido" : "Em andamento"}</span>
              {overdue ? <span className="rounded-lg bg-red-50 px-2 py-1 text-red-700">{days} dia(s) em atraso</span> : null}
              <span className="rounded-lg bg-slate-100 px-2 py-1">Status: {item.status.replaceAll("_"," ")}</span>
              {item.format ? <span className="rounded-lg bg-slate-100 px-2 py-1">{item.format.replaceAll("_"," ")}</span> : null}
            </div>
            <p className="mt-2 text-xs text-slate-500">Entrega: {dateBR(item.productionDeadline)} · Postagem: {dateBR(item.plannedDate)} {overdue ? `· Referencia: ${dateBR(deadline)}` : ""}</p>
            {lastDirectorAction ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Ultimo registro: {lastDirectorAction.message.slice(0,250)}</p> : null}
            {lastFollowup && !archived ? <p className="mt-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-900">{sectorReply ? `Resposta da equipe: ${sectorReply.message.slice(0,170)}` : "Cobranca registrada. Aguardando resposta no conteudo."}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/conteudos/${item.id}`} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"><Pencil size={14}/> Editar / abrir</Link>
          </div>
        </div>
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-4">
          {!published && !archived ? <details className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <summary className="cursor-pointer text-xs font-bold text-emerald-800"><ClipboardCheck size={14} className="mr-1 inline"/> Marcar publicado</summary>
            <form action={directorReviewAction.bind(null,item.id)} className="mt-3 space-y-2">
              <input type="hidden" name="intent" value="POSTED"/>
              <textarea name="evidence" required rows={2} placeholder="Links HTTPS do(s) post(s), um por linha" className="w-full rounded-lg border border-emerald-200 p-2 text-xs"/>
              <textarea name="note" required minLength={8} maxLength={700} rows={2} placeholder="Onde e quando foi publicado?" className="w-full rounded-lg border border-emerald-200 p-2 text-xs"/>
              <button type="submit" className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Confirmar publicacao manual</button>
            </form>
          </details> : <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{published ? "Ja registrado como publicado." : "Conteudo arquivado: restaure para editar o fluxo."}</div>}
          {!published && !archived ? <details className="rounded-xl border border-amber-200 bg-amber-50 p-3"><summary className="cursor-pointer text-xs font-bold text-amber-900"><AlertTriangle size={14} className="mr-1 inline"/> Nao foi publicado</summary>
            <form action={directorReviewAction.bind(null,item.id)} className="mt-3 space-y-2"><input type="hidden" name="intent" value="NOT_POSTED"/><textarea name="note" required minLength={8} maxLength={700} rows={2} placeholder="Por que ainda nao foi postado?" className="w-full rounded-lg border border-amber-200 p-2 text-xs"/><button type="submit" className="w-full rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white">Registrar como pendente</button></form>
          </details> : null}
          {!archived ? <details className="rounded-xl border border-blue-200 bg-blue-50 p-3"><summary className="cursor-pointer text-xs font-bold text-blue-900"><MessageCircle size={14} className="mr-1 inline"/> Cobrar posicao</summary>
            <form action={directorReviewAction.bind(null,item.id)} className="mt-3 space-y-2"><input type="hidden" name="intent" value="FOLLOWUP"/>
              <select name="sector" defaultValue={lane} className="w-full rounded-lg border border-blue-200 p-2 text-xs">{sectors.filter(x=>x.value!=="TODOS").map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
              <textarea name="note" required minLength={8} maxLength={700} rows={2} placeholder="Solicite um posicionamento e previsao." className="w-full rounded-lg border border-blue-200 p-2 text-xs"/>
              <button type="submit" className="w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white">Registrar cobranca</button>
            </form>
          </details> : null}
          {archived ? <details className="rounded-xl border border-slate-300 bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold text-slate-700"><RotateCcw size={14} className="mr-1 inline"/> Restaurar conteudo</summary>
            <form action={directorReviewAction.bind(null,item.id)} className="mt-3 space-y-2"><input type="hidden" name="intent" value="RESTORE"/><textarea name="note" required minLength={8} maxLength={700} rows={2} placeholder="Motivo da restauracao" className="w-full rounded-lg border border-slate-300 p-2 text-xs"/><button type="submit" className="w-full rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white">Restaurar</button></form>
          </details> : <details className="rounded-xl border border-rose-200 bg-rose-50 p-3"><summary className="cursor-pointer text-xs font-bold text-rose-800"><Archive size={14} className="mr-1 inline"/> Apagar / arquivar</summary>
            <form action={directorReviewAction.bind(null,item.id)} className="mt-3 space-y-2"><input type="hidden" name="intent" value="ARCHIVE"/><p className="text-xs text-rose-700">Arquiva sem excluir registros ou arquivos das plataformas. Bloqueado se houver publicacao automatica ativa.</p><textarea name="note" required minLength={8} maxLength={700} rows={2} placeholder="Motivo do arquivamento" className="w-full rounded-lg border border-rose-200 p-2 text-xs"/><input name="confirmation" required pattern="ARQUIVAR" placeholder="Digite ARQUIVAR para confirmar" className="w-full rounded-lg border border-rose-200 p-2 text-xs"/><button type="submit" className="w-full rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white">Arquivar conteudo</button></form>
          </details>}
        </div>
        {!published && !archived && situation === "ATRASADO" ? <p className="mt-3 flex items-center gap-2 text-xs text-amber-700"><AlertTriangle size={14}/> Confirme se o atraso e real antes de cobrar o setor.</p> : null}
      </article>)}
    </section>
    <nav className="flex items-center justify-between text-sm text-slate-600">
      {currentPage>1 ? <Link className="font-bold text-blue-700" href={url(currentPage-1)}>← Anterior</Link> : <span/>}
      <span>Pagina {currentPage} de {totalPages}</span>
      {currentPage<totalPages ? <Link className="font-bold text-blue-700" href={url(currentPage+1)}>Proxima →</Link> : <span/>}
    </nav>
    <p className="text-xs text-slate-500">O status manual nao altera IDs nem respostas das APIs das plataformas. Arquivar e reversivel e nao exclui posts online. Solicitacoes de posicao ficam no historico e nos comentarios, sem notificacao automatica nesta versao.</p>
  </div>;
}
