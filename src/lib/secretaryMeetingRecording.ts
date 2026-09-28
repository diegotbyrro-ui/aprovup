import {
  prisma,
} from '@/lib/prisma';

import {
  downloadMeetRecording,
  findConferenceRecordByMeetingCode,
  getGoogleMeetSpace,
  listMeetRecordings,
} from '@/lib/googleMeet';

import {
  transcribeSecretaryAudio,
} from '@/lib/secretaryAudio';

import {
  analyzeMeetingTranscript,
} from '@/lib/meetingAi';


const MAX_TRANSCRIPTION_FILE_SIZE =
  20 *
  1024 *
  1024;


const PROCESSABLE_STATUSES = [
  'READY',
  'WAITING_TRANSCRIPT',
  'WAITING_RECORDING',
  'RECORDING_ERROR',
  'TRANSCRIBED_RECORDING',
];


export type MeetingRecordingSyncResult = {
  meetingId:
    string;

  status:
    'PROCESSED' |
    'WAITING' |
    'SKIPPED' |
    'ERROR';

  message:
    string;
};


async function setWaiting({
  meetingId,
  message,
  conferenceRecordName,
  startedAt,
  endedAt,
}: {
  meetingId:
    string;

  message:
    string;

  conferenceRecordName?:
    string |
    null;

  startedAt?:
    Date |
    null;

  endedAt?:
    Date |
    null;
}) {

  await prisma
    .secretaryMeeting
    .update({
      where: {
        id:
          meetingId,
      },

      data: {
        status:
          'WAITING_RECORDING',

        conferenceRecordName:
          conferenceRecordName ||
          undefined,

        startedAt:
          startedAt ===
            undefined
            ? undefined
            : startedAt,

        endedAt:
          endedAt ===
            undefined
            ? undefined
            : endedAt,

        processingError:
          message,
      },
    });
}


export async function processSecretaryMeetingRecordingById({
  agencyId,
  meetingId,
}: {
  agencyId:
    string;

  meetingId:
    string;
}):
  Promise<MeetingRecordingSyncResult> {

  const meeting =
    await prisma
      .secretaryMeeting
      .findFirst({
        where: {
          id:
            meetingId,

          agencyId,
        },
      });


  if (!meeting) {

    return {
      meetingId,
      status:
        'SKIPPED',

      message:
        'Reunião não encontrada.',
    };
  }


  if (
    meeting.status ===
      'PROCESSED' ||
    meeting.processedAt
  ) {

    return {
      meetingId:
        meeting.id,

      status:
        'SKIPPED',

      message:
        'Reunião já processada.',
    };
  }


  if (
    !meeting.googleMeetCode
  ) {

    await prisma
      .secretaryMeeting
      .update({
        where: {
          id:
            meeting.id,
        },

        data: {
          status:
            'RECORDING_ERROR',

          processingError:
            'Esta reunião não possui código do Google Meet.',
        },
      });


    return {
      meetingId:
        meeting.id,

      status:
        'ERROR',

      message:
        'Código do Google Meet ausente.',
    };
  }


  try {

    /*
     * Se uma tentativa anterior já conseguiu
     * transcrever o vídeo, não baixamos nem
     * transcrevemos novamente. Seguimos direto
     * para a análise da Liv.
     */
    let rawTranscript =
      String(
        meeting.rawTranscript ||
        ''
      ).trim();


    let conferenceRecordName =
      meeting
        .conferenceRecordName ||
      null;


    let recordingName:
      string |
      null =
        null;


    let recordingUrl:
      string |
      null =
        null;


    let recordingStart:
      Date |
      null =
        meeting.startedAt;


    let recordingEnd:
      Date |
      null =
        meeting.endedAt;


    if (!rawTranscript) {

      const space =
        await getGoogleMeetSpace({
          agencyId,

          meetingCode:
            meeting.googleMeetCode,
        })
          .catch(
            () =>
              null
          );


      const conference =
        await findConferenceRecordByMeetingCode({
          agencyId,

          meetingCode:
            meeting.googleMeetCode,
        });


      if (
        !conference
          ?.name
      ) {

        await setWaiting({
          meetingId:
            meeting.id,

          message:
            'A reunião ainda não apareceu como conferência encerrada na API do Google Meet.',
        });


        return {
          meetingId:
            meeting.id,

          status:
            'WAITING',

          message:
            'Aguardando conferenceRecord.',
        };
      }


      conferenceRecordName =
        conference.name;


      recordingStart =
        conference.startTime
          ? new Date(
              conference.startTime
            )
          : null;


      recordingEnd =
        conference.endTime
          ? new Date(
              conference.endTime
            )
          : null;


      const recordings =
        await listMeetRecordings({
          agencyId,

          conferenceRecordName:
            conference.name,
        });


      const generated =
        recordings.find(
          (
            recording
          ) =>
            recording.state ===
              'FILE_GENERATED' &&
            Boolean(
              recording
                .driveDestination
                ?.file
            )
        );


      if (!generated) {

        const latest =
          recordings[
            recordings.length -
            1
          ];


        const state =
          latest
            ?.state ||
          'NAO_ENCONTRADA';


        const waitingMessage =
          state ===
            'STARTED'
            ? 'A gravação ainda está em andamento.'
            : state ===
                'ENDED'
              ? 'A gravação terminou e o Google ainda está gerando o arquivo MP4.'
              : 'A reunião foi encontrada, mas a gravação ainda não está disponível.';


        await setWaiting({
          meetingId:
            meeting.id,

          message:
            waitingMessage,

          conferenceRecordName:
            conference.name,

          startedAt:
            recordingStart,

          endedAt:
            recordingEnd,
        });


        return {
          meetingId:
            meeting.id,

          status:
            'WAITING',

          message:
            waitingMessage,
        };
      }


      recordingName =
        generated.name;


      recordingUrl =
        generated
          .driveDestination
          ?.exportUri ||
        null;


      if (
        generated.startTime
      ) {

        recordingStart =
          new Date(
            generated.startTime
          );
      }


      if (
        generated.endTime
      ) {

        recordingEnd =
          new Date(
            generated.endTime
          );
      }


      const driveFileId =
        generated
          .driveDestination
          ?.file ||
        '';


      if (!driveFileId) {

        throw new Error(
          'A gravação ficou pronta, mas o Google não retornou o fileId do Drive.'
        );
      }


      console.log(
        '[LIV MEETING] Baixando gravação:',
        {
          meetingId:
            meeting.id,

          recording:
            generated.name,

          driveFileId,
        }
      );


      const recordingBlob =
        await downloadMeetRecording({
          agencyId,

          fileId:
            driveFileId,
        });


      console.log(
        '[LIV MEETING] Gravação baixada:',
        {
          meetingId:
            meeting.id,

          bytes:
            recordingBlob.size,
        }
      );


      /*
       * A função de transcrição atual do AprovUp
       * trabalha com arquivos até 20 MB.
       *
       * Não insistimos em arquivos maiores para não
       * baixar/transcrever repetidamente a mesma reunião.
       * A etapa seguinte do projeto será fragmentação
       * automática para reuniões longas.
       */
      if (
        recordingBlob.size >
        MAX_TRANSCRIPTION_FILE_SIZE
      ) {

        const sizeMb =
          (
            recordingBlob.size /
            1024 /
            1024
          ).toFixed(
            1
          );


        await prisma
          .secretaryMeeting
          .update({
            where: {
              id:
                meeting.id,
            },

            data: {
              status:
                'RECORDING_TOO_LARGE',

              conferenceRecordName:
                conference.name,

              startedAt:
                recordingStart,

              endedAt:
                recordingEnd,

              transcriptName:
                generated.name,

              transcriptDocumentUrl:
                recordingUrl,

              processingError:
                'A gravação foi encontrada, mas possui ' +
                sizeMb +
                ' MB. A versão atual da transcrição automática aceita até 20 MB.',
            },
          });


        return {
          meetingId:
            meeting.id,

          status:
            'ERROR',

          message:
            'Gravação maior que 20 MB.',
        };
      }


      rawTranscript =
        await transcribeSecretaryAudio({
          agencyId,

          blob:
            recordingBlob,

          fileName:
            'google-meet-recording.mp4',
        });


      if (!rawTranscript) {

        throw new Error(
          'A OpenAI não retornou texto para a gravação.'
        );
      }


      /*
       * Primeiro salvamos a transcrição.
       * Se a etapa de resumo falhar, o próximo cron
       * reaproveita este texto sem pagar outra
       * transcrição.
       */
      await prisma
        .$transaction(
          async (
            tx
          ) => {

            await tx
              .secretaryMeetingTranscriptEntry
              .deleteMany({
                where: {
                  meetingId:
                    meeting.id,
                },
              });


            await tx
              .secretaryMeetingTranscriptEntry
              .create({
                data: {
                  meetingId:
                    meeting.id,

                  providerEntryName:
                    generated.name +
                    '/liv-transcription',

                  participantResource:
                    null,

                  speakerName:
                    'Transcrição da gravação',

                  text:
                    rawTranscript,

                  languageCode:
                    'pt',

                  startTime:
                    recordingStart,

                  endTime:
                    recordingEnd,
                },
              });


            await tx
              .secretaryMeeting
              .update({
                where: {
                  id:
                    meeting.id,
                },

                data: {
                  status:
                    'TRANSCRIBED_RECORDING',

                  googleMeetSpaceName:
                    space
                      ?.name ||
                    meeting
                      .googleMeetSpaceName,

                  conferenceRecordName:
                    conference.name,

                  transcriptName:
                    generated.name,

                  transcriptDocumentUrl:
                    recordingUrl,

                  startedAt:
                    recordingStart,

                  endedAt:
                    recordingEnd,

                  rawTranscript,

                  processingError:
                    null,
                },
              });
          }
        );


      console.log(
        '[LIV MEETING] Gravação transcrita:',
        meeting.id
      );
    }


    /*
     * A Liv transforma a transcrição em informação
     * operacional.
     */
    const analysis =
      await analyzeMeetingTranscript({
        agencyId,

        meetingTitle:
          meeting.title,

        transcript:
          rawTranscript,
      });


    await prisma
      .$transaction(
        async (
          tx
        ) => {

          await tx
            .secretaryMeetingAction
            .deleteMany({
              where: {
                meetingId:
                  meeting.id,
              },
            });


          for (
            const action
            of analysis.actions
          ) {

            await tx
              .secretaryMeetingAction
              .create({
                data: {
                  meetingId:
                    meeting.id,

                  type:
                    action.action_type,

                  status:
                    'PROPOSED',

                  title:
                    action.title,

                  description:
                    action.details ||
                    null,

                  responsible:
                    action.responsible ||
                    null,

                  dueDateText:
                    action.due_date_text ||
                    null,

                  payload: {
                    source:
                      'MEETING_RECORDING_AI',
                  },
                },
              });
          }


          await tx
            .secretaryMeeting
            .update({
              where: {
                id:
                  meeting.id,
              },

              data: {
                status:
                  'PROCESSED',

                summary:
                  analysis.summary,

                decisions:
                  analysis.decisions,

                pendingItems:
                  analysis.pending_items,

                ideas:
                  analysis.ideas,

                actionPlan:
                  analysis.actions,

                processingError:
                  null,

                processedAt:
                  new Date(),
              },
            });
        }
      );


    await prisma
      .historyLog
      .create({
        data: {
          entityType:
            'SECRETARY_MEETING',

          entityId:
            meeting.id,

          action:
            'MEETING_RECORDING_PROCESSED',

          description:
            'Liv transcreveu a gravação e processou a reunião "' +
            meeting.title +
            '".',

          authorName:
            'Liv',
        },
      })
      .catch(
        () =>
          null
      );


    console.log(
      '[LIV MEETING] Resumo concluído:',
      meeting.id
    );


    return {
      meetingId:
        meeting.id,

      status:
        'PROCESSED',

      message:
        'Gravação transcrita e reunião processada pela Liv.',
    };

  }
  catch (
    error
  ) {

    const message =
      error instanceof Error
        ? error.message
        : 'Erro ao processar a gravação da reunião.';


    await prisma
      .secretaryMeeting
      .update({
        where: {
          id:
            meeting.id,
        },

        data: {
          status:
            'RECORDING_ERROR',

          processingError:
            message.slice(
              0,
              2000
            ),
        },
      })
      .catch(
        () =>
          null
      );


    console.error(
      '[LIV MEETING] Erro ao processar gravação:',
      meeting.id,
      error
    );


    return {
      meetingId:
        meeting.id,

      status:
        'ERROR',

      message,
    };
  }
}


export async function processSecretaryMeetingRecordings(
  limit =
    1
) {

  /*
   * Se uma execução anterior caiu durante o processamento,
   * libera locks antigos após 15 minutos.
   */
  const staleBefore =
    new Date(
      Date.now() -
      15 *
        60 *
        1000
    );


  await prisma
    .secretaryMeeting
    .updateMany({
      where: {
        status:
          'PROCESSING_RECORDING',

        processedAt:
          null,

        updatedAt: {
          lt:
            staleBefore,
        },
      },

      data: {
        status:
          'RECORDING_ERROR',

        processingError:
          'Processamento anterior interrompido. A Liv tentará novamente.',
      },
    });


  /*
   * Não varremos toda a história da agência ao ligar
   * o recurso pela primeira vez.
   */
  const since =
    new Date(
      Date.now() -
      7 *
        24 *
        60 *
        60 *
        1000
    );


  /*
   * Evita consultar reuniões que acabaram de ser criadas.
   * Normalmente o Google precisa de alguns minutos para
   * disponibilizar o arquivo.
   */
  const retryBefore =
    new Date(
      Date.now() -
      2 *
        60 *
        1000
    );


  const meetings =
    await prisma
      .secretaryMeeting
      .findMany({
        where: {
          processedAt:
            null,

          googleMeetCode: {
            not:
              null,
          },

          createdAt: {
            gte:
              since,
          },

          updatedAt: {
            lte:
              retryBefore,
          },

          status: {
            in:
              PROCESSABLE_STATUSES,
          },
        },

        orderBy: {
          updatedAt:
            'asc',
        },

        take:
          Math.max(
            1,
            Math.min(
              limit,
              3
            )
          ),
      });


  const results:
    MeetingRecordingSyncResult[] =
      [];


  for (
    const meeting
    of meetings
  ) {

    const claimed =
      await prisma
        .secretaryMeeting
        .updateMany({
          where: {
            id:
              meeting.id,

            processedAt:
              null,

            status:
              meeting.status,
          },

          data: {
            status:
              'PROCESSING_RECORDING',

            processingError:
              null,
          },
        });


    if (
      claimed.count !==
      1
    ) {
      continue;
    }


    const result =
      await processSecretaryMeetingRecordingById({
        agencyId:
          meeting.agencyId,

        meetingId:
          meeting.id,
      });


    results.push(
      result
    );
  }


  return {
    checked:
      meetings.length,

    processed:
      results.filter(
        (
          item
        ) =>
          item.status ===
          'PROCESSED'
      ).length,

    waiting:
      results.filter(
        (
          item
        ) =>
          item.status ===
          'WAITING'
      ).length,

    errors:
      results.filter(
        (
          item
        ) =>
          item.status ===
          'ERROR'
      ).length,

    results,
  };
}