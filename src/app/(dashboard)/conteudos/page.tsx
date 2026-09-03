import { prisma } from '@/lib/prisma';
import { requireAgencyContext } from '@/lib/tenant';
import ConteudosClient from './ConteudosClient';

export default async function ConteúdosPage() {
  const { agencyId } =
    await requireAgencyContext();
  const contents = await prisma.content.findMany({
    where: {
      client: {
        agencyId,
      },
    },

    include: { client: true },
    orderBy: { updatedAt: 'desc' }
  });
  
  const clients = await prisma.client.findMany({
    where: {
      agencyId,
    },

    orderBy: { name: 'asc' }
  });

  return <ConteudosClient contents={contents} clients={clients} />;
}


