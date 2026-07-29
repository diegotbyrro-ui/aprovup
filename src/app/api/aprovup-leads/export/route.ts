import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function escapeCsv(value: unknown) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export async function GET() {
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
    'Maior dificuldade',
    'Status',
    'Origem',
    'Data',
  ];

  const rows = leads.map((lead) => [
    lead.name,
    lead.agency,
    lead.whatsapp,
    lead.clientCount || '',
    lead.biggestPain || '',
    lead.status,
    lead.source,
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
