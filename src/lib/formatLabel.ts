export function formatLabel(value?: string | null) {
  if (!value) return '';

  const dictionary: Record<string, string> = {
    RASCUNHO: 'Rascunho',
    IDEIA: 'Ideia',
    CLIENTE: 'Cliente',
    EM_APROVACAO: 'Em Aprovação',
    ENVIADO_CLIENTE: 'Enviado ao Cliente',
    ENVIADO_AO_CLIENTE: 'Enviado ao Cliente',
    ALTERACAO_SOLICITADA: 'Ajuste Solicitado',
    APROVADO: 'Aprovado',
    APROVADO_FINAL: 'Aprovado Final',
    PRONTO_PARA_POSTAR: 'Pronto para Postar',
    POSTADO: 'Postado',

    SOCIAL_MEDIA: 'Social Media',
    GERAL: 'Geral',

    DESIGN: 'Design',
    DESIGN_FAZENDO: 'Design em Produção',
    DESIGN_ANALISE: 'Design em Análise',
    DESIGN_DUVIDA: 'Dúvida do Design',
    DESIGN_MOTION: 'Design Motion',

    FILMMAKER: 'Filmaker',
    FILMMAKER_PRE_PRODUCAO: 'Pré-produção',
    FILMMAKER_AGENDAMENTO: 'Agendamento',
    FILMMAKER_GRAVACAO: 'Gravando',
    FILMMAKER_EDICAO: 'Edição',
    FILMMAKER_ANALISE: 'Análise',
    FILMMAKER_DUVIDA: 'Dúvida do Filmmaker',

    POST_ESTATICO: 'Post Estático',
    CARROSSEL: 'Carrossel',
    REELS: 'Reels',
    VIDEO: 'Vídeo',
    STORY: 'Story',
    STORIES: 'Stories',
    MOTION: 'Motion',

    BAIXA: 'Baixa',
    MEDIA: 'Média',
    ALTA: 'Alta',
    URGENTE: 'Urgente',
  };

  const raw = String(value).trim();

  if (dictionary[raw]) {
    return dictionary[raw];
  }

  return raw
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => {
      const accents: Record<string, string> = {
        social: 'Social',
        media: 'Media',
        estatico: 'Estático',
        aprovacao: 'Aprovação',
        producao: 'Produção',
        pre: 'Pré',
        analise: 'Análise',
        midia: 'Mídia',
        video: 'Vídeo',
        conteudo: 'Conteúdo',
        revisao: 'Revisão',
        edicao: 'Edição',
        gravacao: 'Gravação',
        agendamento: 'Agendamento',
        cliente: 'Cliente',
        ajuste: 'Ajuste',
        solicitado: 'Solicitado',
      };

      if (accents[word]) return accents[word];

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
