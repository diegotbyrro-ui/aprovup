import { redirect } from 'next/navigation';

export default async function ClienteVisaoRedirectPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  redirect(`/clientes/${id}`);
}


