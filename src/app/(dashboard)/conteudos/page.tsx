import { prisma } from '@/lib/prisma';
import ConteudosClient from './ConteudosClient';

export default async function ConteúdosPage() {
  const contents = await prisma.content.findMany({
    include: { client: true },
    orderBy: { updatedAt: 'desc' }
  });
  
  const clients = await prisma.client.findMany({
    orderBy: { name: 'asc' }
  });

  return <ConteudosClient contents={contents} clients={clients} />;
}


