"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/userAccess";

function parseDay(input: string): Date | null {
  if (!input) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!m) throw new Error("Data invalida. Use o calendario do formulario.");
  const [,y,mo,d] = m.map(Number);
  const value = new Date(Date.UTC(y, mo - 1, d, 12));
  if (value.getUTCFullYear() !== y || value.getUTCMonth() !== mo-1 || value.getUTCDate() !== d) throw new Error("Data inexistente.");
  return value;
}
function sameIso(date: Date | null | undefined, expected: string): boolean {
  return (date?.toISOString() || "") === expected;
}
function dateLabel(value: Date | null): string {
  return value ? new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Maceio",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(value) : "Sem data";
}
export async function conferenceDateAction(contentId:string,formData:FormData) {
  const user = await requirePermission("social.manage");
  if (!["DIRECTOR","SOCIAL_MEDIA"].includes(user.role)) throw new Error("Acesso restrito a Social Media e Diretoria.");
  if (!formData.has("expectedPlanned") || !formData.has("expectedDeadline")) throw new Error("Recarregue a tela e tente novamente.");
  const oldPlanned = String(formData.get("expectedPlanned") || "");
  const oldDeadline = String(formData.get("expectedDeadline") || "");
  const validIso = (s:string)=>!s || (!Number.isNaN(new Date(s).getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(s));
  if (!validIso(oldPlanned) || !validIso(oldDeadline)) throw new Error("Referencia de data invalida. Recarregue a tela.");
  const publicationDay = String(formData.get("plannedDate") || "").trim();
  const productionDay = String(formData.get("productionDeadline") || "").trim();
  const productionTime = String(formData.get("productionDeadlineTime") || "").trim();
  const plannedDate = parseDay(publicationDay);
  if (productionDay && !/^([01]\d|2[0-3]):[0-5]\d$/.test(productionTime)) throw new Error("Informe a hora da entrega (HH:mm).");
  if (productionDay && publicationDay && productionDay >= publicationDay) throw new Error("A entrega interna deve ocorrer antes do dia da publicacao.");
  parseDay(productionDay); // valida o calendario mesmo sendo um timestamp operacional
  const productionDeadline = productionDay ? new Date(`${productionDay}T${productionTime}:00-03:00`) : null;
  if (productionDeadline && Number.isNaN(productionDeadline.getTime())) throw new Error("Prazo de entrega invalido.");
  const actor=user.name || user.email || "Equipe AprovUp";
  await prisma.$transaction(async tx=>{
    const current=await tx.content.findFirst({where:{id:contentId,client:{agencyId:user.agencyId}},select:{id:true,clientId:true,title:true,status:true,plannedDate:true,productionDeadline:true}});
    if (!current) throw new Error("Conteudo nao encontrado nesta agencia.");
    if (current.status === "ARQUIVADO_DIRETORIA") throw new Error("Conteudo arquivado: restaure antes de editar datas.");
    if (!sameIso(current.plannedDate,oldPlanned) || !sameIso(current.productionDeadline,oldDeadline)) throw new Error("As datas ja foram alteradas por outra pessoa. Atualize a Conferencia antes de salvar.");
    if (sameIso(plannedDate,oldPlanned) && sameIso(productionDeadline,oldDeadline)) return;
    const result=await tx.content.updateMany({where:{id:contentId,client:{agencyId:user.agencyId},plannedDate:current.plannedDate,productionDeadline:current.productionDeadline},data:{plannedDate,productionDeadline}});
    if (result.count!==1) throw new Error("Outro usuario alterou as datas simultaneamente. Recarregue a Conferencia.");
    await tx.historyLog.create({data:{entityType:"CONTENT",entityId:contentId,action:"CONFERENCE_DATES_UPDATED",authorName:actor,description:`Conferencia: entrega \"${dateLabel(current.productionDeadline)}\" -> \"${dateLabel(productionDeadline)}\"; publicacao \"${dateLabel(current.plannedDate)}\" -> \"${dateLabel(plannedDate)}\".`}});
  });
  for(const p of ["/social-media/diretoria","/social-media","/design","/filmmaker","/clientes","/conteudos","/calendario","/calendario-editorial","/operacao",`/conteudos/${contentId}`]) revalidatePath(p);
}
