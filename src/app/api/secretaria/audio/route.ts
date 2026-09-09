import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  getSecretaryApiUser,
} from '@/lib/secretaryAccess';

import {
  transcribeSecretaryAudio,
} from '@/lib/secretaryAudio';


export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

export const maxDuration =
  120;


export async function POST(
  request:
    NextRequest
) {
  try {
    const access =
      await getSecretaryApiUser();


    if (!access.ok) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            access.message,
        },
        {
          status:
            access.status,
        }
      );
    }


    const incoming =
      await request
        .formData();


    const audio =
      incoming.get(
        'audio'
      );


    if (
      !(
        audio instanceof
        File
      ) ||
      audio.size ===
        0
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          message:
            'Áudio não recebido.',
        },
        {
          status:
            400,
        }
      );
    }


    const text =
      await transcribeSecretaryAudio({
        agencyId:
          access
            .user
            .agencyId,

        blob:
          audio,

        fileName:
          audio.name ||
          'secretaria.webm',
      });


    return NextResponse.json({
      ok:
        true,

      text,
    });
  }
  catch (
    error
  ) {
    console.error(
      'SECRETARY AUDIO ERROR',
      error
    );


    return NextResponse.json(
      {
        ok:
          false,

        message:
          error instanceof Error
            ? error.message
            : 'Erro ao processar o áudio.',
      },
      {
        status:
          500,
      }
    );
  }
}
