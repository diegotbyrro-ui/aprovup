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
  autoRecording,
  autoTranscription,
}: {
  accessToken:
    string;

  autoRecording:
    boolean;

  autoTranscription:
    boolean;
}) {

  const artifactConfig:
    Record<
      string,
      unknown
    > = {};


  if (
    autoRecording
  ) {

    artifactConfig.recordingConfig = {
      autoRecordingGeneration:
        'ON',
    };
  }


  if (
    autoTranscription
  ) {

    artifactConfig.transcriptionConfig = {
      autoTranscriptionGeneration:
        'ON',
    };
  }


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
    Object.keys(
      artifactConfig
    ).length > 0
  ) {

    config.artifactConfig =
      artifactConfig;
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
      (
        normalized.includes(
          'not available'
        ) ||
        normalized.includes(
          'not supported'
        )
      )
    )
  );
}


function autoRecordingUnavailable(
  message:
    string
) {

  const normalized =
    message
      .trim()
      .toLowerCase();


  return (
    normalized.includes(
      'updateautorecordinggeneration is not available'
    ) ||
    (
      normalized.includes(
        'autorecording'
      ) &&
      (
        normalized.includes(
          'not available'
        ) ||
        normalized.includes(
          'not supported'
        )
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
   * A Liv tenta criar o espaço com os dois recursos:
   *
   * 1. gravação automática;
   * 2. transcrição automática.
   *
   * Se a conta não oferecer um deles, somente esse recurso
   * é removido e a criação é tentada novamente.
   */
  let autoRecordingEnabled =
    true;


  let autoTranscriptionEnabled =
    true;


  let recordingWarning:
    string |
    null =
      null;


  let transcriptionWarning:
    string |
    null =
      null;


  let payload:
    CreateMeetSpaceResponse |
    null =
      null;


  for (
    let attemptNumber = 1;
    attemptNumber <= 3;
    attemptNumber += 1
  ) {

    const attempt =
      await requestGoogleMeetSpace({
        accessToken:
          auth.accessToken,

        autoRecording:
          autoRecordingEnabled,

        autoTranscription:
          autoTranscriptionEnabled,
      });


    if (
      attempt.response.ok
    ) {

      payload =
        attempt.payload;

      break;
    }


    const creationError =
      googleMeetCreationError(
        attempt.payload,
        attempt.response.status
      );


    let downgraded =
      false;


    if (
      autoTranscriptionEnabled &&
      autoTranscriptionUnavailable(
        creationError
      )
    ) {

      autoTranscriptionEnabled =
        false;


      transcriptionWarning =
        'A conta Google conectada não oferece transcrição automática.';


      downgraded =
        true;


      console.warn(
        '[GOOGLE MEET] Transcrição automática indisponível:',
        creationError
      );
    }


    if (
      autoRecordingEnabled &&
      autoRecordingUnavailable(
        creationError
      )
    ) {

      autoRecordingEnabled =
        false;


      recordingWarning =
        'A conta Google conectada não oferece gravação automática.';


      downgraded =
        true;


      console.warn(
        '[GOOGLE MEET] Gravação automática indisponível:',
        creationError
      );
    }


    if (
      !downgraded
    ) {

      throw new Error(
        creationError
      );
    }


    console.warn(
      '[GOOGLE MEET] Nova tentativa de criação.',
      {
        attemptNumber:
          attemptNumber + 1,

        autoRecording:
          autoRecordingEnabled,

        autoTranscription:
          autoTranscriptionEnabled,
      }
    );
  }


  if (
    !payload
  ) {

    throw new Error(
      'O Google Meet não conseguiu criar a reunião após aplicar os fallbacks de gravação e transcrição.'
    );
  }


  if (
    !payload.name ||
    !payload.meetingUri
  ) {

    throw new Error(
      'Google Meet criou o espaço sem retornar um link de reunião.'
    );
  }


  const artifactStatusParts:
    string[] = [];


  if (
    autoRecordingEnabled
  ) {

    artifactStatusParts.push(
      'Gravação automática ativada pela Liv.'
    );
  }
  else if (
    recordingWarning
  ) {

    artifactStatusParts.push(
      recordingWarning
    );
  }


  if (
    autoTranscriptionEnabled
  ) {

    artifactStatusParts.push(
      'Transcrição automática ativada pela Liv.'
    );
  }
  else if (
    transcriptionWarning
  ) {

    artifactStatusParts.push(
      transcriptionWarning
    );
  }


  if (
    !autoRecordingEnabled &&
    !autoTranscriptionEnabled
  ) {

    artifactStatusParts.push(
      'O Meet foi criado normalmente.'
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

    autoRecordingEnabled,

    autoTranscriptionEnabled,

    recordingWarning,

    transcriptionWarning,

    artifactStatusMessage:
      artifactStatusParts.join(
        ' '
      ),
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
