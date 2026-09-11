import Link from 'next/link';

import {
  ArrowLeft,
} from 'lucide-react';


export function CalendarBackButton({
  clientId,
}: {
  clientId?:
    string;
}) {
  const hasClient =
    Boolean(
      clientId &&
      clientId !==
        'TODOS'
    );

  const href =
    hasClient
      ? `/social-media?cliente=${encodeURIComponent(
          clientId ||
          ''
        )}`
      : '/clientes';

  return (
    <Link
      href={
        href
      }
      className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 transition hover:text-blue-700 hover:underline"
    >
      <ArrowLeft
        size={14}
      />

      {hasClient
        ? 'Voltar para Social Media'
        : 'Voltar para Clientes'}
    </Link>
  );
}
