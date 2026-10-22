export type PublishState = {
  status: string;
  metaMediaId?: string | null;
  permalink?: string | null;
  scheduledFor?: Date | null;
};

export type SocialPublishState = {
  status: string;
  externalId?: string | null;
  permalink?: string | null;
};

/** Never turn a verifiable external publication back into "ready". */
export function getManualPublicationRevertBlockReason(input: {
  status: string;
  instagram?: PublishState | null;
  story?: PublishState | null;
  social?: SocialPublishState[];
}): string | null {
  if (input.status !== 'PUBLICADO_MANUALMENTE') {
    return 'Somente uma marcacao manual de publicado pode ser desfeita. Atualize a pagina.';
  }
  const connected = [input.instagram, input.story];
  if (connected.some((publication) => Boolean(publication?.metaMediaId || publication?.permalink))) {
    return 'Existe uma publicacao confirmada por uma rede social. Ela nao pode ser revertida por este botao.';
  }
  if (input.story?.status === 'PUBLICADO') {
    return 'Os Stories ja aparecem como publicados. Confira a publicacao antes de alterar o status geral.';
  }
  const activeStatuses = new Set(['AGENDADO', 'PUBLICANDO', 'PROCESSANDO']);
  if (connected.some((publication) => publication && activeStatuses.has(publication.status))) {
    return 'Ha uma publicacao agendada ou em andamento. Resolva o agendamento antes de reverter o status.';
  }
  if ((input.social || []).some((publication) => publication.status === 'PUBLICADO' || Boolean(publication.externalId || publication.permalink))) {
    return 'Ha uma publicacao registrada em outra rede social. Confira antes de alterar o status.';
  }
  if ((input.social || []).some((publication) => activeStatuses.has(publication.status))) {
    return 'Ha uma publicacao agendada ou em andamento em outra rede social.';
  }
  return null;
}
