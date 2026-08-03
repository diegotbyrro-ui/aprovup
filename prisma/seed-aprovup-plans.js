const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const plans = [
  {
    name: 'AprovUp Start',
    slug: 'aprovup-start',
    description: 'Calendário, organização de conteúdos e aprovação com cliente.',
    priceCents: 9700,
    setupFeeCents: 0,
    maxClients: 5,
    maxUsers: 2,
    canUseAi: false,
    canUseCrm: false,
    canUseSocialPosting: false,
    canUseReports: false,
    monthlyAiLimitCents: 0,
    sortOrder: 1,
    isPublic: true,
  },
  {
    name: 'AprovUp Pro',
    slug: 'aprovup-pro',
    description: 'Gestão de conteúdo, aprovação, equipe, design e filmmaker.',
    priceCents: 19700,
    setupFeeCents: 0,
    maxClients: 20,
    maxUsers: 6,
    canUseAi: false,
    canUseCrm: false,
    canUseSocialPosting: false,
    canUseReports: true,
    monthlyAiLimitCents: 0,
    sortOrder: 2,
    isPublic: true,
  },
  {
    name: 'AprovUp IA',
    slug: 'aprovup-ia',
    description: 'AprovUp Pro com assistente de IA no calendário usando API da própria agência.',
    priceCents: 29700,
    setupFeeCents: 0,
    maxClients: 20,
    maxUsers: 8,
    canUseAi: true,
    canUseCrm: false,
    canUseSocialPosting: false,
    canUseReports: true,
    monthlyAiLimitCents: 10000,
    sortOrder: 3,
    isPublic: true,
  },
  {
    name: 'AprovUp Social',
    slug: 'aprovup-social',
    description: 'AprovUp Pro com postagem automática e relatórios de redes sociais.',
    priceCents: 39700,
    setupFeeCents: 0,
    maxClients: 20,
    maxUsers: 8,
    canUseAi: false,
    canUseCrm: false,
    canUseSocialPosting: true,
    canUseReports: true,
    monthlyAiLimitCents: 0,
    sortOrder: 4,
    isPublic: true,
  },
  {
    name: 'AprovUp Full',
    slug: 'aprovup-full',
    description: 'AprovUp completo com IA, Social, CRM e relatórios.',
    priceCents: 59700,
    setupFeeCents: 0,
    maxClients: 40,
    maxUsers: 15,
    canUseAi: true,
    canUseCrm: true,
    canUseSocialPosting: true,
    canUseReports: true,
    monthlyAiLimitCents: 20000,
    sortOrder: 5,
    isPublic: true,
  },
];

function centsToBrl(cents) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

async function main() {
  console.log('');
  console.log('==== APROVUP - CADASTRANDO PLANOS INICIAIS ====');
  console.log('');

  for (const plan of plans) {
    const saved = await prisma.saasPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });

    console.log(`OK - ${saved.name} | ${centsToBrl(saved.priceCents)}`);
  }

  console.log('');
  console.log('Planos iniciais cadastrados/atualizados com sucesso.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });