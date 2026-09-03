import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAgencyContext } from '@/lib/tenant';

export default async function ClientPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    agencyId,
  } =
    await requireAgencyContext();

  const { id } = await params;

  const client =
    await prisma.client.findFirst({
      where: {
        id,
        agencyId,
      },

      select: {
        id:
          true,
      },
    });

  if (!client) {
    redirect('/clientes');
  }

  redirect(
    `/calendario-editorial?cliente=${id}`
  );
}