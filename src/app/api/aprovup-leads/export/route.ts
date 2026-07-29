import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function escapeCsv(value: string | null | undefined) {
  if (!value) return '';

  const safeValue = value.replace(/"/g, '""');

  return `"${safeValue}"`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export async function GET() {
  const user = await requireCurrentUser();

  if (user.role !== 'DIRECTOR') {
    return NextResponse.json(
      {
        error: 'Acesso negado.',
      },
      {
        status: 403,
      },
    );
  }

  const leads = await prisma.aprovUpLead.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  const header = [
    'Nome',
    'Agencia',
    'WhatsApp',
    'Quantidade de clientes',
    'Maior dor',
    'Origem',
    'Status',
    'Data de cadastro',
  ];

  const rows = leads.map((lead) => [
    lead.name,
    lead.agency,
    lead.whatsapp,
    lead.clientCount || '',
    lead.biggestPain || '',
    lead.source,
    lead.status,
    formatDate(lead.createdAt),
  ]);

  const csv = [
    header.map(escapeCsv).join(';'),
    ...rows.map((row) => row.map(escapeCsv).join(';')),
  ].join('\n');

  return new NextResponse('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="leads-aprovup.csv"',
    },
  });
}