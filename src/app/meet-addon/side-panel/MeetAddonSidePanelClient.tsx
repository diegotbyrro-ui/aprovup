'use client';

import Script from 'next/script';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import {
  Bot,
  Check,
  LoaderCircle,
  Mic,
  Send,
  Sparkles,
  X,
} from 'lucide-react';


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

  expiresAt?:
    string |
    null;
};


type LocalMessage = {
  role:
    'USER' |
    'ASSISTANT';

  content:
    string;
};


type MeetInfo = {
  meetingCode?:
    string;

  meetingId?:
    string;
};


type MeetSidePanelClientLike = {
  getMeetingInfo:
    () =>
      Promise<
        MeetInfo
      >;
};


type AddonSessionLike = {
  createSidePanelClient:
    () =>
      Promise<
        MeetSidePanelClientLike
      >;
};


type MeetAddonLike = {
  createAddonSession:
    (
      options: {
        cloudProjectNumber:
          string;
      }
    ) =>
      Promise<
        AddonSessionLike
      >;
};


type SpeechResultEventLike = {
  results: {
    [index:
      number]: {
      [index:
        number]: {
        transcript:
          string;
      };
    };
  };
};


type SpeechRecognitionLike = {
  lang:
    string;

  interimResults:
    boolean;

  continuous:
    boolean;

  start:
    () =>
      void;

  stop:
    () =>
      void;

  onresult:
    (
      event:
        SpeechResultEventLike
    ) =>
      void;

  onerror:
    () =>
      void;

  onend:
    () =>
      void;
};


type SpeechRecognitionConstructor =
  new () =>
    SpeechRecognitionLike;


type MeetBrowserWindow =
  Window & {
    meet?: {
      addon?:
        MeetAddonLike;
    };

    SpeechRecognition?:
      SpeechRecognitionConstructor;

    webkitSpeechRecognition?:
      SpeechRecognitionConstructor;
  };


const STORAGE_KEY =
  'aprovup_meet_addon_token';


export function MeetAddonSidePanelClient({
  cloudProjectNumber,
}: {
  cloudProjectNumber:
    string;
}) {

  const [
    sdkReady,
    setSdkReady,
  ] =
    useState(
      false
    );


  const [
    initialized,
    setInitialized,
  ] =
    useState(
      false
    );


  const [
    meetingCode,
    setMeetingCode,
  ] =
    useState(
      ''
    );


  const [
    token,
    setToken,
  ] =
    useState(
      ''
    );


  const [
    input,
    setInput,
  ] =
    useState(
      ''
    );


  const [
    messages,
    setMessages,
  ] =
    useState<
      LocalMessage[]
    >(
      []
    );


  const [
    pendingAction,
    setPendingAction,
  ] =
    useState<
      PendingAction |
      null
    >(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );


  const [
    listening,
    setListening,
  ] =
    useState(
      false
    );


  const [
    error,
    setError,
  ] =
    useState(
      ''
    );


  const recognitionRef =
    useRef<
      SpeechRecognitionLike |
      null
    >(
      null
    );


  useEffect(
    () => {

      try {

        const stored =
          window
            .sessionStorage
            .getItem(
              STORAGE_KEY
            ) ||
          '';


        if (
          stored
        ) {

          setToken(
            stored
          );
        }

      }
      catch {
        // Ignora bloqueio de storage no iframe.
      }


      function handleMessage(
        event:
          MessageEvent
      ) {

        if (
          event.origin !==
          window.location.origin
        ) {

          return;
        }


        if (
          event.data
            ?.type !==
          'APROVUP_MEET_ADDON_AUTH'
        ) {

          return;
        }


        const receivedToken =
          String(
            event.data
              ?.token ||
            ''
          );


        if (
          !receivedToken
        ) {

          return;
        }


        try {

          window
            .sessionStorage
            .setItem(
              STORAGE_KEY,
              receivedToken
            );

        }
        catch {
          // O token continua em memoria.
        }


        setToken(
          receivedToken
        );


        setError(
          ''
        );
      }


      window.addEventListener(
        'message',
        handleMessage
      );


      return () => {

        window.removeEventListener(
          'message',
          handleMessage
        );
      };

    },
    []
  );


  useEffect(
    () => {

      function handleVoiceMessage(
        event:
          MessageEvent
      ) {

        if (
          event.origin !==
          window.location.origin
        ) {
          return;
        }


        if (
          event.data?.type ===
          'APROVUP_MEET_VOICE_RESULT'
        ) {

          const text =
            String(
              event.data?.text ||
              ''
            ).trim();


          if (text) {

            setInput(
              text
            );


            setError(
              ''
            );
          }


          setListening(
            false
          );

          return;
        }


        if (
          event.data?.type ===
          'APROVUP_MEET_VOICE_ERROR'
        ) {

          setListening(
            false
          );


          setError(
            String(
              event.data?.message ||
              'Não foi possível processar o comando de voz.'
            )
          );
        }
      }


      window.addEventListener(
        'message',
        handleVoiceMessage
      );


      return () => {

        window.removeEventListener(
          'message',
          handleVoiceMessage
        );
      };

    },
    []
  );


  useEffect(
    () => {

      if (
        !sdkReady
      ) {

        return;
      }


      if (
        !cloudProjectNumber
      ) {

        setError(
          'O número do projeto Google Cloud ainda não foi configurado no AprovUp.'
        );

        return;
      }


      let active =
        true;


      void (
        async () => {

          try {

            const browserWindow =
              window as
                MeetBrowserWindow;


            const addon =
              browserWindow
                .meet
                ?.addon;


            if (
              !addon
            ) {

              throw new Error(
                'SDK do Google Meet não carregado.'
              );
            }


            const session =
              await addon
                .createAddonSession({
                  cloudProjectNumber,
                });


            const client =
              await session
                .createSidePanelClient();


            const info =
              await client
                .getMeetingInfo();


            if (
              !active
            ) {

              return;
            }


            setMeetingCode(
              String(
                info.meetingCode ||
                ''
              )
            );


            setInitialized(
              true
            );


            setError(
              ''
            );

          }
          catch (
            initError
          ) {

            if (
              active
            ) {

              setError(
                initError instanceof Error
                  ? initError.message
                  : 'Não foi possível iniciar a Liv dentro do Meet.'
              );
            }
          }

        }
      )();


      return () => {

        active =
          false;
      };

    },
    [
      sdkReady,
      cloudProjectNumber,
    ]
  );


  function connectAprovUp() {

    window.open(
      '/meet-addon/auth',
      'aprovup_meet_auth',
      'popup=yes,width=520,height=680'
    );
  }


  async function sendCommand(
    event?:
      FormEvent
  ) {

    event
      ?.preventDefault();


    const message =
      input
        .trim();


    if (
      !message ||
      loading
    ) {

      return;
    }


    if (
      !token
    ) {

      setError(
        'Conecte sua conta do AprovUp antes de falar com a Liv.'
      );

      return;
    }


    if (
      !meetingCode
    ) {

      setError(
        'A Liv ainda não identificou o código desta reunião.'
      );

      return;
    }


    setLoading(
      true
    );


    setError(
      ''
    );


    setPendingAction(
      null
    );


    setMessages(
      (
        current
      ) => [
        ...current,
        {
          role:
            'USER',

          content:
            message,
        },
      ]
    );


    setInput(
      ''
    );


    try {

      const response =
        await fetch(
          '/api/meet-addon/command',
          {
            method:
              'POST',

            headers: {
              Authorization:
                'Bearer ' +
                token,

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                message,

                meetingCode,
              }),
          }
        );


      const payload =
        await response
          .json() as {
            ok?:
              boolean;

            message?:
              string;

            assistantMessage?: {
              content?:
                string;
            };

            pendingAction?:
              PendingAction |
              null;
          };


      if (
        response.status ===
          401
      ) {

        try {

          window
            .sessionStorage
            .removeItem(
              STORAGE_KEY
            );

        }
        catch {
          // Ignora.
        }


        setToken(
          ''
        );
      }


      if (
        !response.ok ||
        !payload.ok
      ) {

        throw new Error(
          payload.message ||
          'A Liv não conseguiu responder.'
        );
      }


      const answer =
        String(
          payload
            .assistantMessage
            ?.content ||
          ''
        );


      if (
        answer
      ) {

        setMessages(
          (
            current
          ) => [
            ...current,
            {
              role:
                'ASSISTANT',

              content:
                answer,
            },
          ]
        );
      }


      setPendingAction(
        payload.pendingAction ||
        null
      );

    }
    catch (
      commandError
    ) {

      setError(
        commandError instanceof Error
          ? commandError.message
          : 'Erro ao conversar com a Liv.'
      );

    }
    finally {

      setLoading(
        false
      );
    }
  }


  async function decideAction(
    decision:
      'confirm' |
      'cancel'
  ) {

    if (
      !pendingAction ||
      !token ||
      loading
    ) {

      return;
    }


    setLoading(
      true
    );


    setError(
      ''
    );


    try {

      const response =
        await fetch(
          '/api/meet-addon/actions/' +
          encodeURIComponent(
            pendingAction.id
          ),
          {
            method:
              'POST',

            headers: {
              Authorization:
                'Bearer ' +
                token,

              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                decision,
              }),
          }
        );


      const payload =
        await response
          .json() as {
            ok?:
              boolean;

            message?:
              string;

            content?:
              string;

            htmlLink?:
              string |
              null;
          };


      if (
        !response.ok ||
        !payload.ok
      ) {

        throw new Error(
          payload.message ||
          'Não foi possível concluir a ação.'
        );
      }


      const resultText =
        (
          payload.content ||
          (
            decision ===
              'confirm'
              ? 'Ação confirmada.'
              : 'Ação cancelada.'
          )
        ) +
        (
          payload.htmlLink
            ? '\n' +
              payload.htmlLink
            : ''
        );


      setMessages(
        (
          current
        ) => [
          ...current,
          {
            role:
              'ASSISTANT',

            content:
              resultText,
          },
        ]
      );


      setPendingAction(
        null
      );

    }
    catch (
      actionError
    ) {

      setError(
        actionError instanceof Error
          ? actionError.message
          : 'Erro ao confirmar a ação.'
      );

    }
    finally {

      setLoading(
        false
      );
    }
  }


  function startVoice() {

    if (
      loading
    ) {
      return;
    }


    if (
      !token
    ) {

      setError(
        'Conecte sua conta do AprovUp antes de falar com a Liv.'
      );

      return;
    }


    setError(
      ''
    );


    const popup =
      window.open(
        '/meet-addon/voice',
        'aprovup_meet_voice',
        'popup=yes,width=410,height=420'
      );


    if (!popup) {

      setError(
        'O navegador bloqueou a janela do microfone. Permita pop-ups do AprovUp e tente novamente.'
      );

      return;
    }


    setListening(
      true
    );


    const watcher =
      window.setInterval(
        () => {

          if (popup.closed) {

            window.clearInterval(
              watcher
            );


            setListening(
              false
            );
          }

        },
        500
      );


    popup.focus();
  }

  return (
    <>

      <Script
        src="https://www.gstatic.com/meetjs/addons/1.1.0/meet.addons.js"
        strategy="afterInteractive"
        onLoad={
          () =>
            setSdkReady(
              true
            )
        }
      />


      <main className="flex min-h-screen flex-col bg-slate-950 text-white">

        <header className="border-b border-white/10 p-4">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
              <Bot
                size={20}
              />
            </div>


            <div className="min-w-0 flex-1">

              <div className="flex items-center gap-2">

                <h1 className="font-black">
                  Liv
                </h1>


                {
                  initialized
                    ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                        NO MEET
                      </span>
                    )
                    : null
                }

              </div>


              <p className="truncate text-[10px] text-slate-400">
                {
                  meetingCode
                    ? 'Reunião ' +
                      meetingCode
                    : 'Inicializando reunião...'
                }
              </p>

            </div>

          </div>


          {
            !token
              ? (
                <button
                  type="button"
                  onClick={
                    connectAprovUp
                  }
                  className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white hover:bg-blue-700"
                >
                  Conectar AprovUp
                </button>
              )
              : (
                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-300">

                  <Check
                    size={13}
                  />

                  AprovUp conectado

                </div>
              )
          }

        </header>


        <section className="flex-1 space-y-3 overflow-y-auto p-4">

          {
            messages.length ===
              0
              ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

                  <div className="flex items-center gap-2 text-violet-300">

                    <Sparkles
                      size={14}
                    />

                    <p className="text-xs font-black">
                      Fale com a Liv durante a reunião
                    </p>

                  </div>


                  <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
                    Exemplo: "Liv, marque uma gravação para o Yuri na terça-feira às 14h."
                  </p>


                  <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                    Clique em Falar para abrir o microfone da Liv. O áudio será transcrito e o texto voltará aqui para você conferir antes de enviar.
                  </p>

                </div>
              )
              : messages.map(
                  (
                    message,
                    index
                  ) => (
                    <div
                      key={
                        index
                      }
                      className={
                        message.role ===
                          'USER'
                          ? 'ml-7 rounded-2xl bg-blue-600 p-3 text-xs leading-relaxed text-white'
                          : 'mr-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed text-slate-200'
                      }
                    >
                      <p className="whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  )
                )
          }


          {
            pendingAction
              ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">

                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                    Confirmar ação
                  </p>


                  <p className="mt-2 text-xs font-black text-white">
                    {
                      String(
                        pendingAction
                          .payload
                          ?.title ||
                        pendingAction.type
                      )
                    }
                  </p>


                  {
                    pendingAction
                      .payload
                      ?.startDate
                      ? (
                        <p className="mt-1 text-[10px] text-amber-100">
                          Início: {
                            String(
                              pendingAction
                                .payload
                                .startDate
                            )
                          }
                        </p>
                      )
                      : null
                  }


                  <div className="mt-3 grid grid-cols-2 gap-2">

                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={
                        () =>
                          void decideAction(
                            'confirm'
                          )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-[10px] font-black text-white disabled:opacity-50"
                    >
                      <Check
                        size={13}
                      />

                      Confirmar
                    </button>


                    <button
                      type="button"
                      disabled={
                        loading
                      }
                      onClick={
                        () =>
                          void decideAction(
                            'cancel'
                          )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-[10px] font-black text-slate-200 disabled:opacity-50"
                    >
                      <X
                        size={13}
                      />

                      Cancelar
                    </button>

                  </div>

                </div>
              )
              : null
          }


          {
            loading
              ? (
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">

                  <LoaderCircle
                    size={13}
                    className="animate-spin"
                  />

                  Liv está processando...

                </div>
              )
              : null
          }


          {
            error
              ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[10px] font-bold leading-relaxed text-red-200">
                  {error}
                </div>
              )
              : null
          }

        </section>


        <form
          onSubmit={
            sendCommand
          }
          className="border-t border-white/10 bg-slate-950 p-3"
        >

          <textarea
            value={
              input
            }
            onChange={
              (
                event
              ) =>
                setInput(
                  event.target.value
                )
            }
            rows={3}
            placeholder="Peça algo para a Liv..."
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
          />


          <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">

            <button
              type="button"
              onClick={
                startVoice
              }
              className={
                listening
                  ? 'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 text-[10px] font-black text-white'
                  : 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black text-slate-200'
              }
            >
              <Mic
                size={14}
              />

              {
                listening
                  ? 'Microfone aberto'
                  : 'Falar'
              }
            </button>


            <button
              type="submit"
              disabled={
                loading ||
                !input.trim()
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send
                size={14}
              />

              Enviar para Liv
            </button>

          </div>

        </form>

      </main>

    </>
  );
}
