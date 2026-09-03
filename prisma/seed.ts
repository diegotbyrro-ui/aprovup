import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Populando banco...');

  const levelUpAgency = await prisma.agency.upsert({
    where: { slug: 'level-up' },
    update: {
      name: 'Level UP',
      status: 'ACTIVE',
    },
    create: {
      id: 'agency_level_up',
      name: 'Level UP',
      slug: 'level-up',
      status: 'ACTIVE',
    },
  });

  // Users (upsert por email)
  const u1 = await prisma.user.upsert({
    where: { email: 'admin@levelup.com' },
    update: { agencyId: levelUpAgency.id },
    create: {
      name: 'Diego Admin',
      email: 'admin@levelup.com',
      role: 'ADMIN',
      agencyId: levelUpAgency.id,
    }
  });

  const u2 = await prisma.user.upsert({
    where: { email: 'joao@levelup.com' },
    update: { agencyId: levelUpAgency.id },
    create: {
      name: 'João Social',
      email: 'joao@levelup.com',
      role: 'SOCIAL_MEDIA',
      agencyId: levelUpAgency.id,
    }
  });

  // Clients (verifica se existe pelo nome)
  let c1 = await prisma.client.findFirst({ where: {
    name: 'Tech Solutions',
    agencyId: levelUpAgency.id,
  } });
  if (!c1) {
    c1 = await prisma.client.create({
      data: {
        name: 'Tech Solutions',
        agencyId: levelUpAgency.id,
        segment: 'Tecnologia',
        internalResponsible: u2.id,
        strategicNotes: 'Foco B2B no LinkedIn.',
      }
    });
  }

  let c2 = await prisma.client.findFirst({ where: {
    name: 'Burger Kingo',
    agencyId: levelUpAgency.id,
  } });
  if (!c2) {
    c2 = await prisma.client.create({
      data: {
        name: 'Burger Kingo',
        agencyId: levelUpAgency.id,
        segment: 'Alimentação',
        strategicNotes: 'Promoções semanais no Instagram e TikTok.',
      }
    });
  }

  // Contents (verifica se existe pelo titulo e cliente)
  let content1 = await prisma.content.findFirst({ where: { title: 'Dicas de Segurança', clientId: c1.id } });
  if (!content1) {
    content1 = await prisma.content.create({
      data: {
        title: 'Dicas de Segurança',
        format: 'Carrossel',
        status: 'DESIGN',
        clientId: c1.id,
        responsible: u1.id,
        plannedDate: new Date(new Date().setDate(new Date().getDate() + 2)),
        caption: 'A segurança da sua empresa não pode esperar.',
      }
    });
    
    // Task
    await prisma.task.create({
      data: {
        title: 'Criar arte base',
        status: 'FINALIZADO',
        contentId: content1.id,
        responsible: u1.id,
      }
    });
  }

  let content2 = await prisma.content.findFirst({ where: { title: 'Promoção de Fim de Semana', clientId: c2.id } });
  if (!content2) {
    content2 = await prisma.content.create({
      data: {
        title: 'Promoção de Fim de Semana',
        format: 'Reels',
        status: 'ENVIADO_CLIENTE',
        clientId: c2.id,
        responsible: u2.id,
        plannedDate: new Date(new Date().setDate(new Date().getDate() + 1)),
        caption: 'Já experimentou o novo monstro do pedaço?',
      }
    });

    // Approval
    await prisma.approval.create({
      data: {
        token: 'token-burger-456',
        status: 'PENDENTE',
        contentId: content2.id,
      }
    });
  }

  // Prompts (verifica se existe pelo titulo)
  const promptsData = [
    { title: 'Legenda curta para Instagram', category: 'Instagram', segment: 'Geral', prompt: 'Escreva uma legenda curta e engajadora...' },
    { title: 'Roteiro de Reels até 40 segundos', category: 'Vídeo', segment: 'Geral', prompt: 'Crie um roteiro de vídeo curto com gancho...' },
    { title: 'Carrossel educativo de 5 cards', category: 'Instagram', segment: 'Geral', prompt: 'Estruture um carrossel educativo de 5 slides...' },
    { title: 'Briefing para designer', category: 'Produção', segment: 'Geral', prompt: 'Escreva um briefing visual claro e direto...' },
    { title: 'Briefing para filmmaker', category: 'Produção', segment: 'Geral', prompt: 'Escreva as diretrizes para captação de vídeo...' },
    { title: 'Conteúdo para clínicas', category: 'Saúde', segment: 'Clínica', prompt: 'Crie um post passando autoridade sobre saúde...' },
    { title: 'Conteúdo para escolas', category: 'Educação', segment: 'Escola', prompt: 'Crie um post focando em metodologias de ensino...' },
    { title: 'Conteúdo para hotéis', category: 'Turismo', segment: 'Hotel', prompt: 'Crie um roteiro mostrando a experiência do hotel...' },
    { title: 'Conteúdo para concessionárias', category: 'Vendas', segment: 'Auto', prompt: 'Crie uma legenda de oferta de carro seminovo...' },
    { title: 'Conteúdo para engenharia/construção', category: 'Engenharia', segment: 'Construção', prompt: 'Mostre a evolução de uma obra com um texto técnico...' }
  ];

  for (const p of promptsData) {
    const existing = await prisma.promptTemplate.findFirst({ where: { title: p.title } });
    if (!existing) {
      await prisma.promptTemplate.create({ data: p });
    }
  }

  console.log('Seed concluído com sucesso (idempotente)!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
