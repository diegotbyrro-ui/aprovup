import {
  spawn,
} from 'node:child_process';

import {
  mkdtemp,
  readFile,
  readdir,
  rm,
} from 'node:fs/promises';

import {
  tmpdir,
} from 'node:os';

import {
  join,
} from 'node:path';

import ffmpegPath from 'ffmpeg-static';

import {
  prisma,
} from '@/lib/prisma';

import {
  downloadMeetRecordingToFile,
} from '@/lib/googleMeet';

import {
  transcribeSecretaryAudio,
} from '@/lib/secretaryAudio';


/*
 * 30 minutos a 32 kbps mono produz aproximadamente
 * 7 MB por arquivo, muito abaixo do limite usado
 * pelo endpoint de transcrição.
 */
const AUDIO_CHUNK_SECONDS =
  30 *
  60;


const MAX_AUDIO_CHUNK_BYTES =
  19 *
  1024 *
  1024;


function executeFfmpeg(
  args:
    string[]
) {

  return new Promise<void>(
    (
      resolve,
      reject
    ) => {

      if (!ffmpegPath) {

        reject(
          new Error(
            'FFmpeg não está disponível no servidor.'
          )
        );

        return;
      }


      const child =
        spawn(
          ffmpegPath,
          args,
          {
            stdio: [
              'ignore',
              'ignore',
              'pipe',
            ],
          }
        );


      let errorOutput =
        '';


      child.stderr
        ?.setEncoding(
          'utf8'
        );


      child.stderr
        ?.on(
          'data',
          (
            chunk:
              string
          ) => {

            errorOutput +=
              chunk;


            if (
              errorOutput.length >
              12000
            ) {

              errorOutput =
                errorOutput.slice(
                  -12000
                );
            }
          }
        );


      child.on(
        'error',
        (
          error
        ) => {

          reject(
            error
          );
        }
      );


      child.on(
        'close',
        (
          code
        ) => {

          if (
            code ===
            0
          ) {

            resolve();

            return;
          }


          reject(
            new Error(
              'FFmpeg não conseguiu preparar o áudio da reunião.' +
              (
                errorOutput
                  ? ' ' +
                    errorOutput.trim()
                  : ''
              )
            )
          );
        }
      );
    }
  );
}


function chunkDate({
  base,
  chunkIndex,
}: {
  base:
    Date |
    null;

  chunkIndex:
    number;
}) {

  if (!base) {
    return null;
  }


  return new Date(
    base.getTime() +
    chunkIndex *
      AUDIO_CHUNK_SECONDS *
      1000
  );
}


function minDate(
  first:
    Date |
    null,

  second:
    Date |
    null
) {

  if (!first) {
    return second;
  }


  if (!second) {
    return first;
  }


  return first.getTime() <=
    second.getTime()
      ? first
      : second;
}


export async function transcribeMeetRecordingInChunks({
  agencyId,
  meetingId,
  fileId,
  recordingName,
  recordingStart,
  recordingEnd,
}: {
  agencyId:
    string;

  meetingId:
    string;

  fileId:
    string;

  recordingName:
    string;

  recordingStart:
    Date |
    null;

  recordingEnd:
    Date |
    null;
}) {

  const tempDirectory =
    await mkdtemp(
      join(
        tmpdir(),
        'aprovup-meet-'
      )
    );


  const inputPath =
    join(
      tempDirectory,
      'recording.mp4'
    );


  const outputPattern =
    join(
      tempDirectory,
      'audio-%03d.mp3'
    );


  try {

    console.log(
      '[LIV MEETING] Baixando gravação para processamento:',
      {
        meetingId,
        fileId,
      }
    );


    const recordingBytes =
      await downloadMeetRecordingToFile({
        agencyId,
        fileId,
        destinationPath:
          inputPath,
      });


    console.log(
      '[LIV MEETING] Gravação baixada:',
      {
        meetingId,
        bytes:
          recordingBytes,
      }
    );


    /*
     * Extraímos apenas a voz.
     *
     * - sem vídeo;
     * - mono;
     * - 16 kHz;
     * - MP3 32 kbps;
     * - segmentos de 30 minutos.
     */
    await executeFfmpeg([
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',

      '-i',
      inputPath,

      '-vn',

      '-ac',
      '1',

      '-ar',
      '16000',

      '-c:a',
      'libmp3lame',

      '-b:a',
      '32k',

      '-f',
      'segment',

      '-segment_time',
      String(
        AUDIO_CHUNK_SECONDS
      ),

      '-reset_timestamps',
      '1',

      outputPattern,
    ]);


    const chunkFiles =
      (
        await readdir(
          tempDirectory
        )
      )
        .filter(
          (
            fileName
          ) =>
            /^audio-\d{3}\.mp3$/i
              .test(
                fileName
              )
        )
        .sort();


    if (
      chunkFiles.length ===
      0
    ) {

      throw new Error(
        'A gravação foi baixada, mas nenhum áudio foi extraído.'
      );
    }


    console.log(
      '[LIV MEETING] Áudio preparado:',
      {
        meetingId,
        chunks:
          chunkFiles.length,
      }
    );


    const providerPrefix =
      recordingName +
      '/liv-audio-chunk-';


    /*
     * Caso uma execução anterior tenha sido interrompida,
     * reaproveitamos partes já transcritas.
     */
    const existingEntries =
      await prisma
        .secretaryMeetingTranscriptEntry
        .findMany({
          where: {
            meetingId,

            providerEntryName: {
              startsWith:
                providerPrefix,
            },
          },

          select: {
            providerEntryName:
              true,

            text:
              true,
          },
        });


    const existingByName =
      new Map(
        existingEntries.map(
          (
            entry
          ) => [
            entry.providerEntryName,
            entry.text,
          ]
        )
      );


    const transcripts:
      string[] =
      [];


    for (
      let index = 0;
      index <
      chunkFiles.length;
      index += 1
    ) {

      const chunkNumber =
        index +
        1;


      const providerEntryName =
        providerPrefix +
        String(
          chunkNumber
        ).padStart(
          3,
          '0'
        );


      const existingText =
        String(
          existingByName.get(
            providerEntryName
          ) ||
          ''
        ).trim();


      let text =
        existingText;


      if (text) {

        console.log(
          '[LIV MEETING] Parte já transcrita, reutilizando:',
          {
            meetingId,
            part:
              chunkNumber,
            total:
              chunkFiles.length,
          }
        );

      }
      else {

        const chunkPath =
          join(
            tempDirectory,
            chunkFiles[index]
          );


        const buffer =
          await readFile(
            chunkPath
          );


        if (
          buffer.byteLength >
          MAX_AUDIO_CHUNK_BYTES
        ) {

          throw new Error(
            'Uma parte do áudio ultrapassou o limite seguro de transcrição. ' +
            'Parte ' +
            String(
              chunkNumber
            ) +
            ': ' +
            (
              buffer.byteLength /
              1024 /
              1024
            ).toFixed(
              1
            ) +
            ' MB.'
          );
        }


        console.log(
          '[LIV MEETING] Transcrevendo parte:',
          {
            meetingId,
            part:
              chunkNumber,
            total:
              chunkFiles.length,
            bytes:
              buffer.byteLength,
          }
        );


        const blob =
          new Blob(
            [
              new Uint8Array(
                buffer
              ),
            ],
            {
              type:
                'audio/mpeg',
            }
          );


        text =
          await transcribeSecretaryAudio({
            agencyId,

            blob,

            fileName:
              'meet-part-' +
              String(
                chunkNumber
              ) +
              '.mp3',
          });


        const startTime =
          chunkDate({
            base:
              recordingStart,

            chunkIndex:
              index,
          });


        const expectedEnd =
          chunkDate({
            base:
              recordingStart,

            chunkIndex:
              index +
              1,
          });


        const endTime =
          minDate(
            expectedEnd,
            recordingEnd
          );


        /*
         * Salvamos cada parte imediatamente.
         * Se o cron for interrompido, a próxima
         * execução reaproveita o que já foi feito.
         */
        await prisma
          .secretaryMeetingTranscriptEntry
          .upsert({
            where: {
              providerEntryName,
            },

            create: {
              meetingId,

              providerEntryName,

              participantResource:
                null,

              speakerName:
                'Gravação · parte ' +
                String(
                  chunkNumber
                ) +
                '/' +
                String(
                  chunkFiles.length
                ),

              text,

              languageCode:
                'pt',

              startTime,

              endTime,
            },

            update: {
              meetingId,

              speakerName:
                'Gravação · parte ' +
                String(
                  chunkNumber
                ) +
                '/' +
                String(
                  chunkFiles.length
                ),

              text,

              languageCode:
                'pt',

              startTime,

              endTime,
            },
          });


        console.log(
          '[LIV MEETING] Parte transcrita:',
          {
            meetingId,
            part:
              chunkNumber,
            total:
              chunkFiles.length,
          }
        );
      }


      transcripts.push(
        '[Parte ' +
        String(
          chunkNumber
        ) +
        '/' +
        String(
          chunkFiles.length
        ) +
        ']\n' +
        text
      );
    }


    return {
      rawTranscript:
        transcripts.join(
          '\n\n'
        ),

      chunkCount:
        chunkFiles.length,

      recordingBytes,
    };

  }
  finally {

    await rm(
      tempDirectory,
      {
        recursive:
          true,

        force:
          true,
      }
    )
      .catch(
        () =>
          null
      );
  }
}