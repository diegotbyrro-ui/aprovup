import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/userAccess';
import { canAccessClient } from '@/lib/clientAccess';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SocialConnectionsRedirect({ searchParams }: {
  searchParams: Promise<{ cliente?: string; youtube?: string; tiktok?: string }>;
}) {
  const user = await requirePermission('social.view');
  const query = await searchParams;
  const clients = await prisma.client.findMany({
    where: { agencyId: user.agencyId },
    select: { id: true, agencyId: true, internalResponsible: true },
    orderBy: { name: 'asc' },
  });
  const accessible = clients.filter(client => canAccessClient(user, client));
  const selected = accessible.find(client => client.id === query.cliente) || accessible[0];
  if (!selected) redirect('/clientes');
  const platform = query.tiktok ? 'tiktok' : 'youtube';
  const status = query.tiktok ? `?tiktok=${encodeURIComponent(query.tiktok)}`
    : query.youtube ? `?youtube=${encodeURIComponent(query.youtube)}` : '';
  redirect(`/clientes/${encodeURIComponent(selected.id)}/${platform}${status}`);
}
