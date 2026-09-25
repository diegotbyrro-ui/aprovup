'use server';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  createGoogleCalendarEvent,
} from '@/lib/googleCalendar';

import {
  extractGoogleMeetCode,
  findConferenceRecordByMeetingCode,
  getMeetParticipantDisplayName,
  getGoogleMeetSpace,
  listMeetTranscriptEntries,
  listMeetTranscripts,
} from '@/lib/googleMeet';

import {
  analyzeMeetingTranscript,
} from '@/lib/meetingAi';

import {
  revalidatePath,
} from 'next/cache';

import {
  redirect,
} from 'next/navigation';


function parseMaceioDateTime(
  value:
    string
) {

  const text =
    String(
      value ||
      ''
    ).trim();


  if (
    !text
  ) {

    return null;
  }


  const normalized =
    text.length ===
      16
      ? text +
        ':00'
      : text;


  const date =
    new Date(
      normalized +
      '-03:00'
    );


  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function attendeeList(
  value:
    string
) {

  return Array.from(
    new Set(
      value
        .split(
          /[\n,;]+/
        )
        .map(
          (
            item
          ) =>
            item
              .trim()
              .toLowerCase()
        )
        .filter(
          (
            item
          ) =>
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
              item
            )
        )
    )
  );
}


function meetUriFromCalendar(
  event:
    Awaited<
      ReturnType<
        typeof createGoogleCalendarEvent
      >
    >
) {

  return (
    event
      ?.hangoutLink ||
    event
      ?.conferenceData
      ?.entryPoints
      ?.find(
        (
          entry
        ) =>
          entry.entryPointType ===
          'video'
      )
      ?.uri ||
    ''
  );
}


export async function createSecretaryMeetingAction(
  formData:
    FormData
) {

  const user =
    await requirePermission(
      'settings.manage'
    );


  const title =
    String(
      formData.get(
        'title'
      ) ||
      ''
    ).trim();


  const clientId =
    String(
      formData.get(
        'clientId'
      ) ||
      ''
    ).trim();


  const start =
    parseMaceioDateTime(
      String(
        formData.get(
          'start'
        ) ||
        ''
      )
    );


  const end =
    parseMaceioDateTime(
      String(
        formData.get(
          'end'
        ) ||
        ''
      )
    );


  const notes =
    String(
      formData.get(
        'notes'
      ) ||
      ''
    ).trim();


  const attendees =
    attendeeList(
      String(
        formData.get(
          'attendees'
        ) ||
        ''
      )
    );


  if (
    !title ||
    !start ||
    !end ||
    end <=
      start
  ) {

    redirect(
      '/secretaria/reunioes?error=invalid'
    );
  }


  let validClientId:
    string |
    null =
      null;


  if (
    clientId
  ) {

    const client =
      await prisma.client
        .findFirst({
          where: {
            id:
              clientId,

            agencyId:
              user.agencyId,
          },

          select: {
            id:
              true,
          },
        });


    validClientId =
      client
        ?.id ||
      null;
  }


  const calendarEvent =
    await createGoogleCalendarEvent({
      agencyId:
        user.agencyId,

      title,

      description:
        notes,

      startDate:
        start,

      endDate:
        end,

      attendees,

      createMeet:
        true,
    });


  if (
    !calendarEvent
      ?.id
  ) {

    redirect(
      '/secretaria/reunioes?error=calendar'
    );
  }


  const googleMeetUri =
    meetUriFromCalendar(
      calendarEvent
    );


  const meeting =
    await prisma
      .secretaryMeeting
      .create({
        data: {
          agencyId:
            user.agencyId,

          clientId:
            validClientId,

          title,

          status:
            'SCHEDULED',

          calendarEventId:
            calendarEvent.id,

          calendarHtmlLink:
            calendarEvent
              .htmlLink ||
            null,

          googleMeetUri:
            googleMeetUri ||
            null,

          googleMeetCode:
            extractGoogleMeetCode(
              googleMeetUri
            ) ||
            null,

          scheduledStart:
            start,

          scheduledEnd:
            end,

          attendeeEmails:
            attendees,

          notes:
            notes ||
            null,

          createdByUserId:
            user.id,

          createdByName:
            user.name ||
            user.email ||
            'Equipe AprovUp',
        },
      });


  await prisma.historyLog
    .create({
      data: {
        entityType:
          'SECRETARY_MEETING',

        entityId:
          meeting.id,

        action:
          'MEETING_CREATED',

        description:
          'Reunião criada pela Liv/AprovUp: ' +
          title +
          '.',

        authorName:
          user.name ||
          user.email ||
          'Equipe AprovUp',
      },
    })
    .catch(
      () =>
        null
    );


  redirect(
    '/secretaria/reunioes/' +
    meeting.id
  );
}


export async function syncSecretaryMeetingAction(
  meetingId:
    string
) {

  const user =
    await requirePermission(
      'settings.manage'
    );


  const meeting =
    await prisma
      .secretaryMeeting
      .findFirst({
        where: {
          id:
            meetingId,

          agencyId:
            user.agencyId,
        },
      });


  if (
    !meeting
  ) {

    return;
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
          processingError:
            'Esta reunião ainda não possui código do Google Meet.',
        },
      });


    revalidatePath(
      '/secretaria/reunioes/' +
      meeting.id
    );

    return;
  }


  try {

    /*
     * Primeiro atualizamos os dados do espaco.
     */
    const space =
      await getGoogleMeetSpace({
        agencyId:
          user.agencyId,

        meetingCode:
          meeting.googleMeetCode,
      });


    /*
     * Depois procuramos a conferencia que realmente aconteceu.
     * O Google permite filtrar conferenceRecords pelo meeting_code.
     */
    const conference =
      await findConferenceRecordByMeetingCode({
        agencyId:
          user.agencyId,

        meetingCode:
          meeting.googleMeetCode,
      });


    if (
      !conference
        ?.name
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
              'WAITING_TRANSCRIPT',

            googleMeetSpaceName:
              space.name ||
              meeting
                .googleMeetSpaceName,

            processingError:
              'A conferência ainda não apareceu na API do Google Meet.',
          },
        });


      revalidatePath(
        '/secretaria/reunioes/' +
        meeting.id
      );

      return;
    }


    const transcripts =
      await listMeetTranscripts({
        agencyId:
          user.agencyId,

        conferenceRecordName:
          conference.name,
      });


    const transcript =
      transcripts.find(
        (
          item
        ) =>
          item.state ===
          'FILE_GENERATED'
      ) ||
      transcripts[0];


    if (
      !transcript
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
              'WAITING_TRANSCRIPT',

            googleMeetSpaceName:
              space.name ||
              null,

            conferenceRecordName:
              conference.name,

            startedAt:
              conference.startTime
                ? new Date(
                    conference.startTime
                  )
                : null,

            endedAt:
              conference.endTime
                ? new Date(
                    conference.endTime
                  )
                : null,

            processingError:
              'A reunião foi encontrada, mas a transcrição ainda não está disponível.',
          },
        });


      revalidatePath(
        '/secretaria/reunioes/' +
        meeting.id
      );

      return;
    }


    const entries =
      await listMeetTranscriptEntries({
        agencyId:
          user.agencyId,

        transcriptName:
          transcript.name,
      });


    if (
      entries.length ===
      0
    ) {

      throw new Error(
        'A transcrição existe, mas ainda não possui falas disponíveis.'
      );
    }


    const participantResources =
      Array.from(
        new Set(
          entries
            .map(
              (
                entry
              ) =>
                entry.participant
            )
            .filter(
              Boolean
            )
        )
      );


    const participantNames =
      new Map<
        string,
        string
      >();


    for (
      const participantResource
      of participantResources
    ) {

      const name =
        await getMeetParticipantDisplayName({
          agencyId:
            user.agencyId,

          participantResource,
        })
          .catch(
            () =>
              'Participante'
          );


      participantNames.set(
        participantResource,
        name
      );
    }


    const transcriptLines =
      entries.map(
        (
          entry
        ) => {

          const speaker =
            participantNames.get(
              entry.participant
            ) ||
            'Participante';


          return (
            speaker +
            ': ' +
            entry.text
          );
        }
      );


    const rawTranscript =
      transcriptLines.join(
        '\n'
      );


    await prisma.$transaction(
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


        for (
          const entry
          of entries
        ) {

          await tx
            .secretaryMeetingTranscriptEntry
            .create({
              data: {
                meetingId:
                  meeting.id,

                providerEntryName:
                  entry.name,

                participantResource:
                  entry.participant ||
                  null,

                speakerName:
                  participantNames.get(
                    entry.participant
                  ) ||
                  'Participante',

                text:
                  entry.text,

                languageCode:
                  entry.languageCode ||
                  null,

                startTime:
                  entry.startTime
                    ? new Date(
                        entry.startTime
                      )
                    : null,

                endTime:
                  entry.endTime
                    ? new Date(
                        entry.endTime
                      )
                    : null,
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
                'TRANSCRIBED',

              googleMeetSpaceName:
                space.name ||
                null,

              conferenceRecordName:
                conference.name,

              transcriptName:
                transcript.name,

              transcriptDocumentUrl:
                transcript
                  .docsDestination
                  ?.exportUri ||
                null,

              startedAt:
                conference.startTime
                  ? new Date(
                      conference.startTime
                    )
                  : null,

              endedAt:
                conference.endTime
                  ? new Date(
                      conference.endTime
                    )
                  : null,

              rawTranscript,

              participants:
                Array.from(
                  participantNames.values()
                ),

              processingError:
                null,
            },
          });
      }
    );


    /*
     * Agora a Liv analisa a conversa.
     */
    const analysis =
      await analyzeMeetingTranscript({
        agencyId:
          user.agencyId,

        meetingTitle:
          meeting.title,

        transcript:
          rawTranscript,
      });


    await prisma.$transaction(
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
                    'MEETING_AI',
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


    await prisma.historyLog
      .create({
        data: {
          entityType:
            'SECRETARY_MEETING',

          entityId:
            meeting.id,

          action:
            'MEETING_TRANSCRIPT_PROCESSED',

          description:
            'Liv processou a transcrição e gerou o resumo da reunião "' +
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

  }
  catch (
    error
  ) {

    await prisma
      .secretaryMeeting
      .update({
        where: {
          id:
            meeting.id,
        },

        data: {
          processingError:
            error instanceof Error
              ? error.message
              : 'Erro ao processar a reunião.',
        },
      });
  }


  revalidatePath(
    '/secretaria/reunioes'
  );

  revalidatePath(
    '/secretaria/reunioes/' +
    meeting.id
  );
}
