'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Bot,
  CalendarCheck,
  Check,
  Mic,
  MicOff,
  Plus,
  Send,
  X,
} from 'lucide-react';


type Message = {
  id:
    string;

  role:
    string;

  content:
    string;

  inputType:
    string;

  createdAt:
    string;
};


type PendingAction = {
  id:
    string;

  type:
    string;

  payload:
    Record<
      string,
      unknown
    >;

  expiresAt:
    string |
    null;
};


type Alert = {
  id:
    string;

  title:
    string;

  message:
    string;

  severity:
    string;
};


function formatDateTime(
  value:
    unknown
) {
  if (
    typeof value !==
      'string' ||
    !value
  ) {
    return '';
  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date
    .toLocaleString(
      'pt-BR',
      {
        timeZone:
          'America/Maceio',

        dateStyle:
          'short',

        timeStyle:
          'short',
      }
    );
}


export function SecretaryClient({
  initialThreadId,
  initialMessages,
  initialPendingAction,
  alerts,
}: {
  initialThreadId:
    string |
    null;

  initialMessages:
    Message[];

  initialPendingAction:
    PendingAction |
    null;

  alerts:
    Alert[];
}) {
  const [
    threadId,
    setThreadId,
  ] =
    useState<
      string |
      null
    >(
      initialThreadId
    );


  const [
    messages,
    setMessages,
  ] =
    useState<
      Message[]
    >(
      initialMessages
    );


  const [
    pending,
    setPending,
  ] =
    useState<
      PendingAction |
      null
    >(
      initialPendingAction
    );


  const [
    text,
    setText,
  ] =
    useState(
      ''
    );


  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    );


  const [
    recording,
    setRecording,
  ] =
    useState(
      false
    );


  const [
    transcribing,
    setTranscribing,
  ] =
    useState(
      false
    );


  const [
    status,
    setStatus,
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


  const chunksRef =
    useRef<
      Blob[]
    >(
      []
    );


  const endRef =
    useRef<
      HTMLDivElement |
      null
    >(
      null
    );


  useEffect(
    () => {
      endRef
        .current
        ?.scrollIntoView({
          behavior:
            'smooth',
        });
    },
    [
      messages,
      pending,
      busy,
    ]
  );


  async function sendMessage(
    raw:
      string,
    inputType:
      'TEXT' |
      'AUDIO' =
        'TEXT'
  ) {
    const message =
      raw.trim();


    if (
      !message ||
      busy
    ) {
      return;
    }


    setBusy(
      true
    );

    setStatus(
      'Consultando a operaÃ§Ã£o...'
    );

    setText(
      ''
    );


    setMessages(
      (
        current
      ) => [
        ...current,

        {
          id:
            'local-' +
            Date.now(),

          role:
            'USER',

          content:
            message,

          inputType,

          createdAt:
            new Date()
              .toISOString(),
        },
      ]
    );


    try {
      const response =
        await fetch(
          '/api/secretaria/chat',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                threadId,
                message,
                inputType,
              }),
          }
        );


      const result =
        await response
          .json();


      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.message ||
          'NÃ£o foi possÃ­vel consultar a SecretÃ¡ria.'
        );
      }


      setThreadId(
        result.threadId
      );


      setMessages(
        (
          current
        ) => [
          ...current,
          result
            .assistantMessage,
        ]
      );


      setPending(
        result
          .pendingAction ||
        null
      );


      setStatus(
        ''
      );
    }
    catch (
      error
    ) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Erro ao conversar com a SecretÃ¡ria.'
      );
    }
    finally {
      setBusy(
        false
      );
    }
  }


  async function startRecording() {
    if (
      recording ||
      transcribing ||
      busy
    ) {
      return;
    }


    try {
      const stream =
        await navigator
          .mediaDevices
          .getUserMedia({
            audio:
              true,
          });


      chunksRef.current =
        [];


      const recorder =
        new MediaRecorder(
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
            chunksRef
              .current
              .push(
                event.data
              );
          }
        };


      recorder.onstop =
        async () => {
          stream
            .getTracks()
            .forEach(
              (
                track
              ) =>
                track.stop()
            );


          setRecording(
            false
          );

          setTranscribing(
            true
          );

          setStatus(
            'Transcrevendo Ã¡udio...'
          );


          try {
            const blob =
              new Blob(
                chunksRef.current,
                {
                  type:
                    recorder.mimeType ||
                    'audio/webm',
                }
              );


            const formData =
              new FormData();


            formData.append(
              'audio',
              blob,
              'secretaria.webm'
            );


            const response =
              await fetch(
                '/api/secretaria/audio',
                {
                  method:
                    'POST',

                  body:
                    formData,
                }
              );


            const result =
              await response
                .json();


            if (
              !response.ok ||
              !result.ok ||
              !result.text
            ) {
              throw new Error(
                result.message ||
                'NÃ£o foi possÃ­vel transcrever.'
              );
            }


            setStatus(
              ''
            );


            await sendMessage(
              result.text,
              'AUDIO'
            );
          }
          catch (
            error
          ) {
            setStatus(
              error instanceof Error
                ? error.message
                : 'Erro ao transcrever Ã¡udio.'
            );
          }
          finally {
            setTranscribing(
              false
            );
          }
        };


      recorder.start();


      setRecording(
        true
      );

      setStatus(
        'Gravando... clique novamente para enviar.'
      );
    }
    catch {
      setStatus(
        'NÃ£o foi possÃ­vel acessar o microfone.'
      );
    }
  }


  function stopRecording() {
    if (
      recorderRef
        .current &&
      recorderRef
        .current
        .state !==
        'inactive'
    ) {
      recorderRef
        .current
        .stop();
    }
  }


  async function decide(
    decision:
      'confirm' |
      'cancel'
  ) {
    if (!pending) {
      return;
    }


    setStatus(
      decision ===
        'confirm'
        ? 'Criando compromisso no Google Agenda...'
        : 'Cancelando...'
    );


    try {
      const response =
        await fetch(
          '/api/secretaria/actions/' +
          pending.id,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                decision,
              }),
          }
        );


      const result =
        await response
          .json();


      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.message ||
          'NÃ£o foi possÃ­vel executar a aÃ§Ã£o.'
        );
      }


      setMessages(
        (
          current
        ) => [
          ...current,

          {
            id:
              'action-' +
              Date.now(),

            role:
              'ASSISTANT',

            content:
              result.content,

            inputType:
              'SYSTEM',

            createdAt:
              new Date()
                .toISOString(),
          },
        ]
      );


      setPending(
        null
      );

      setStatus(
        ''
      );
    }
    catch (
      error
    ) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Erro ao executar aÃ§Ã£o.'
      );
    }
  }


  function newConversation() {
    if (
      busy ||
      recording ||
      transcribing
    ) {
      return;
    }


    setThreadId(
      null
    );

    setMessages(
      []
    );

    setPending(
      null
    );

    setText(
      ''
    );

    setStatus(
      ''
    );
  }


  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">

      <section className="flex min-h-[680px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Bot
                size={20}
              />
            </div>

            <div>
              <p className="font-black text-slate-950">
                SecretÃ¡ria IA
              </p>

              <p className="text-xs text-slate-500">
                Converse naturalmente por texto ou Ã¡udio.
              </p>
            </div>
          </div>


          <button
            type="button"
            onClick={
              newConversation
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
          >
            <Plus
              size={14}
            />

            Nova conversa
          </button>

        </div>


        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-5">

          {messages.length ===
          0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <Bot
                size={38}
                className="text-blue-600"
              />

              <h2 className="mt-4 text-xl font-black text-slate-950">
                Pode perguntar do seu jeito.
              </h2>

              <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
                A SecretÃ¡ria consulta mÃ©tricas, publicaÃ§Ãµes, aprovaÃ§Ãµes, alertas e Google Agenda sem exigir comandos padronizados.
              </p>
            </div>
          ) : null}


          {messages.map(
            (
              message
            ) => (
              <div
                key={
                  message.id
                }
                className={
                  message.role ===
                  'USER'
                    ? 'flex justify-end'
                    : 'flex justify-start'
                }
              >
                <div
                  className={[
                    'max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[78%]',
                    message.role ===
                    'USER'
                      ? 'rounded-br-md bg-slate-950 text-white'
                      : 'rounded-bl-md border border-slate-200 bg-white text-slate-700',
                  ].join(
                    ' '
                  )}
                >
                  {message
                    .inputType ===
                  'AUDIO' ? (
                    <p className="mb-1 text-[9px] font-black uppercase tracking-wider opacity-50">
                      Ãudio transcrito
                    </p>
                  ) : null}

                  {message.content}
                </div>
              </div>
            )
          )}


          {pending ? (
            <div className="max-w-lg rounded-2xl border border-blue-200 bg-blue-50 p-4">

              <div className="flex items-center gap-2 font-black text-blue-800">
                <CalendarCheck
                  size={17}
                />

                Confirmar agendamento
              </div>

              <p className="mt-3 font-black text-slate-950">
                {
                  String(
                    pending
                      .payload
                      .title ||
                    'Compromisso'
                  )
                }
              </p>

              <p className="mt-1 text-xs text-slate-600">
                {
                  formatDateTime(
                    pending
                      .payload
                      .startDate
                  )
                }
                {
                  pending
                    .payload
                    .endDate
                    ? ' atÃ© ' +
                      formatDateTime(
                        pending
                          .payload
                          .endDate
                      )
                    : ''
                }
              </p>

              {
                pending
                  .payload
                  .location
                  ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Local: {
                        String(
                          pending
                            .payload
                            .location
                        )
                      }
                    </p>
                  )
                  : null
              }


              <div className="mt-4 grid grid-cols-2 gap-2">

                <button
                  type="button"
                  onClick={
                    () =>
                      decide(
                        'cancel'
                      )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-black text-slate-600"
                >
                  <X
                    size={14}
                  />

                  Cancelar
                </button>


                <button
                  type="button"
                  onClick={
                    () =>
                      decide(
                        'confirm'
                      )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white hover:bg-blue-700"
                >
                  <Check
                    size={14}
                  />

                  Confirmar
                </button>

              </div>

            </div>
          ) : null}


          {busy ? (
            <div className="text-xs font-bold text-blue-600">
              SecretÃ¡ria estÃ¡ analisando...
            </div>
          ) : null}


          <div
            ref={
              endRef
            }
          />

        </div>


        <div className="border-t border-slate-200 bg-white p-4">

          {status ? (
            <p className="mb-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
              {status}
            </p>
          ) : null}


          <div className="flex items-end gap-2">

            <button
              type="button"
              disabled={
                busy ||
                transcribing
              }
              onClick={
                recording
                  ? stopRecording
                  : startRecording
              }
              className={[
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition disabled:opacity-40',
                recording
                  ? 'bg-red-600 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
              ].join(
                ' '
              )}
            >
              {recording ? (
                <MicOff
                  size={18}
                />
              ) : (
                <Mic
                  size={18}
                />
              )}
            </button>


            <textarea
              rows={1}
              value={
                text
              }
              disabled={
                busy ||
                recording ||
                transcribing
              }
              onChange={
                (
                  event
                ) =>
                  setText(
                    event
                      .target
                      .value
                  )
              }
              onKeyDown={
                (
                  event
                ) => {
                  if (
                    event.key ===
                      'Enter' &&
                    !event
                      .shiftKey
                  ) {
                    event
                      .preventDefault();

                    sendMessage(
                      text
                    );
                  }
                }
              }
              placeholder="Pergunte qualquer coisa..."
              className="min-h-12 max-h-36 flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white"
            />


            <button
              type="button"
              disabled={
                busy ||
                recording ||
                transcribing ||
                !text.trim()
              }
              onClick={
                () =>
                  sendMessage(
                    text
                  )
              }
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            >
              <Send
                size={17}
              />
            </button>

          </div>

        </div>

      </section>


      <aside className="space-y-4">

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Monitor automÃ¡tico
          </p>

          <h3 className="mt-1 font-black text-slate-950">
            PublicaÃ§Ãµes
          </h3>


          <div className="mt-4 space-y-3">

            {alerts.length ===
            0 ? (
              <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
                Nenhum problema de publicaÃ§Ã£o aberto.
              </div>
            ) : null}


            {alerts.map(
              (
                alert
              ) => (
                <div
                  key={
                    alert.id
                  }
                  className="rounded-xl border border-red-100 bg-red-50 p-3"
                >
                  <p className="text-xs font-black text-red-800">
                    {alert.title}
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-red-700">
                    {alert.message}
                  </p>
                </div>
              )
            )}

          </div>

        </section>

      </aside>

    </div>
  );
}