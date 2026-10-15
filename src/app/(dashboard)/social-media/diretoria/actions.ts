"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/userAccess";

const ARCHIVED = "ARQUIVADO_DIRETORIA";
const ALLOWED = new Set(["POSTED","NOT_POSTED","FOLLOWUP","ARCHIVE","RESTORE"]);
const SECTORS = new Set(["DESIGN","FILMMAKER","SOCIAL_MEDIA"]);
const RUNNING = new Set(["AGENDADO","PUBLICANDO","PROCESSANDO"]);

export async function directorReviewAction(contentId:string,formData:FormData) {
  const user = await requirePermission("social.manage");
  if (user.role !== "DIRECTOR") throw new Error("Acesso exclusivo da Diretoria.");
  const intent = String(formData.get("intent") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const sector = String(formData.get("sector") || "").trim();
  if (!ALLOWED.has(intent)) throw new Error("Acao desconhecida.");
  if (intent === "ARCHIVE" && (note.length < 8 || note.length > 700)) throw new Error("Informe o motivo do arquivamento (8 a 700 caracteres).");
  if (intent !== "ARCHIVE" && note.length > 700) throw new Error("Mensagem deve ter no maximo 700 caracteres.");
  if (intent === "FOLLOWUP" && !SECTORS.has(sector)) throw new Error("Selecione o setor.");
  if (intent === "ARCHIVE" && String(formData.get("confirmation") || "").trim() !== "ARQUIVAR") throw new Error("Confirme digitando ARQUIVAR.");
  const author = user.name || user.email || "Diretoria";

  await prisma.$transaction(async tx=>{
    const content = await tx.content.findFirst({
      where:{id:contentId,client:{agencyId:user.agencyId}},
      select:{id:true,title:true,status:true,
        instagramPublication:{select:{status:true}},
        instagramStoryPublication:{select:{status:true}},
        socialPublications:{select:{platform:true,selected:true,status:true}},
      },
    });
    if (!content) throw new Error("Conteudo nao encontrado para sua agencia.");
    const archived = content.status === ARCHIVED;
    if (archived && intent !== "RESTORE") throw new Error("Conteudo arquivado. Restaure antes de alterar.");
    if (!archived && intent === "RESTORE") throw new Error("Conteudo nao esta arquivado.");
    const activeStates = [content.instagramPublication?.status,content.instagramStoryPublication?.status,...content.socialPublications.filter(p=>p.selected).map(p=>p.status)];
    if (["POSTED","ARCHIVE"].includes(intent) && activeStates.some(s=>RUNNING.has(s||""))) {
      throw new Error("Existem agendamentos/publicacoes automaticas ativas. Resolva o envio antes de concluir esta acao.");
    }
    let restoredStatus = "";
    if (intent === "POSTED") {
      if (["PUBLICADO","PUBLICADO_MANUALMENTE"].includes(content.status)) throw new Error("Conteudo ja publicado.");
      const result = await tx.content.updateMany({where:{id:contentId,client:{agencyId:user.agencyId},status:content.status},data:{status:"PUBLICADO_MANUALMENTE"}});
      if (result.count !== 1) throw new Error("Registro alterado por outra pessoa. Atualize a pagina.");
    }
    if (intent === "ARCHIVE") {
      const result = await tx.content.updateMany({where:{id:contentId,client:{agencyId:user.agencyId},status:content.status},data:{status:ARCHIVED}});
      if (result.count !== 1) throw new Error("Registro alterado por outra pessoa. Atualize a pagina.");
    }
    if (intent === "RESTORE") {
      const previous = await tx.historyLog.findFirst({where:{entityType:"CONTENT",entityId:contentId,action:"DIRECTOR_ARCHIVED_CONTENT"},orderBy:{createdAt:"desc"}});
      const match = previous?.description.match(/STATUS_ORIGINAL:([A-Z0-9_]+)/);
      if (!match || match[1] === ARCHIVED) throw new Error("Status anterior nao encontrado. Contate a equipe antes de restaurar.");
      restoredStatus = match[1];
      const result = await tx.content.updateMany({where:{id:contentId,client:{agencyId:user.agencyId},status:ARCHIVED},data:{status:restoredStatus}});
      if (result.count !== 1) throw new Error("Registro alterado por outra pessoa. Atualize a pagina.");
    }
    const message = intent === "POSTED"
      ? `DIRETORIA - PUBLICADO POR CONFIRMACAO MANUAL DO DIRETOR (SEM COMPROVANTE ANEXADO). Nao e confirmacao automatica das plataformas.`
      : intent === "NOT_POSTED" ? `DIRETORIA - NAO PUBLICADO${note ? `: ${note}` : ""}`
      : intent === "FOLLOWUP" ? `DIRETORIA - SOLICITACAO DE POSICAO [${sector}]${note ? `: ${note}` : ""}`
      : intent === "ARCHIVE" ? `DIRETORIA - ARQUIVADO: ${note}`
      : `DIRETORIA - RESTAURADO${note ? `: ${note}` : ""}`;
    const action = intent === "POSTED" ? "DIRECTOR_CONFIRMED_MANUAL_POST"
      : intent === "NOT_POSTED" ? "DIRECTOR_CONFIRMED_NOT_POSTED"
      : intent === "FOLLOWUP" ? "DIRECTOR_REQUESTED_POSITION"
      : intent === "ARCHIVE" ? "DIRECTOR_ARCHIVED_CONTENT"
      : "DIRECTOR_RESTORED_CONTENT";
    const description = intent === "ARCHIVE" ? `Diretoria arquivou ${content.title}. STATUS_ORIGINAL:${content.status}. Motivo: ${note}`
      : intent === "RESTORE" ? `Diretoria restaurou ${content.title} para ${restoredStatus}.${note ? ` Nota: ${note}` : ""}`
      : intent === "POSTED" ? `Diretoria marcou ${content.title} como publicado por confirmacao manual, sem comprovante anexado. Registro de ${author}.`
      : intent === "FOLLOWUP" ? `Diretoria cobrou ${sector} sobre ${content.title}.` : `Diretoria registrou pendencia para ${content.title}.`;
    await tx.comment.create({data:{contentId,authorName:author,authorRole:"DIRECTOR",message}});
    await tx.historyLog.create({data:{entityType:"CONTENT",entityId:contentId,action,description,authorName:author}});
  });
  for(const path of ["/social-media/diretoria","/social-media","/clientes","/design","/filmmaker","/conteudos","/operacao","/calendario","/calendario-editorial",`/conteudos/${contentId}`]) revalidatePath(path);
}
