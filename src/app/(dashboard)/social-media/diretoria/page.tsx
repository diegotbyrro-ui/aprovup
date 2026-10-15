import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, ClipboardCheck, MessageCircle, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/userAccess";
import { classifyDirectorOverdue, daysOverdue, directorLane, type DirectorOverdueKind, type DirectorLane } from "@/lib/directorOverdue";
import { directorReviewAction } from "./actions";

export const dynamic = "force-dynamic";

type Query = { tipo?:string; setor?:string; pagina?:string };
const types: Array<{value:string;label:string}> = [
  {value:"TODOS",label:"Todas as pendencias"},
  {value:"PRODUCAO",label:"Producao atrasada"},
  {value:"PUBLICACAO",label:"Publicacao pendente"},
  {value:"BAIXA_PENDENTE",label:"Publicado na plataforma / sem baixa"},
];
const sectors: Array<{value:string;label:string}> = [
  {value:"TODOS",label:"Todos os setores"},
  {value:"DESIGN",label:"Design"},
  {value:"FILMMAKER",label:"Audiovisual"},
  {value:"SOCIAL_MEDIA",label:"Social Media"},
];
const statusNames: Record<DirectorOverdueKind,string> = {
  PRODUCAO:"Entrega de producao atrasada", PUBLICACAO:"Publicacao pendente", BAIXA_PENDENTE:"Plataforma publicou; falta dar baixa",
};
const laneNames:Record<DirectorLane,string> = {DESIGN:"Design", FILMMAKER:"Audiovisual", SOCIAL_MEDIA:"Social Media"};
function dateBR(date: Date | null) { if (!date) return "Sem data"; const [ano,mes,dia] = date.toISOString().slice(0,10).split("-"); return `${dia}/${mes}/${ano}`; }

export default async function DirectorOverduePage({searchParams}: {searchParams?:Promise<Query>}) {
  const user = await requirePermission("social.view");
  if (user.role !== "DIRECTOR") redirect("/acesso-bloqueado");
  const params = searchParams ? await searchParams : {};
  const type = types.some(x=>x.value===params.tipo) ? String(params.tipo) : "TODOS";
  const sector = sectors.some(x=>x.value===params.setor) ? String(params.setor) : "TODOS";
  const page = Math.min(10000,Math.max(1,Number.parseInt(String(params.pagina||"1"),10)||1));
  const now = new Date();
  const contents = await prisma.content.findMany({
    where: {
      client: {agencyId: user.agencyId},
      status: {notIn:["PUBLICADO","PUBLICADO_MANUALMENTE"]},
      OR: [{plannedDate:{lt:now}},{productionDeadline:{lt:now}}],
    },
    select: {
      id:true,clientId:true,title:true,status:true,area:true,responsible:true,
      plannedDate:true,productionDeadline:true,
      client:{select:{name:true}},
      instagramPublication:{select:{status:true}},
      instagramStoryPublication:{select:{status:true}},
      socialPublications:{select:{platform:true,selected:true,status:true}},
      comments:{orderBy:{createdAt:"desc"},take:12,select:{message:true,authorRole:true,authorName:true,createdAt:true}},
    },
    orderBy:[{plannedDate:"asc"},{updatedAt:"desc"}],
  });
  const all = contents.flatMap(item => {
    const kind = classifyDirectorOverdue(item,now);
    if (!kind) return [];
    const lane = directorLane(item);
    const deadline = kind === "PRODUCAO" ? (item.productionDeadline || item.plannedDate) : item.plannedDate;
    const lastDirectorAction = item.comments.find(c=>c.authorRole==="DIRECTOR" && c.message.startsWith("DIRETORIA - "));
    const lastFollowup = item.comments.find(c=>c.authorRole==="DIRECTOR" && c.message.startsWith("DIRETORIA - SOLICITACAO DE POSICAO"));
    const sectorReply = lastFollowup ? item.comments.find(c=>c.createdAt > lastFollowup.createdAt && c.authorRole !== "DIRECTOR") : undefined;
    return [{item,kind,lane,deadline,lastDirectorAction,lastFollowup,sectorReply,days:daysOverdue(deadline,now)}];
  }).sort((a,b)=>b.days-a.days);
  const filtered = all.filter(x=>(type==="TODOS" || type===x.kind)&&(sector==="TODOS"||sector===x.lane));
  const totalPages = Math.max(1,Math.ceil(filtered.length/18));
  const currentPage = Math.min(page,totalPages);
  const listed = filtered.slice((currentPage-1)*18,currentPage*18);
  const count = (kind:DirectorOverdueKind) => all.filter(x=>x.kind===kind).length;
  const url = (p:number)=>`/social-media/diretoria?tipo=${encodeURIComponent(type)}&setor=${encodeURIComponent(sector)}&pagina=${p}`;
  return (
    <div className="space-y-5 pb-10">
      <section className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
        <Link href="/clientes" className="inline-flex items-center gap-2 text-xs font-semibold text-blue-200 hover:text-white"><ArrowLeft size={15}/> Voltar aos clientes</Link>
        <div className="mt-5 flex items-center gap-3"><ShieldCheck size={28} className="text-blue-300"/><div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Social Media / uso exclusivo da Diretoria</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Central da Diretoria</h1>
        </div></div>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">Identifique atrasos reais, confirme publicacoes esquecidas e cobre uma posicao de Design, Audiovisual ou Social Media. O historico fica registrado no conteudo.</p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {label:"Pendencias detectadas",value:all.length},
          {label:"Producao atrasada",value:count("PRODUCAO")},
          {label:"Publicacao pendente",value:count("PUBLICACAO")},
          {label:"Falta dar baixa",value:count("BAIXA_PENDENTE")},
        ].map(metric=><div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">{metric.label}</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{metric.value}</p></div>)}
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form action="/social-media/diretoria" method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-700">Tipo de pendencia
            <select name="tipo" defaultValue={type} className="rounded-xl border border-slate-300 p-2.5 text-sm">{types.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-700">Setor
            <select name="setor" defaultValue={sector} className="rounded-xl border border-slate-300 p-2.5 text-sm">{sectors.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>
          </label>
          <button type="submit" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">Filtrar</button>
        </form>
        <p className="mt-3 text-xs text-slate-500">{filtered.length} conteudo(s) neste filtro. Prazo de producao e data de postagem sao indicadores distintos.</p>
      </section>
      <section className="space-y-3">
        {!listed.length ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Nenhuma pendencia encontrada neste filtro.</div> : null}
        {listed.map(({item,kind,lane,deadline,lastDirectorAction,lastFollowup,sectorReply,days})=><article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500">{item.client.name} · {laneNames[lane]} · {item.responsible || "Responsavel nao informado"}</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">{item.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-lg bg-red-50 px-2 py-1 font-semibold text-red-700">{statusNames[kind]}</span>
                <span className="rounded-lg bg-slate-100 px-2 py-1">{days} dia(s) em atraso</span>
                <span className="rounded-lg bg-slate-100 px-2 py-1">Status: {item.status.replaceAll("_"," ")}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Entrega: {dateBR(item.productionDeadline)} · Postagem: {dateBR(item.plannedDate)} · Referencia do atraso: {dateBR(deadline)}</p>
              {lastDirectorAction ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Ultimo registro da diretoria: {lastDirectorAction.message.slice(0,230)}</p> : null}
              {lastFollowup ? <p className="mt-2 rounded-lg bg-blue-50 p-2 text-xs text-blue-900">{sectorReply ? `Resposta posterior registrada por ${sectorReply.authorName || "equipe"}: ${sectorReply.message.slice(0,170)}` : "Cobrança registrada; aguardando resposta nos comentarios do conteudo."}</p> : null}
            </div>
            <Link href={`/conteudos/${item.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">Abrir conteudo</Link>
          </div>
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-3">
            <details className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <summary className="cursor-pointer text-xs font-bold text-emerald-800"><ClipboardCheck size={14} className="mr-1 inline"/> Ja foi publicado</summary>
              <form action={directorReviewAction.bind(null,item.id)} className="mt-3 space-y-2">
                <input type="hidden" name="intent" value="POSTED"/>
                <textarea name="evidence" required rows={2} placeholder="Link(s) HTTPS do(s) post(s), um por linha" className="w-full rounded-lg border border-emerald-200 p-2 text-xs"/>
                <textarea name="note" required minLength={8} maxLength={700} rows={2} placeholder="Descreva onde e quando conferiu a publicacao" className="w-full rounded-lg border border-emerald-200 p-2 text-xs"/>
                <button type="submit" className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white">Confirmar manualmente</button>
              </form>
            </details>
            <details className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <summary className="cursor-pointer text-xs font-bold text-amber-900"><AlertTriangle size={14} className="mr-1 inline"/> Nao foi publicado</summary>
              <form action={directorReviewAction.bind(null,item.id)} className="mt-3 space-y-2">
                <input type="hidden" name="intent" value="NOT_POSTED"/>
                <textarea name="note" required minLength={8} maxLength={700} rows={2} placeholder="Informe o motivo ou a pendencia confirmada" className="w-full rounded-lg border border-amber-200 p-2 text-xs"/>
                <button type="submit" className="w-full rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white">Registrar pendencia</button>
              </form>
            </details>
            <details className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <summary className="cursor-pointer text-xs font-bold text-blue-900"><MessageCircle size={14} className="mr-1 inline"/> Cobrar posicao do setor</summary>
              <form action={directorReviewAction.bind(null,item.id)} className="mt-3 space-y-2">
                <input type="hidden" name="intent" value="FOLLOWUP"/>
                <select name="sector" defaultValue={lane} className="w-full rounded-lg border border-blue-200 p-2 text-xs">
                  {sectors.filter(x=>x.value!=="TODOS").map(x=><option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
                <textarea name="note" required minLength={8} maxLength={700} rows={2} placeholder="Qual a situacao e qual a previsao de entrega?" className="w-full rounded-lg border border-blue-200 p-2 text-xs"/>
                <button type="submit" className="w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white">Registrar cobranca</button>
              </form>
            </details>
          </div>
        </article>)}
      </section>
      <nav className="flex items-center justify-between text-sm text-slate-600">
        {currentPage>1 ? <Link className="font-bold text-blue-700" href={url(currentPage-1)}>← Anterior</Link> : <span/>}
        <span>Pagina {currentPage} de {totalPages}</span>
        {currentPage<totalPages ? <Link className="font-bold text-blue-700" href={url(currentPage+1)}>Proxima →</Link> : <span/>}
      </nav>
      <p className="text-xs text-slate-500">As solicitacoes de posicao ficam no historico e nos comentarios do conteudo. Esta versao nao envia notificacoes automaticamente. Registros manuais nao equivalem a confirmacao da API da rede social.</p>
    </div>
  );
}
