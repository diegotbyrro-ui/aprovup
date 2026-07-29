import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function clean(value: unknown) {
  return String(value || '').trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = clean(body.name);
    const agency = clean(body.agency);
    const whatsapp = clean(body.whatsapp);
    const clientCount = clean(body.clientCount);
    const biggestPain = clean(body.biggestPain);

    if (!name || !agency || !whatsapp) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Preencha nome, agência e WhatsApp.',
        },
        {
          status: 400,
        }
      );
    }

    const lead = await prisma.aprovUpLead.create({
      data: {
        name,
        agency,
        whatsapp,
        clientCount,
        biggestPain,
        source: 'site-aprovup',
        status: 'NOVO',
      },
    });

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
    });
  } catch (error) {
    console.error('Erro ao salvar lead AprovUp:', error);

    return NextResponse.json(
      {
        ok: false,
        message: 'Não foi possível salvar o lead agora.',
      },
      {
        status: 500,
      }
    );
  }
}
