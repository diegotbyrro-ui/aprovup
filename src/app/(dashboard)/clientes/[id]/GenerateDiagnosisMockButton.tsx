import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type GenerateDiagnosisMockButtonProps = {
    clientId: string;
};

async function generateMockDiagnosis(clientId: string) {
    "use server";

    const client = await prisma.client.findUnique({
        where: {
            id: clientId,
        },
        include: {
            personas: true,
            diagnoses: true,
        },
    });

    if (!client) {
        throw new Error("Cliente não encontrado.");
    }

    const persona = client.personas[0];
    const diagnosis = client.diagnoses[0];

    const instagramUrl = diagnosis?.instagramUrl || "";
    const teamNotes = diagnosis?.teamNotes || "";

    const bioAnalysis = `A bio do perfil precisa comunicar com clareza quem é a marca, o que ela oferece e qual é o próximo passo esperado do visitante. Para ${client.name}, é importante deixar a proposta de valor mais direta, evitando excesso de informações soltas. ${instagramUrl ? `Perfil informado: ${instagramUrl}` : "Nenhum link de Instagram foi informado ainda."
        }`;

    const profilePhotoAnalysis =
        "A foto de perfil precisa ser legível mesmo em tamanho pequeno. O ideal é usar uma marca, símbolo ou imagem com bom contraste, sem excesso de detalhes, para facilitar o reconhecimento rápido do perfil.";

    const visualIdentityAnalysis = `A identidade visual deve manter consistência entre cores, fontes, elementos gráficos e estilo das postagens. Isso ajuda o público a reconhecer a marca mesmo antes de ler o conteúdo. ${client.toneOfVoice ? `O tom de voz cadastrado para a marca é: ${client.toneOfVoice}.` : ""
        }`;

    const highlightsAnalysis =
        "Os destaques precisam funcionar como uma vitrine rápida. Recomenda-se organizar informações essenciais como serviços, depoimentos, bastidores, dúvidas frequentes, localização, resultados e formas de contato.";

    const postingFrequencyAnalysis = `A frequência de postagem deve ser suficiente para gerar presença e lembrança. ${client.postingFrequency
            ? `A frequência cadastrada é: ${client.postingFrequency}.`
            : "Ainda não há frequência cadastrada para este cliente."
        } O ideal é manter constância sem perder qualidade estratégica.`;

    const offerClarityAnalysis =
        "A oferta precisa deixar claro o que a empresa vende, para quem vende e por que o público deveria escolher essa marca. Conteúdos devem reduzir dúvidas, aumentar confiança e conduzir o público para uma ação.";

    const strengths = [
        client.segment ? `Segmento definido: ${client.segment}.` : "Cliente com potencial de organização estratégica.",
        client.contractedServices
            ? `Serviços contratados documentados: ${client.contractedServices}.`
            : "Há espaço para documentar melhor os serviços trabalhados.",
        persona?.desires
            ? `Desejos da persona mapeados: ${persona.desires}.`
            : "A persona pode ser melhor explorada para gerar conteúdos mais direcionados.",
    ].join("\n");

    const improvementPoints = [
        "Deixar a proposta de valor mais evidente nos primeiros segundos de contato com o perfil.",
        "Organizar conteúdos por intenção: autoridade, prova, bastidores, oferta e relacionamento.",
        "Reforçar chamadas para ação em posts, bio e destaques.",
        persona?.painPoints
            ? `Explorar mais as dores da persona: ${persona.painPoints}.`
            : "Mapear com mais profundidade as dores reais da audiência.",
        teamNotes ? `Observação da equipe: ${teamNotes}` : "",
    ]
        .filter(Boolean)
        .join("\n");

    const actionPlan = [
        "1. Revisar a bio para deixar clara a promessa principal da marca.",
        "2. Organizar os destaques em categorias estratégicas.",
        "3. Criar uma linha editorial com conteúdos de autoridade, prova social, bastidores e oferta.",
        "4. Produzir conteúdos que respondam dúvidas e objeções da persona.",
        "5. Acompanhar mensalmente os conteúdos com melhor desempenho para ajustar a estratégia.",
    ].join("\n");

    const data = {
        instagramUrl,
        teamNotes,
        bioAnalysis,
        profilePhotoAnalysis,
        visualIdentityAnalysis,
        highlightsAnalysis,
        postingFrequencyAnalysis,
        offerClarityAnalysis,
        strengths,
        improvementPoints,
        actionPlan,
    };

    if (diagnosis) {
        await prisma.clientProfileDiagnosis.update({
            where: {
                id: diagnosis.id,
            },
            data,
        });
    } else {
        await prisma.clientProfileDiagnosis.create({
            data: {
                ...data,
                clientId,
            },
        });
    }

    await prisma.historyLog.create({
        data: {
            entityType: "CLIENT",
            entityId: clientId,
            action: "DIAGNOSIS_MOCK_GENERATED",
            description: "Diagnóstico de perfil mockado gerado automaticamente.",
            authorName: "Assistente Mock",
        },
    });

    revalidatePath(`/clientes/${clientId}`);
}

export default function GenerateDiagnosisMockButton({
    clientId,
}: GenerateDiagnosisMockButtonProps) {
    const action = generateMockDiagnosis.bind(null, clientId);

    return (
        <form action={action}>
            <button
                type="submit"
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
                Gerar Diagnóstico Mockado
            </button>
        </form>
    );
}

