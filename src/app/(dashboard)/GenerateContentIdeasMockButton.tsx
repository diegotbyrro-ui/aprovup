import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type GenerateContentIdeasMockButtonProps = {
    clientId: string;
};

function addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

async function generateContentIdeas(clientId: string) {
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

    const baseDate = new Date();

    const ideas = [
        {
            title: "Post de autoridade sobre o principal problema do público",
            objective:
                "Gerar autoridade mostrando que a marca entende a dor principal da audiência.",
            format: "Carrossel",
            platform: "Instagram",
            caption: `Nem sempre o problema está na falta de interesse do público. Muitas vezes, a comunicação ainda não deixou claro por que a solução da ${client.name} é importante. Este conteúdo deve educar, gerar identificação e aproximar a marca da audiência.`,
            artText:
                "Capa: O erro que pode estar afastando seus clientes\nCards: explique a dor, mostre o impacto e apresente a solução com clareza.",
            script:
                "Estruture o conteúdo com uma abertura forte, explique a dor do público, mostre o que a marca observa na prática e finalize com um convite para conversar.",
            briefing:
                "Criar visual educativo, limpo e com hierarquia clara. Usar linguagem visual alinhada ao posicionamento da marca.",
            plannedDate: addDays(baseDate, 1),
        },
        {
            title: "Conteúdo de prova social ou bastidor estratégico",
            objective:
                "Aumentar confiança mostrando processo, bastidores, atendimento ou resultado real.",
            format: "Reels",
            platform: "Instagram",
            caption: `Confiança não nasce apenas do que a marca promete, mas do que ela mostra na prática. Este conteúdo deve apresentar um bastidor, processo ou detalhe que reforce a credibilidade da ${client.name}.`,
            artText:
                "Texto na tela: Confiança se constrói nos detalhes\nMostrar cenas reais do processo, atendimento ou estrutura.",
            script:
                "Começar com uma frase de impacto, mostrar bastidores ou processo, explicar rapidamente o diferencial e finalizar com uma chamada simples.",
            briefing:
                "Usar vídeos reais, cortes rápidos e estética profissional. Priorizar autenticidade e clareza.",
            plannedDate: addDays(baseDate, 3),
        },
        {
            title: "Post de clareza da oferta",
            objective:
                "Explicar de forma simples o que a empresa oferece, para quem oferece e por que isso importa.",
            format: "Post Estático",
            platform: "Instagram",
            caption: `Se o público não entende rapidamente o que uma empresa faz, ele dificilmente avança para o próximo passo. Este conteúdo deve deixar clara a oferta da ${client.name}, conectando serviço, benefício e necessidade do público.`,
            artText:
                "Título: O que a [marca] faz por você?\nSubtítulo: Uma explicação simples, direta e sem complicação.",
            script:
                "Não se aplica. Conteúdo focado em peça estática com legenda explicativa.",
            briefing:
                "Criar arte direta, com boa leitura e foco na proposta de valor. Evitar excesso de elementos.",
            plannedDate: addDays(baseDate, 5),
        },
        {
            title: "Conteúdo sobre objeções do público",
            objective:
                "Quebrar objeções e responder dúvidas que impedem o público de tomar decisão.",
            format: "Carrossel",
            platform: "Instagram",
            caption: `Toda decisão tem dúvidas no caminho. Este conteúdo deve responder objeções comuns do público da ${client.name}, mostrando segurança, clareza e orientação.`,
            artText:
                "Capa: Antes de decidir, você precisa saber disso\nCards: dúvidas comuns + respostas objetivas.",
            script:
                "Transformar as principais objeções em perguntas e responder de forma simples, segura e consultiva.",
            briefing:
                "Visual com tom educativo e confiável. Usar cards curtos, bem espaçados e fáceis de ler.",
            plannedDate: addDays(baseDate, 7),
        },
        {
            title: "Post de posicionamento da marca",
            objective:
                "Reforçar posicionamento, diferenciais e percepção de valor da marca.",
            format: "Reels",
            platform: "Instagram",
            caption: `Uma marca forte não é lembrada apenas pelo que vende, mas pela forma como se posiciona. Este conteúdo deve reforçar os diferenciais da ${client.name} e mostrar por que ela é uma escolha segura para o público.`,
            artText:
                "Texto na tela: Não é só sobre vender. Ã‰ sobre entregar valor com clareza.",
            script:
                "Abrir com uma frase de posicionamento, mostrar diferenciais reais, conectar com a dor da audiência e finalizar com uma chamada institucional.",
            briefing:
                "Usar imagens fortes da marca, equipe, estrutura, produto ou atendimento. Tom premium e seguro.",
            plannedDate: addDays(baseDate, 9),
        },
    ];

    for (const idea of ideas) {
        await prisma.content.create({
            data: {
                title: idea.title,
                objective: idea.objective,
                format: idea.format,
                platform: idea.platform,
                plannedDate: idea.plannedDate,
                responsible: "Equipe Level UP",
                caption: idea.caption,
                artText: idea.artText,
                script: idea.script,
                briefing: [
                    idea.briefing,
                    "",
                    client.segment ? `Segmento do cliente: ${client.segment}` : "",
                    client.toneOfVoice ? `Tom de voz: ${client.toneOfVoice}` : "",
                    persona?.painPoints ? `Dores da persona: ${persona.painPoints}` : "",
                    persona?.desires ? `Desejos da persona: ${persona.desires}` : "",
                    diagnosis?.improvementPoints
                        ? `Pontos de melhoria do diagnóstico: ${diagnosis.improvementPoints}`
                        : "",
                ]
                    .filter(Boolean)
                    .join("\n"),
                status: "IDEIA",
                clientId,
            },
        });
    }

    await prisma.historyLog.create({
        data: {
            entityType: "CLIENT",
            entityId: clientId,
            action: "CONTENT_IDEAS_GENERATED",
            description:
                "5 ideias de conteúdo foram geradas automaticamente com base no diagnóstico, persona e estratégia da marca.",
            authorName: "Assistente Mock",
        },
    });

    revalidatePath(`/clientes/${clientId}`);
    revalidatePath("/conteudos");
    revalidatePath("/calendario");
}

export default function GenerateContentIdeasMockButton({
    clientId,
}: GenerateContentIdeasMockButtonProps) {
    const action = generateContentIdeas.bind(null, clientId);

    return (
        <form action={action}>
            <button
                type="submit"
                className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
                Gerar 5 Ideias de Conteúdo
            </button>
        </form>
    );
}

