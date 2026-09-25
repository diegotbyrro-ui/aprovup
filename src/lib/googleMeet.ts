import {
  getGoogleCalendarAccessTokenForAgency,
} from '@/lib/googleCalendar';


type MeetConferenceRecord = {
  name?:
    string;

  startTime?:
    string;

  endTime?:
    string;

  space?: {
    name?:
      string;

    meetingCode?:
      string;
  };
};


export type MeetTranscript = {
  name:
    string;

  state:
    string;

  startTime:
    string | null;

  endTime:
    string | null;

  docsDestination:
    {
      document?:
        string;

      exportUri?:
        string;
    } |
    null;
};


export type MeetTranscriptEntry = {
  name:
    string;

  participant:
    string;

  text:
    string;

  languageCode:
    string;

  startTime:
    string | null;

  endTime:
    string | null;
};


async function meetFetch<T>({
  agencyId,
  url,
}: {
  agencyId:
    string;

  url:
    string;
}):
  Promise<T> {

  const auth =
    await getGoogleCalendarAccessTokenForAgency(
      agencyId
    );


  if (
    !auth
  ) {

    throw new Error(
      'Google não está conectado para esta agência.'
    );
  }


  const response =
    await fetch(
      url,
      {
        headers: {
          Authorization:
            'Bearer ' +
            auth.accessToken,
        },

        cache:
          'no-store',
      }
    );


  const payload =
    await response
      .json() as
        T & {
          error?: {
            message?:
              string;
          };
        };


  if (
    !response.ok
  ) {

    throw new Error(
      payload.error
        ?.message ||
      'Google Meet API retornou erro ' +
      String(
        response.status
      )
    );
  }


  return payload;
}


export function extractGoogleMeetCode(
  value:
    string |
    null |
    undefined
) {

  const text =
    String(
      value ||
      ''
    )
      .trim();


  if (!text) {
    return '';
  }


  const match =
    text.match(
      /meet\.google\.com\/([a-z0-9-]+)/i
    );


  return match
    ? match[1]
        .toLowerCase()
    : text
        .replace(
          /^spaces\//,
          ''
        )
        .trim()
        .toLowerCase();
}


export async function getGoogleMeetSpace({
  agencyId,
  meetingCode,
}: {
  agencyId:
    string;

  meetingCode:
    string;
}) {

  const code =
    extractGoogleMeetCode(
      meetingCode
    );


  if (!code) {

    throw new Error(
      'Código do Google Meet ausente.'
    );
  }


  return meetFetch<{
    name?:
      string;

    meetingUri?:
      string;

    meetingCode?:
      string;

    activeConference?: {
      conferenceRecord?:
        string;
    };
  }>({
    agencyId,

    url:
      'https://meet.googleapis.com/v2/spaces/' +
      encodeURIComponent(
        code
      ),
  });
}


export async function findConferenceRecordByMeetingCode({
  agencyId,
  meetingCode,
}: {
  agencyId:
    string;

  meetingCode:
    string;
}) {

  const code =
    extractGoogleMeetCode(
      meetingCode
    );


  if (!code) {
    return null;
  }


  const params =
    new URLSearchParams({
      pageSize:
        '10',

      filter:
        'space.meeting_code = "' +
        code +
        '"',
    });


  const payload =
    await meetFetch<{
      conferenceRecords?:
        MeetConferenceRecord[];
    }>({
      agencyId,

      url:
        'https://meet.googleapis.com/v2/conferenceRecords?' +
        params.toString(),
    });


  return payload
    .conferenceRecords
    ?.[0] ||
    null;
}


export async function listMeetTranscripts({
  agencyId,
  conferenceRecordName,
}: {
  agencyId:
    string;

  conferenceRecordName:
    string;
}) {

  const payload =
    await meetFetch<{
      transcripts?:
        Array<{
          name?:
            string;

          state?:
            string;

          startTime?:
            string;

          endTime?:
            string;

          docsDestination?: {
            document?:
              string;

            exportUri?:
              string;
          };
        }>;
    }>({
      agencyId,

      url:
        'https://meet.googleapis.com/v2/' +
        conferenceRecordName +
        '/transcripts?pageSize=100',
    });


  return (
    payload.transcripts ||
    []
  )
    .filter(
      (
        transcript
      ) =>
        Boolean(
          transcript.name
        )
    )
    .map(
      (
        transcript
      ): MeetTranscript => ({
        name:
          transcript.name ||
          '',

        state:
          transcript.state ||
          '',

        startTime:
          transcript.startTime ||
          null,

        endTime:
          transcript.endTime ||
          null,

        docsDestination:
          transcript
            .docsDestination ||
          null,
      })
    );
}


export async function listMeetTranscriptEntries({
  agencyId,
  transcriptName,
}: {
  agencyId:
    string;

  transcriptName:
    string;
}) {

  const all:
    MeetTranscriptEntry[] =
      [];


  let pageToken =
    '';


  do {

    const params =
      new URLSearchParams({
        pageSize:
          '100',
      });


    if (
      pageToken
    ) {

      params.set(
        'pageToken',
        pageToken
      );
    }


    const payload =
      await meetFetch<{
        transcriptEntries?:
          Array<{
            name?:
              string;

            participant?:
              string;

            text?:
              string;

            languageCode?:
              string;

            startTime?:
              string;

            endTime?:
              string;
          }>;

        nextPageToken?:
          string;
      }>({
        agencyId,

        url:
          'https://meet.googleapis.com/v2/' +
          transcriptName +
          '/entries?' +
          params.toString(),
      });


    for (
      const entry
      of payload
        .transcriptEntries ||
      []
    ) {

      if (
        !entry.name ||
        !entry.text
      ) {
        continue;
      }


      all.push({
        name:
          entry.name,

        participant:
          entry.participant ||
          '',

        text:
          entry.text,

        languageCode:
          entry.languageCode ||
          '',

        startTime:
          entry.startTime ||
          null,

        endTime:
          entry.endTime ||
          null,
      });
    }


    pageToken =
      payload.nextPageToken ||
      '';

  }
  while (
    pageToken
  );


  return all;
}


export async function getMeetParticipantDisplayName({
  agencyId,
  participantResource,
}: {
  agencyId:
    string;

  participantResource:
    string;
}) {

  if (
    !participantResource
  ) {
    return '';
  }


  const participant =
    await meetFetch<{
      signedinUser?: {
        displayName?:
          string;

        user?:
          string;
      };

      anonymousUser?: {
        displayName?:
          string;
      };

      phoneUser?: {
        displayName?:
          string;
      };
    }>({
      agencyId,

      url:
        'https://meet.googleapis.com/v2/' +
        participantResource,
    });


  return (
    participant
      .signedinUser
      ?.displayName ||
    participant
      .anonymousUser
      ?.displayName ||
    participant
      .phoneUser
      ?.displayName ||
    'Participante'
  );
}
