export const mockUsers = [
  { id: '1', name: 'Diego Admin', email: 'admin@levelup.com', role: 'ADMIN' },
  { id: '2', name: 'João Social', email: 'joao@levelup.com', role: 'SOCIAL_MEDIA' },
  { id: '3', name: 'Maria Designer', email: 'maria@levelup.com', role: 'DESIGNER' },
];

export const mockClients = [
  { id: '1', name: 'Tech Solutions', logo: '', description: 'Consultoria de TI', strategyDoc: 'Foco B2B no LinkedIn.' },
  { id: '2', name: 'Burger Kingo', logo: '', description: 'Hamburgueria', strategyDoc: 'Promoções semanais no Instagram e TikTok.' },
  { id: '3', name: 'Fit Gym', logo: '', description: 'Academia Premium', strategyDoc: 'Mostrar estrutura e resultados dos alunos.' },
];

export const mockContents = [
  {
    id: '1',
    title: 'Dicas de Segurança',
    description: 'Carrossel com 5 dicas de segurança cibernética.',
    caption: 'A segurança da sua empresa não pode esperar. Confira 5 dicas essenciais! ðŸ”’ #Segurança #TI',
    status: 'DESIGN',
    format: 'Carrossel',
    publishDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
    mediaUrls: ['https://google.com/drive/arte1'],
    clientId: '1',
    assigneeId: '3',
    approvalToken: 'token-tech-123',
  },
  {
    id: '2',
    title: 'Promoção de Fim de Semana',
    description: 'Reels mostrando a montagem do novo lanche.',
    caption: 'Já experimentou o novo monstro do pedaço? ðŸ” Corre que é por tempo limitado!',
    status: 'ENVIADO_CLIENTE',
    format: 'Reels',
    publishDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    mediaUrls: ['https://google.com/drive/video1'],
    clientId: '2',
    assigneeId: '2',
    approvalToken: 'token-burger-456',
  },
  {
    id: '3',
    title: 'Treino de Pernas Completo',
    description: 'Vídeo curto com 3 exercícios fundamentais.',
    caption: 'Dia de perna não pode faltar! Salve esse treino para a próxima vez na Fit Gym. ðŸ‹ï¸â€â™€ï¸ðŸ”¥',
    status: 'IDEIA',
    format: 'Stories',
    publishDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    mediaUrls: [],
    clientId: '3',
    assigneeId: '1',
    approvalToken: 'token-fit-789',
  },
  {
    id: '4',
    title: 'Meme de TI',
    description: 'Imagem engraçada sobre servidor caindo sexta-feira.',
    caption: 'Quem nunca passou por isso? ðŸ˜‚ #TI #Desenvolvedor',
    status: 'APROVADO',
    format: 'Imagem Ãšnica',
    publishDate: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(),
    mediaUrls: ['https://google.com/drive/meme1'],
    clientId: '1',
    assigneeId: '2',
    approvalToken: 'token-tech-999',
  }
];

export const mockTasks = [
  { id: '1', title: 'Criar arte base', isCompleted: true, contentId: '1', assigneeId: '3' },
  { id: '2', title: 'Aprovar copy', isCompleted: false, contentId: '1', assigneeId: '1' },
];

export const mockApprovals = [
  { id: '1', contentId: '2', status: 'ALTERACAO_SOLICITADA', notes: 'Pode deixar o logo um pouco maior no final do vídeo?', createdAt: new Date().toISOString() },
];


