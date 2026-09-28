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


type CreateMeetSpaceResponse = {
  name?:
    string;

  meetingUri?:
    string;

  meetingCode?:
    string;

  error?: {
    message?:
      string;
  };
};


async function requestGoogleMeetSpace({
  accessToken,
  autoTranscription,
}: {
  accessToken:
    string;

  autoTranscription:
    boolean;
}) {

  const config:
    Record<
      string,
      unknown
    > = {
      accessType:
        'OPEN',

      entryPointAccess:
        'ALL',
    };


  if (
    autoTranscription
  ) {

    config.artifactConfig = {
      transcriptionConfig: {
        autoTranscriptionGeneration:
          'ON',
      },
    };
  }


  const response =
    await fetch(
      'https://meet.googleapis.com/v2/spaces',
      {
        method:
          'POST',

        headers: {
          Authorization:
            'Bearer ' +
            accessToken,

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            config,
          }),

        cache:
          'no-store',
      }
    );


  const payload =
    await response
      .json() as
        CreateMeetSpaceResponse;


  return {
    response,
    payload,
  };
}


function googleMeetCreationError(
  payload:
    CreateMeetSpaceResponse,

  status:
    number
) {

  return (
    payload.error
      ?.message ||
    'Google Meet recusou a criação da reunião. HTTP ' +
    String(
      status
    )
  );
}


function autoTranscriptionUnavailable(
  message:
    string
) {

  const normalized =
    message
      .trim()
      .toLowerCase();


  return (
    normalized.includes(
      'updateautotranscriptiongeneration is not available'
    ) ||
    (
      normalized.includes(
        'autotranscription'
      ) &&
      normalized.includes(
        'not available to the user'
      )
    )
  );
}


export async function createGoogleMeetSpace({
  agencyId,
}: {
  agencyId:
    string;
}) {

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


  /*
   * Primeira tentativa:
   * cria o Meet já com transcrição automática.
   */
  const automatic =
    await requestGoogleMeetSpace({
      accessToken:
        auth.accessToken,

      autoTranscription:
        true,
    });


  let payload =
    automatic.payload;


  let autoTranscriptionEnabled =
    true;


  let transcriptionWarning:
    string |
    null =
      null;


  if (
    !automatic.response.ok
  ) {

    const automaticError =
      googleMeetCreationError(
        automatic.payload,
        automatic.response.status
      );


    /*
     * Algumas contas Google não possuem licença/permissão
     * para autoTranscriptionGeneration.
     *
     * Nesse caso a Liv NÃO bloqueia a reunião.
     * Ela tenta novamente criando um Meet normal.
     */
    if (
      autoTranscriptionUnavailable(
        automaticError
      )
    ) {

      console.warn(
        '[GOOGLE MEET] Transcrição automática indisponível. Criando reunião sem auto-transcrição:',
        automaticError
      );


      const fallback =
        await requestGoogleMeetSpace({
          accessToken:
            auth.accessToken,

          autoTranscription:
            false,
        });


      if (
        !fallback.response.ok
      ) {

        throw new Error(
          googleMeetCreationError(
            fallback.payload,
            fallback.response.status
          )
        );
      }


      payload =
        fallback.payload;


      autoTranscriptionEnabled =
        false;


      transcriptionWarning =
        'A conta Google conectada não oferece transcrição automática. ' +
        'O Meet foi criado normalmente. ' +
        'Se essa conta possuir transcrição manual, ela pode ser iniciada dentro da reunião.';
    }
    else {

      /*
       * Erros reais de OAuth, API, configuração etc.
       * continuam sendo exibidos em vez de serem escondidos.
       */
      throw new Error(
        automaticError
      );
    }
  }


  if (
    !payload.name ||
    !payload.meetingUri
  ) {

    throw new Error(
      'Google Meet criou o espaço sem retornar um link de reunião.'
    );
  }


  return {
    name:
      payload.name,

    meetingUri:
      payload.meetingUri,

    meetingCode:
      payload.meetingCode ||
      extractGoogleMeetCode(
        payload.meetingUri
      ),

    autoTranscriptionEnabled,

    transcriptionWarning,
  };
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
