"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/userAccess";
import { validatePublicationProof } from "@/lib/directorOverdue";

const ALLOWED = new Set(["POSTED", "NOT_POSTED", "FOLLOWUP"]);
const SECTORS = new Set(["DESIGN", "FILMMAKER", "SOCIAL_MEDIA"]);

export async function directorReviewAction(contentId: string, formData: FormData) {
  const user = await requirePermission("social.manage");
  if (user.role !== "DIRECTOR") throw new Error("Acesso exclusivo da Diretoria.");

  const intent = String(formData.get("intent") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const sector = String(formData.get("sector") || "").trim();
  const evidence = String(formData.get("evidence") || "").trim();

  if (!ALLOWED.has(intent)) throw new Error("Acao desconhecida.");
  if (note.length < 8 || note.length > 700) throw new Error("Informe uma justificativa de 8 a 700 caracteres.");
  if (intent === "FOLLOWUP" && !SECTORS.has(sector)) throw new Error("Selecione o setor para a cobranca.");
  const links = intent === "POSTED" ? validatePublicationProof(evidence) : [];
  const author = user.name || user.email || "Diretoria";

  await prisma.$transaction(async (tx) => {
    const content = await tx.content.findFirst({
      where: { id: contentId, client: { agencyId: user.agencyId } },
      select: {
        id: true, title: true, status: true,
        instagramPublication: {select:{status:true}},
        instagramStoryPublication: {select:{status:true}},
        socialPublications: {select:{platform:true,selected:true,status:true}},
      },
    });
    if (!content) throw new Error("Conteudo nao encontrado para sua agencia.");

    if (intent === "POSTED") {
      if (["PUBLICADO", "PUBLICADO_MANUALMENTE"].includes(content.status)) {
        throw new Error("Este conteudo ja esta marcado como publicado.");
      }
      // Evita duplicidade: nao dar baixa manual enquanto uma publicacao automatica
      // ainda estiver agendada, publicando ou processando. O fluxo de agendamento
      // precisa ser resolvido separadamente antes da reconciliacao.
      const automaticStates = [
        content.instagramPublication?.status,
        content.instagramStoryPublication?.status,
        ...content.socialPublications.filter(p=>p.selected).map(p=>p.status),
      ];
      if (automaticStates.some(status => ["AGENDADO", "PUBLICANDO", "PROCESSANDO"].includes(status || ""))) {
        throw new Error("Existe agendamento ou publicacao automatica ativa. Resolva esse envio antes de confirmar manualmente, para evitar duplicidade.");
      }
      const platforms = new Set(content.socialPublications.filter(p=>p.selected).map(p=>p.platform));
      if (content.instagramPublication) platforms.add("INSTAGRAM");
      if (content.instagramStoryPublication) platforms.add("INSTAGRAM_STORY");
      if (links.length < Math.max(1, platforms.size)) {
        throw new Error("Informe ao menos um comprovante por canal selecionado, inclusive Story se aplicavel.");
      }
      const result = await tx.content.updateMany({
        where: { id: contentId, client: {agencyId: user.agencyId}, status: {notIn:["PUBLICADO","PUBLICADO_MANUALMENTE"]} },
        data: { status: "PUBLICADO_MANUALMENTE" },
      });
      if (result.count !== 1) throw new Error("Outro usuario atualizou o conteudo. Atualize a pagina.");
    }

    const message = intent === "POSTED"
      ? `DIRETORIA - POSTAGEM CONFERIDA MANUALMENTE: ${note}\nComprovantes:\n${links.join("\n")}\nSem confirmacao automatica das plataformas.`
      : intent === "NOT_POSTED"
        ? `DIRETORIA - NAO PUBLICADO: ${note}`
        : `DIRETORIA - SOLICITACAO DE POSICAO [${sector}]: ${note}`;

    await tx.comment.create({
      data: {contentId, authorName: author, authorRole: "DIRECTOR", message},
    });
    await tx.historyLog.create({
      data: {
        entityType: "CONTENT", entityId: contentId,
        action: intent === "POSTED" ? "DIRECTOR_CONFIRMED_MANUAL_POST" : intent === "NOT_POSTED" ? "DIRECTOR_CONFIRMED_NOT_POSTED" : "DIRECTOR_REQUESTED_POSITION",
        description: intent === "FOLLOWUP" ? `Diretoria solicitou uma posicao de ${sector} para o conteudo ${content.title}.` :
          intent === "POSTED" ? `Diretoria confirmou manualmente a publicacao de ${content.title} com ${links.length} comprovante(s).` :
          `Diretoria registrou que ${content.title} ainda nao foi publicado.`,
        authorName: author,
      },
    });
  });

  for (const route of ["/social-media/diretoria", "/social-media", "/design", "/filmmaker", "/conteudos", "/operacao", "/calendario-editorial", `/conteudos/${contentId}`]) {
    revalidatePath(route);
  }
}
