"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/userAccess";


export async function updateReadyCaption(
    contentId: string,
    caption: string
) {
    const currentUser =
        await requirePermission(
            "social.manage"
        );

    const normalizedCaption =
        typeof caption ===
        "string"
            ? caption.trim()
            : "";

    if (
        normalizedCaption.length >
        10000
    ) {
        throw new Error(
            "A legenda ultrapassa o limite permitido pelo AprovUp."
        );
    }

    const content =
        await prisma.content.findFirst({
            where: {
                id:
                    contentId,

                client: {
                    agencyId:
                        currentUser.agencyId,
                },

                status:
                    "PRONTO_PARA_POSTAR",
            },
        });

    if (!content) {
        throw new Error(
            "Conteúdo não encontrado ou não está mais em Pronto para Postar."
        );
    }

    await prisma.content.update({
        where: {
            id:
                contentId,
        },

        data: {
            caption:
                normalizedCaption,
        },
    });

    revalidatePath(
        "/pronto-para-postar"
    );

    revalidatePath(
        `/conteudos/${contentId}`
    );

    return {
        ok:
            true,

        caption:
            normalizedCaption,
    };
}
export async function markContentAsPublished(contentId: string) {
    const currentUser =
        await requirePermission(
            "social.manage"
        );

    const content = await prisma.content.findFirst({
        where: {
            id:
                contentId,

            client: {
                agencyId:
                    currentUser.agencyId,
            },
        },
    });

    if (!content) {
        throw new Error("Conteúdo não encontrado.");
    }

    await prisma.content.update({
        where: {
            id: contentId,
        },
        data: {
            status: "PUBLICADO_MANUALMENTE",
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType: "CONTENT",
            entityId: contentId,
            action: "CONTENT_MARKED_AS_PUBLISHED",
            description: `Conteúdo "${content.title}" marcado como publicado manualmente.`,
            authorName: "Equipe Level UP",
        },
    });

    revalidatePath("/pronto-para-postar");
    revalidatePath("/clientes");
    revalidatePath("/entregas-semana");
    revalidatePath("/conteudos/kanban");
    revalidatePath(`/conteudos/${contentId}`);
}

function getStorySource(content: {
    format: string | null;
    finalMediaUrl: string | null;
    finalMediaType: string | null;
    finalCoverUrl: string | null;
    storyMediaUrl: string | null;
    storyMediaType: string | null;
    storyCoverUrl: string | null;
}) {
    const format =
        String(content.format || '')
            .trim()
            .toUpperCase();

    const storyOnly =
        format.includes('STORY');

    const dedicatedUrl =
        content.storyMediaUrl?.trim() || '';

    const feedUrl =
        content.finalMediaUrl?.trim() || '';

    const mediaUrl =
        dedicatedUrl || feedUrl;

    const mediaType =
        dedicatedUrl
            ? content.storyMediaType?.trim() || ''
            : content.finalMediaType?.trim() || '';

    const coverUrl =
        dedicatedUrl
            ? content.storyCoverUrl || dedicatedUrl
            : content.finalCoverUrl || feedUrl;

    return {
        storyOnly,
        mediaUrl,
        mediaType,
        coverUrl,
        valid:
            Boolean(mediaUrl) &&
            (
                mediaType.startsWith('image/') ||
                mediaType.startsWith('video/')
            ),
    };
}


export async function enableStoryForContent(contentId: string) {
    const currentUser =
        await requirePermission(
            "social.manage"
        );

    const content =
        await prisma.content.findFirst({
            where: {
                id: contentId,

                client: {
                    agencyId:
                        currentUser.agencyId,
                },

                status: {
                    in: [
                        'PRONTO_PARA_POSTAR',
                        'PUBLICADO',
                        'PUBLICADO_MANUALMENTE',
                    ],
                },
            },

            include: {
                client: {
                    include: {
                        instagramConnection:
                            true,
                    },
                },

                instagramStoryPublication:
                    true,
            },
        });

    if (!content) {
        throw new Error(
            "Conteudo nao encontrado ou ainda nao esta liberado para publicacao."
        );
    }

    const source =
        getStorySource(content);

    if (!source.valid) {
        throw new Error(
            "Este conteudo precisa possuir uma imagem ou video final para ir aos Stories."
        );
    }

    if (
        content.instagramStoryPublication
            ?.status === 'PUBLICADO'
    ) {
        throw new Error(
            "Este Story ja foi publicado."
        );
    }

    const connection =
        content.client.instagramConnection;

    await prisma.instagramStoryPublication.upsert({
        where: {
            contentId:
                content.id,
        },

        create: {
            contentId:
                content.id,

            instagramUserId:
                connection?.instagramUserId || null,

            instagramUsername:
                connection?.username || null,

            mediaUrl:
                source.mediaUrl,

            coverUrl:
                source.coverUrl || null,

            mediaType:
                source.mediaType,

            status:
                'PRONTO',
        },

        update: {
            instagramUserId:
                connection?.instagramUserId || null,

            instagramUsername:
                connection?.username || null,

            mediaUrl:
                source.mediaUrl,

            coverUrl:
                source.coverUrl || null,

            mediaType:
                source.mediaType,

            lastError:
                null,
        },
    });

    await prisma.historyLog.create({
        data: {
            entityType:
                "CONTENT",

            entityId:
                content.id,

            action:
                "INSTAGRAM_STORY_ENABLED",

            description:
                `Conteudo "${content.title}" adicionado a fila de Stories.`,

            authorName:
                currentUser.name ||
                currentUser.email ||
                "Equipe Level UP",
        },
    });

    revalidatePath("/pronto-para-postar");
    revalidatePath("/pronto-para-postar/stories");
}


export async function markStoryAsPublished(contentId: string) {
    const currentUser =
        await requirePermission(
            "social.manage"
        );

    const content =
        await prisma.content.findFirst({
            where: {
                id: contentId,

                client: {
                    agencyId:
                        currentUser.agencyId,
                },
            },

            include: {
                instagramStoryPublication:
                    true,
            },
        });

    if (!content) {
        throw new Error(
            "Conteudo nao encontrado."
        );
    }

    const source =
        getStorySource(content);

    if (!source.valid) {
        throw new Error(
            "Material de Story nao encontrado."
        );
    }

    const now =
        new Date();

    await prisma.$transaction(
        async (transaction) => {
            await transaction.instagramStoryPublication.upsert({
                where: {
                    contentId:
                        content.id,
                },

                create: {
                    contentId:
                        content.id,

                    mediaUrl:
                        source.mediaUrl,

                    coverUrl:
                        source.coverUrl || null,

                    mediaType:
                        source.mediaType,

                    status:
                        'PUBLICADO',

                    publishedAt:
                        now,
                },

                update: {
                    status:
                        'PUBLICADO',

                    publishedAt:
                        now,

                    scheduledFor:
                        null,

                    lastError:
                        null,
                },
            });

            if (
                source.storyOnly &&
                content.status ===
                    'PRONTO_PARA_POSTAR'
            ) {
                await transaction.content.update({
                    where: {
                        id:
                            content.id,
                    },

                    data: {
                        status:
                            'PUBLICADO_MANUALMENTE',
                    },
                });
            }

            await transaction.historyLog.create({
                data: {
                    entityType:
                        "CONTENT",

                    entityId:
                        content.id,

                    action:
                        "INSTAGRAM_STORY_MARKED_AS_PUBLISHED",

                    description:
                        `Story do conteudo "${content.title}" marcado como publicado manualmente.`,

                    authorName:
                        currentUser.name ||
                        currentUser.email ||
                        "Equipe Level UP",
                },
            });
        }
    );

    revalidatePath("/pronto-para-postar");
    revalidatePath("/pronto-para-postar/stories");
}
