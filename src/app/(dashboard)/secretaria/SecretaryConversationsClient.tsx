"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Bot,
  LockKeyhole,
  MessageCircleMore,
  Mic,
  RefreshCw,
  Search,
  Smartphone,
  UserRound,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";


type ConversationMessage = {
  id: string;
  role: string;
  content: string;
  inputType: string;
  createdAt: string;
};


type Conversation = {
  id: string;
  userId: string | null;
  phone: string;
  displayName: string;
  lastInboundAt: string | null;
  updatedAt: string;
  messages: ConversationMessage[];
};


function formatPhone(
  value:
    string
) {
  const digits =
    String(
      value ||
      ""
    ).replace(
      /\D/g,
      ""
    );

  if (
    digits.startsWith(
      "55"
    ) &&
    digits.length >=
      12
  ) {
    const area =
      digits.slice(
        2,
        4
      );

    const local =
      digits.slice(
        4
      );

    if (
      local.length ===
      9
    ) {
      return (
        "+55 (" +
        area +
        ") " +
        local.slice(
          0,
          5
        ) +
        "-" +
        local.slice(
          5
        )
      );
    }

    if (
      local.length ===
      8
    ) {
      return (
        "+55 (" +
        area +
        ") " +
        local.slice(
          0,
          4
        ) +
        "-" +
        local.slice(
          4
        )
      );
    }
  }

  return digits
    ? "+" +
        digits
    : "Sem número";
}


const fullDateFormatter =
  new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Maceio",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );


const timeFormatter =
  new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Maceio",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );


function formatDate(
  value:
    string
) {
  return fullDateFormatter
    .format(
      new Date(
        value
      )
    );
}


function formatTime(
  value:
    string
) {
  return timeFormatter
    .format(
      new Date(
        value
      )
    );
}


function previewText(
  conversation:
    Conversation,
  assistantLabel:
    string
) {
  const last =
    conversation.messages[
      conversation
        .messages
        .length -
        1
    ];

  if (!last) {
    return "Sem mensagens registradas";
  }

  const prefix =
    last.role ===
    "ASSISTANT"
      ? assistantLabel + ": "
      : "";

  return (
    prefix +
    last.content
      .replace(
        /\s+/g,
        " "
      )
      .trim()
  );
}


export function SecretaryConversationsClient({
  secretaryName,
  secretaryAvatarUrl,
  conversations,
}: {
  secretaryName: string;
  secretaryAvatarUrl: string;
  conversations: Conversation[];
}) {
  const router =
    useRouter();

  const [
    selectedId,
    setSelectedId,
  ] =
    useState<
      string |
      null
    >(
      conversations[0]
        ?.id ||
        null
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(
      false
    );

  const messagesEndRef =
    useRef<
      HTMLDivElement |
      null
    >(
      null
    );


  useEffect(
    () => {
      if (
        selectedId &&
        conversations.some(
          (
            item
          ) =>
            item.id ===
            selectedId
        )
      ) {
        return;
      }

      setSelectedId(
        conversations[0]
          ?.id ||
          null
      );
    },
    [
      conversations,
      selectedId,
    ]
  );


  useEffect(
    () => {
      const interval =
        window.setInterval(
          () => {
            router.refresh();
          },
          15000
        );

      return () =>
        window.clearInterval(
          interval
        );
    },
    [
      router,
    ]
  );


  const filtered =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return conversations;
        }

        return conversations
          .filter(
            (
              conversation
            ) =>
              conversation
                .displayName
                .toLowerCase()
                .includes(
                  query
                ) ||
              conversation
                .phone
                .includes(
                  query.replace(
                    /\D/g,
                    ""
                  )
                )
          );
      },
      [
        conversations,
        search,
      ]
    );


  const selected =
    useMemo(
      () =>
        conversations.find(
          (
            conversation
          ) =>
            conversation.id ===
            selectedId
        ) ||
        null,
      [
        conversations,
        selectedId,
      ]
    );


  useEffect(
    () => {
      messagesEndRef
        .current
        ?.scrollIntoView({
          behavior:
            "auto",

          block:
            "end",
        });
    },
    [
      selected?.id,
      selected
        ?.messages
        .length,
    ]
  );


  function refreshNow() {
    setIsRefreshing(
      true
    );

    router.refresh();

    window.setTimeout(
      () => {
        setIsRefreshing(
          false
        );
      },
      700
    );
  }


  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

      <div className="grid min-h-[640px] lg:grid-cols-[340px_minmax(0,1fr)]">

        <aside className="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">

          <div className="border-b border-slate-200 bg-white p-4">

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-slate-950">
                  Conversas do WhatsApp
                </p>

                <p className="mt-1 text-[9px] font-bold text-slate-400">
                  Atualização automática a cada 15 segundos
                </p>
              </div>

              <button
                type="button"
                onClick={
                  refreshNow
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                title="Atualizar agora"
              >
                <RefreshCw
                  size={15}
                  className={
                    isRefreshing
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>
            </div>


            <label className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Search
                size={14}
                className="text-slate-400"
              />

              <input
                value={
                  search
                }
                onChange={
                  (
                    event
                  ) =>
                    setSearch(
                      event
                        .target
                        .value
                    )
                }
                placeholder="Buscar pessoa ou número"
                className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-slate-700 outline-none placeholder:text-slate-400"
              />
            </label>

          </div>


          <div className="max-h-[610px] overflow-y-auto p-2">
            {
              filtered.length
                ? filtered.map(
                    (
                      conversation
                    ) => {
                      const active =
                        conversation.id ===
                        selectedId;

                      const lastPreview =
                        previewText(
                          conversation,
                          secretaryName
                        );

                      return (
                        <button
                          key={
                            conversation.id
                          }
                          type="button"
                          onClick={
                            () =>
                              setSelectedId(
                                conversation.id
                              )
                          }
                          className={
                            "mb-1 w-full rounded-2xl border px-3 py-3 text-left transition " +
                            (
                              active
                                ? "border-blue-200 bg-blue-50 shadow-sm"
                                : "border-transparent hover:border-slate-200 hover:bg-white"
                            )
                          }
                        >
                          <div className="flex items-start gap-3">
                            <div className={
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black " +
                              (
                                active
                                  ? "bg-blue-600 text-white"
                                  : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                              )
                            }>
                              {
                                conversation
                                  .displayName
                                  .trim()
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase() ||
                                <UserRound
                                  size={16}
                                />
                              }
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-[11px] font-black text-slate-900">
                                  {
                                    conversation
                                      .displayName
                                  }
                                </p>

                                <span className="shrink-0 text-[8px] font-bold text-slate-400">
                                  {
                                    formatDate(
                                      conversation
                                        .updatedAt
                                    )
                                  }
                                </span>
                              </div>

                              <p className="mt-1 truncate text-[9px] font-semibold text-slate-400">
                                {
                                  formatPhone(
                                    conversation
                                      .phone
                                  )
                                }
                              </p>

                              <p className="mt-1.5 line-clamp-2 text-[9px] leading-relaxed text-slate-500">
                                {
                                  lastPreview
                                }
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    }
                  )
                : (
                  <div className="px-4 py-12 text-center">
                    <MessageCircleMore
                      size={28}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-[11px] font-black text-slate-600">
                      Nenhuma conversa encontrada
                    </p>

                    <p className="mt-1 text-[9px] leading-relaxed text-slate-400">
                      As conversas aparecerão aqui quando a equipe falar com a {secretaryName} pelo WhatsApp.
                    </p>
                  </div>
                )
            }
          </div>

        </aside>


        <div className="flex min-w-0 flex-col bg-slate-100/70">

          {
            selected
              ? (
                <>
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                        <UserRound
                          size={19}
                        />
                      </div>

                      <div>
                        <p className="text-sm font-black text-slate-950">
                          {
                            selected
                              .displayName
                          }
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-semibold text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Smartphone
                              size={11}
                            />

                            {
                              formatPhone(
                                selected
                                  .phone
                              )
                            }
                          </span>

                          {
                            selected
                              .lastInboundAt
                              ? (
                                <span>
                                  Última entrada: {
                                    formatDate(
                                      selected
                                        .lastInboundAt
                                    )
                                  }
                                </span>
                              )
                              : null
                          }
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[9px] font-black text-slate-500">
                      <LockKeyhole
                        size={13}
                      />

                      Somente leitura
                    </div>
                  </header>


                  <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-7">

                    {
                      selected
                        .messages
                        .length
                        ? (
                          <div className="mx-auto flex max-w-4xl flex-col gap-3">
                            {
                              selected
                                .messages
                                .map(
                                  (
                                    message
                                  ) => {
                                    const fromLiv =
                                      message.role ===
                                      "ASSISTANT";

                                    return (
                                      <div
                                        key={
                                          message.id
                                        }
                                        className={
                                          "flex " +
                                          (
                                            fromLiv
                                              ? "justify-end"
                                              : "justify-start"
                                          )
                                        }
                                      >
                                        <div className={
                                          "max-w-[86%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] " +
                                          (
                                            fromLiv
                                              ? "rounded-br-md bg-blue-600 text-white"
                                              : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                                          )
                                        }>
                                          <div className="mb-1.5 flex items-center gap-2">
                                            {
                                              fromLiv
                                                ? secretaryAvatarUrl
                                                  ? (
                                                    <img
                                                      src={
                                                        secretaryAvatarUrl
                                                      }
                                                      alt=""
                                                      className="h-5 w-5 rounded-lg object-cover"
                                                    />
                                                  )
                                                  : (
                                                    <Bot
                                                      size={13}
                                                    />
                                                  )
                                                : (
                                                  <UserRound
                                                    size={13}
                                                  />
                                                )
                                            }

                                            <span className={
                                              "text-[8px] font-black uppercase tracking-[0.08em] " +
                                              (
                                                fromLiv
                                                  ? "text-blue-100"
                                                  : "text-slate-400"
                                              )
                                            }>
                                              {
                                                fromLiv
                                                  ? secretaryName
                                                  : selected
                                                      .displayName
                                              }
                                            </span>

                                            {
                                              message
                                                .inputType ===
                                                "AUDIO"
                                                ? (
                                                  <span className={
                                                    "inline-flex items-center gap-1 text-[8px] font-bold " +
                                                    (
                                                      fromLiv
                                                        ? "text-blue-100"
                                                        : "text-slate-400"
                                                    )
                                                  }>
                                                    <Mic
                                                      size={10}
                                                    />

                                                    Áudio transcrito
                                                  </span>
                                                )
                                                : null
                                            }
                                          </div>

                                          <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed">
                                            {
                                              message
                                                .content
                                            }
                                          </p>

                                          <div className={
                                            "mt-2 flex items-center justify-end gap-1 text-[8px] font-semibold " +
                                            (
                                              fromLiv
                                                ? "text-blue-100"
                                                : "text-slate-400"
                                            )
                                          }>
                                            {
                                              formatTime(
                                                message
                                                  .createdAt
                                              )
                                            }

                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )
                            }

                            <div
                              ref={
                                messagesEndRef
                              }
                            />
                          </div>
                        )
                        : (
                          <div className="flex h-full min-h-[360px] items-center justify-center">
                            <div className="text-center">
                              <MessageCircleMore
                                size={34}
                                className="mx-auto text-slate-300"
                              />

                              <p className="mt-3 text-xs font-black text-slate-600">
                                Sem mensagens registradas
                              </p>
                            </div>
                          </div>
                        )
                    }

                  </div>


                  <footer className="border-t border-slate-200 bg-white px-5 py-3">
                    <p className="text-center text-[9px] font-semibold text-slate-400">
                      Esta tela acompanha a conversa. A {secretaryName} continua atendendo a equipe diretamente pelo WhatsApp.
                    </p>
                  </footer>
                </>
              )
              : (
                <div className="flex flex-1 items-center justify-center px-6 py-16">
                  <div className="max-w-sm text-center">
                    <MessageCircleMore
                      size={42}
                      className="mx-auto text-slate-300"
                    />

                    <h2 className="mt-4 text-base font-black text-slate-800">
                      Conversas da {secretaryName}
                    </h2>

                    <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                      Assim que uma pessoa autorizada conversar com a {secretaryName} pelo WhatsApp, o histórico completo aparecerá aqui.
                    </p>
                  </div>
                </div>
              )
          }

        </div>

      </div>

    </section>
  );
}
