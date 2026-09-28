'use client';

import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Mic,
  Square,
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';


type VoiceStatus =
  | 'READY'
  | 'RECORDING'
  | 'TRANSCRIBING'
  | 'DONE'
  | 'ERROR';


export function MeetAddonVoiceClient() {

  const [
    status,
    setStatus,
  ] =
    useState<VoiceStatus>(
      'READY'
    );


  const [
    error,
    setError,
  ] =
    useState(
      ''
    );


  const recorderRef =
    useRef<
      MediaRecorder |
      null
    >(
      null
    );


  const streamRef =
    useRef<
      MediaStream |
      null
    >(
      null
    );


  const chunksRef =
    useRef<
      Blob[]
    >(
      []
    );


  useEffect(
    () => {

      return () => {

        streamRef
          .current
          ?.getTracks()
          .forEach(
            (
              track
            ) =>
              track.stop()
          );
      };

    },
    []
  );


  function sendToMeet(
    type:
      string,

    payload:
      Record<
        string,
        unknown
      >
  ) {

    if (!window.opener) {
      return;
    }


    window.opener.postMessage(
      {
        type,
        ...payload,
      },
      window.location.origin
    );
  }


  async function transcribe(
    blob:
      Blob
  ) {

    setStatus(
      'TRANSCRIBING'
    );


    setError(
      ''
    );


    try {

      const data =
        new FormData();


      const extension =
        blob.type.includes(
          'ogg'
        )
          ? 'ogg'
          : 'webm';


      data.append(
        'audio',
        blob,
        'comando-liv.' +
          extension
      );


      const response =
        await fetch(
          '/api/secretaria/audio',
          {
            method:
              'POST',

            body:
              data,
          }
        );


      const payload =
        await response.json() as {
          ok?:
            boolean;

          text?:
            string;

          message?:
            string;
        };


      if (
        !response.ok ||
        !payload.ok
      ) {

        throw new Error(
          payload.message ||
          'Não foi possível transcrever o áudio.'
        );
      }


      const text =
        String(
          payload.text ||
          ''
        ).trim();


      if (!text) {

        throw new Error(
          'A Liv não conseguiu identificar nenhuma fala.'
        );
      }


      setStatus(
        'DONE'
      );


      sendToMeet(
        'APROVUP_MEET_VOICE_RESULT',
        {
          text,
        }
      );


      window.setTimeout(
        () => {

          window.close();

        },
        900
      );

    }
    catch (
      transcribeError
    ) {

      const message =
        transcribeError instanceof Error
          ? transcribeError.message
          : 'Erro ao processar o áudio.';


      setError(
        message
      );


      setStatus(
        'ERROR'
      );


      sendToMeet(
        'APROVUP_MEET_VOICE_ERROR',
        {
          message,
        }
      );
    }
  }


  async function startRecording() {

    if (
      status ===
      'RECORDING' ||
      status ===
      'TRANSCRIBING'
    ) {
      return;
    }


    setError(
      ''
    );


    try {

      if (
        !navigator.mediaDevices
          ?.getUserMedia
      ) {

        throw new Error(
          'Este navegador não disponibilizou acesso ao microfone.'
        );
      }


      if (
        typeof MediaRecorder ===
        'undefined'
      ) {

        throw new Error(
          'Este navegador não possui suporte ao gravador de áudio.'
        );
      }


      const stream =
        await navigator
          .mediaDevices
          .getUserMedia({
            audio: {
              echoCancellation:
                true,

              noiseSuppression:
                true,

              autoGainControl:
                true,
            },
          });


      streamRef.current =
        stream;


      chunksRef.current =
        [];


      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
      ];


      const selected =
        candidates.find(
          (
            item
          ) =>
            MediaRecorder
              .isTypeSupported(
                item
              )
        );


      const recorder =
        selected
          ? new MediaRecorder(
              stream,
              {
                mimeType:
                  selected,
              }
            )
          : new MediaRecorder(
              stream
            );


      recorderRef.current =
        recorder;


      recorder.ondataavailable =
        (
          event
        ) => {

          if (
            event.data.size >
            0
          ) {

            chunksRef.current.push(
              event.data
            );
          }
        };


      recorder.onerror =
        () => {

          stream
            .getTracks()
            .forEach(
              (
                track
              ) =>
                track.stop()
            );


          setStatus(
            'ERROR'
          );


          setError(
            'A gravação foi interrompida pelo navegador.'
          );
        };


      recorder.onstop =
        () => {

          stream
            .getTracks()
            .forEach(
              (
                track
              ) =>
                track.stop()
            );


          streamRef.current =
            null;


          const chunks =
            chunksRef.current;


          chunksRef.current =
            [];


          if (
            chunks.length ===
            0
          ) {

            setStatus(
              'ERROR'
            );


            setError(
              'Nenhum áudio foi capturado.'
            );


            return;
          }


          const blob =
            new Blob(
              chunks,
              {
                type:
                  recorder.mimeType ||
                  'audio/webm',
              }
            );


          void transcribe(
            blob
          );
        };


      recorder.start(
        250
      );


      setStatus(
        'RECORDING'
      );

    }
    catch (
      startError
    ) {

      const message =
        startError instanceof Error
          ? startError.message
          : 'Não foi possível ativar o microfone.';


      setStatus(
        'ERROR'
      );


      setError(
        message
      );
    }
  }


  function stopRecording() {

    const recorder =
      recorderRef.current;


    if (
      !recorder ||
      recorder.state ===
        'inactive'
    ) {
      return;
    }


    recorder.stop();
  }


  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white">

      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">

        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
            <Mic
              size={22}
            />
          </div>


          <div>

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">
              Liv · AprovUp
            </p>

            <h1 className="mt-1 text-xl font-black">
              Comando por voz
            </h1>

          </div>

        </div>


        {
          status ===
          'READY'
            ? (
              <div className="mt-6">

                <p className="text-sm leading-relaxed text-slate-300">
                  Ative o microfone e fale normalmente. Depois finalize a gravação para a Liv transformar sua voz em texto.
                </p>


                <button
                  type="button"
                  onClick={
                    () =>
                      void startRecording()
                  }
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-700"
                >
                  <Mic
                    size={17}
                  />

                  Ativar microfone
                </button>

              </div>
            )
            : null
        }


        {
          status ===
          'RECORDING'
            ? (
              <div className="mt-6">

                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white">
                    <Mic
                      size={25}
                    />
                  </div>


                  <p className="mt-4 font-black text-red-100">
                    Ouvindo...
                  </p>


                  <p className="mt-1 text-xs text-red-200/70">
                    Fale o comando para a Liv.
                  </p>

                </div>


                <button
                  type="button"
                  onClick={
                    stopRecording
                  }
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-slate-950 hover:bg-slate-100"
                >
                  <Square
                    size={15}
                  />

                  Parar e transcrever
                </button>

              </div>
            )
            : null
        }


        {
          status ===
          'TRANSCRIBING'
            ? (
              <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6 text-center">

                <LoaderCircle
                  size={28}
                  className="mx-auto animate-spin text-blue-300"
                />


                <p className="mt-4 font-black text-blue-100">
                  A Liv está entendendo...
                </p>


                <p className="mt-1 text-xs text-blue-200/70">
                  Convertendo sua fala em texto.
                </p>

              </div>
            )
            : null
        }


        {
          status ===
          'DONE'
            ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">

                <CheckCircle2
                  size={30}
                  className="mx-auto text-emerald-300"
                />


                <p className="mt-3 font-black text-emerald-100">
                  Comando reconhecido
                </p>


                <p className="mt-1 text-xs text-emerald-200/70">
                  Voltando para a reunião...
                </p>

              </div>
            )
            : null
        }


        {
          status ===
          'ERROR'
            ? (
              <div className="mt-6">

                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">

                  <div className="flex items-start gap-3">

                    <AlertTriangle
                      size={18}
                      className="mt-0.5 shrink-0 text-red-300"
                    />


                    <p className="text-xs font-bold leading-relaxed text-red-100">
                      {
                        error ||
                        'Não foi possível usar o microfone.'
                      }
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  onClick={
                    () => {

                      setStatus(
                        'READY'
                      );

                      setError(
                        ''
                      );
                    }
                  }
                  className="mt-4 h-11 w-full rounded-xl border border-white/10 text-xs font-black text-slate-200 hover:bg-white/5"
                >
                  Tentar novamente
                </button>

              </div>
            )
            : null
        }

      </section>

    </main>
  );
}