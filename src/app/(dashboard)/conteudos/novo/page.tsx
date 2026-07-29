import { redirect } from 'next/navigation';

export default async function NovoConteudoRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{
    cliente?: string;
    data?: string;
  }>;
}) {
  const query = searchParams ? await searchParams : {};

  const cliente = String(query?.cliente || '').trim();
  const data = String(query?.data || '').trim();

  if (cliente && data) {
    redirect(`/conteudos/novo-dia?cliente=${cliente}&data=${data}`);
  }

  if (cliente) {
    redirect(`/conteudos/novo-dia?cliente=${cliente}`);
  }

  redirect('/clientes');
}
