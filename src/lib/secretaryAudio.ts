import {
  getOpenAiConfigForAgency,
} from '@/lib/aiProviderCredentials';


export async function transcribeSecretaryAudio({
  agencyId,
  blob,
  fileName,
}: {
  agencyId:
    string;

  blob:
    Blob;

  fileName?:
    string;
}) {
  if (
    blob.size ===
    0
  ) {
    throw new Error(
      'Áudio vazio.'
    );
  }


  if (
    blob.size >
    20 *
      1024 *
      1024
  ) {
    throw new Error(
      'O áudio ultrapassa 20 MB.'
    );
  }


  const config =
    await getOpenAiConfigForAgency(
      agencyId
    );


  if (!config.apiKey) {
    throw new Error(
      'Configure a chave da OpenAI em Configurações > Integrações.'
    );
  }


  const data =
    new FormData();


  data.append(
    'file',
    blob,
    fileName ||
      'secretaria-audio'
  );


  data.append(
    'model',
    String(
      process.env
        .OPENAI_TRANSCRIBE_MODEL ||
      'gpt-4o-mini-transcribe'
    )
  );


  data.append(
    'language',
    'pt'
  );


  const response =
    await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method:
          'POST',

        headers: {
          Authorization:
            'Bearer ' +
            config.apiKey,
        },

        body:
          data,
      }
    );


  const payload =
    await response
      .json() as {
        text?:
          string;

        error?: {
          message?:
            string;
        };
      };


  if (
    !response.ok ||
    !payload.text
  ) {
    throw new Error(
      payload
        .error
        ?.message ||
      'Não foi possível transcrever o áudio.'
    );
  }


  return payload
    .text
    .trim();
}
