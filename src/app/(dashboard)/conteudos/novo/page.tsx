import {
  redirect,
} from 'next/navigation';


export default async function NovoConteudoRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{
    cliente?: string;
    data?: string;
    retorno?: string;
  }>;
}) {
  const query =
    searchParams
      ? await searchParams
      : {};


  const cliente =
    String(
      query?.cliente ||
      ''
    ).trim();


  const data =
    String(
      query?.data ||
      ''
    ).trim();


  const retorno =
    String(
      query?.retorno ||
      ''
    ).trim();


  const params =
    new URLSearchParams();


  if (cliente) {
    params.set(
      'cliente',
      cliente
    );
  }


  if (data) {
    params.set(
      'data',
      data
    );
  }


  if (retorno) {
    params.set(
      'retorno',
      retorno
    );
  }


  if (cliente) {
    redirect(
      '/conteudos/novo-dia?' +
      params.toString()
    );
  }


  redirect(
    '/clientes'
  );
}
