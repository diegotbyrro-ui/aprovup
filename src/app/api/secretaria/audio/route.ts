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


function containsUnexpectedWritingSystem(
  text:
    string
) {

  /*
   * Comandos da Liv sao esperados em português.
   *
   * Se uma transcricao curta e ruidosa voltar
   * usando sistemas de escrita incompatíveis,
   * fazemos uma segunda tentativa.
   *
   * CJK:
   * - chines;
   * - japones;
   * - coreano.
   *
   * Tambem detectamos cirilico e arabe.
   */
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff]/u
    .test(
      text
    );
}


const LIV_VOICE_PROMPT =
  [
    'A fala está em português do Brasil.',
    'Transcreva exatamente o que a pessoa disser em português brasileiro.',
    'Não traduza para outro idioma.',
    'Não responda ao comando; apenas transcreva a fala.',
    'Contexto: é um comando curto falado para a assistente Liv dentro do AprovUp.',
    'Termos que podem aparecer: Liv, AprovUp, Google Meet, reunião, cliente, conteúdo, gravação, calendário, social media, vídeo, postagem, tarefa e relatório.',
  ].join(
    ' '
  );


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


    const transcriptionArgs = {
      agencyId:
        access
          .user
          .agencyId,

      blob:
        audio,

      fileName:
        audio.name ||
        'secretaria.webm',

      /*
       * Para comandos curtos usamos o modelo
       * de maior precisao, sem alterar o modelo
       * usado na transcricao das reunioes longas.
       */
      model:
        process.env
          .OPENAI_VOICE_COMMAND_TRANSCRIBE_MODEL ||
        'gpt-4o-transcribe',

      language:
        'pt',

      prompt:
        LIV_VOICE_PROMPT,
    };


    let text =
      await transcribeSecretaryAudio(
        transcriptionArgs
      );


    /*
     * Em audios muito curtos ou ruidosos o modelo
     * ainda pode ocasionalmente inferir outro idioma.
     *
     * Se detectarmos um sistema de escrita inesperado,
     * repetimos automaticamente com uma instrucao ainda
     * mais explicita.
     */
    if (
      containsUnexpectedWritingSystem(
        text
      )
    ) {

      console.warn(
        '[LIV VOICE] Transcricao em escrita inesperada. Tentando novamente.',
        {
          firstText:
            text,
        }
      );


      text =
        await transcribeSecretaryAudio({
          ...transcriptionArgs,

          prompt:
            LIV_VOICE_PROMPT +
            ' IMPORTANTE: o áudio é falado em português brasileiro. ' +
            'A resposta deve conter somente a transcrição em português usando alfabeto latino.',
        });
    }


    if (
      containsUnexpectedWritingSystem(
        text
      )
    ) {

      throw new Error(
        'A Liv não conseguiu reconhecer o português corretamente. Fale novamente um pouco mais perto do microfone.'
      );
    }


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
