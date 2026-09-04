"use client";

import Link from "next/link";

import {
  useMemo,
  useState,
} from "react";


type MobileCalendarContent = {
  id: string;
  title: string;
  clientName: string;
  dateKey: string;
  format: string | null;
  area: string;
  priority: string;
  status: string;
};


type MobileEditorialCalendarProps = {
  month: number;
  year: number;
  contents: MobileCalendarContent[];
};


const weekDays =
  [
    "DOM",
    "SEG",
    "TER",
    "QUA",
    "QUI",
    "SEX",
    "SÁB",
  ];


const monthNames =
  [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];


const areaLabels:
  Record<string, string> = {

    GERAL:
      "GERAL",

    SOCIAL_DESIGN:
      "DESIGN",

    AUDIOVISUAL:
      "FILMMAKER",
  };


const priorityLabels:
  Record<string, string> = {

    BAIXA:
      "BAIXA",

    MEDIA:
      "MÉDIA",

    ALTA:
      "ALTA",

    URGENTE:
      "URGENTE",
  };


const statusLabels:
  Record<string, string> = {

    IDEIA:
      "Ideia",

    RASCUNHO:
      "Rascunho",

    EM_PRODUCAO:
      "Em produção",

    EM_REVISAO:
      "Em revisão",

    AGUARDANDO_CLIENTE:
      "Aguardando cliente",

    ENVIADO_CLIENTE:
      "Enviado",

    ALTERACAO_SOLICITADA:
      "Ajuste solicitado",

    APROVADO:
      "Aprovado",

    AGENDAMENTO_PRODUCAO:
      "Produção agendada",

    PRONTO_PARA_POSTAR:
      "Pronto para postar",

    PUBLICADO:
      "Publicado",

    PUBLICADO_MANUALMENTE:
      "Publicado",

    ARQUIVADO:
      "Arquivado",
  };


function pad(
  value: number
) {

  return String(
    value
  ).padStart(
    2,
    "0"
  );
}


function makeDateKey(
  year: number,
  month: number,
  day: number
) {

  return [
    year,
    pad(
      month + 1
    ),
    pad(
      day
    ),
  ].join("-");
}


function parseDateKey(
  value: string
) {

  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);


  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0
  );
}


function formatLongDate(
  dateKey: string
) {

  const date =
    parseDateKey(
      dateKey
    );


  return date
    .toLocaleDateString(
      "pt-BR",
      {
        weekday:
          "long",

        day:
          "numeric",

        month:
          "long",
      }
    )
    .replace(
      /^./,
      (letter) =>
        letter.toUpperCase()
    );
}


function getInitialDate(
  month: number,
  year: number,
  contents: MobileCalendarContent[]
) {

  const now =
    new Date();


  if (
    now.getMonth() ===
      month &&
    now.getFullYear() ===
      year
  ) {

    return makeDateKey(
      year,
      month,
      now.getDate()
    );
  }


  const firstContent =
    contents
      .map(
        (content) =>
          content.dateKey
      )
      .sort()[0];


  if (
    firstContent
  ) {

    return firstContent;
  }


  return makeDateKey(
    year,
    month,
    1
  );
}


function getPriorityClass(
  priority: string
) {

  if (
    priority ===
    "URGENTE"
  ) {

    return "border-red-200 bg-red-50 text-red-700";
  }


  if (
    priority ===
    "ALTA"
  ) {

    return "border-orange-200 bg-orange-50 text-orange-700";
  }


  if (
    priority ===
    "MEDIA"
  ) {

    return "border-blue-200 bg-blue-50 text-blue-700";
  }


  return "border-slate-200 bg-slate-50 text-slate-600";
}


export function MobileEditorialCalendar({
  month,
  year,
  contents,
}: MobileEditorialCalendarProps) {

  const [
    mode,
    setMode,
  ] =
    useState<
      "agenda" |
      "month"
    >(
      "agenda"
    );


  const [
    selectedDate,
    setSelectedDate,
  ] =
    useState(
      () =>
        getInitialDate(
          month,
          year,
          contents
        )
    );


  const numberOfDays =
    new Date(
      year,
      month + 1,
      0
    ).getDate();


  const firstDayOffset =
    new Date(
      year,
      month,
      1,
      12,
      0,
      0
    ).getDay();


  const monthDays =
    useMemo(
      () =>
        Array.from(
          {
            length:
              numberOfDays,
          },
          (
            _,
            index
          ) => {

            const day =
              index + 1;


            const dateKey =
              makeDateKey(
                year,
                month,
                day
              );


            const date =
              parseDateKey(
                dateKey
              );


            return {
              day,
              dateKey,
              weekDay:
                weekDays[
                  date.getDay()
                ],

              count:
                contents.filter(
                  (content) =>
                    content.dateKey ===
                    dateKey
                ).length,
            };
          }
        ),
      [
        month,
        year,
        numberOfDays,
        contents,
      ]
    );


  const selectedContents =
    useMemo(
      () =>
        contents.filter(
          (content) =>
            content.dateKey ===
            selectedDate
        ),
      [
        contents,
        selectedDate,
      ]
    );


  const todayKey =
    makeDateKey(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate()
    );


  function selectDay(
    dateKey: string,
    openAgenda = false
  ) {

    setSelectedDate(
      dateKey
    );


    if (
      openAgenda
    ) {

      setMode(
        "agenda"
      );
    }
  }


  return (

    <div data-mobile-safe-area="true" className="mt-5 lg:hidden">

      {/* ===================================================
          SELETOR DE VISAO
         =================================================== */}

      <div className="mb-4 flex items-center justify-between gap-3">

        <div className="min-w-0">

          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">

            Calendário

          </p>


          <p className="mt-0.5 truncate text-base font-bold text-slate-900">

            {monthNames[month]} de {year}

          </p>

        </div>


        <div className="flex rounded-xl bg-slate-100 p-1">

          <button
            type="button"
            onClick={
              () =>
                setMode(
                  "agenda"
                )
            }
            className={[
              "rounded-lg px-3 py-2 text-xs font-bold transition",
              mode ===
              "agenda"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500",
            ].join(" ")}
          >

            Agenda

          </button>


          <button
            type="button"
            onClick={
              () =>
                setMode(
                  "month"
                )
            }
            className={[
              "rounded-lg px-3 py-2 text-xs font-bold transition",
              mode ===
              "month"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500",
            ].join(" ")}
          >

            Mês

          </button>

        </div>

      </div>


      {/* ===================================================
          AGENDA
         =================================================== */}

      {mode ===
      "agenda" ? (

        <>

          <div
            className="
              -mx-1 flex snap-x gap-2 overflow-x-auto
              px-1 pb-3
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >

            {monthDays.map(
              (
                item
              ) => {

                const selected =
                  selectedDate ===
                  item.dateKey;


                const today =
                  todayKey ===
                  item.dateKey;


                return (

                  <button
                    key={
                      item.dateKey
                    }
                    type="button"
                    onClick={
                      () =>
                        selectDay(
                          item.dateKey
                        )
                    }
                    className={[
                      "relative flex min-w-[64px] snap-center flex-col items-center rounded-2xl border px-3 py-3 transition",
                      selected
                        ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                        : today
                          ? "border-blue-200 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-white text-slate-700",
                    ].join(" ")}
                  >

                    <span
                      className={[
                        "whitespace-nowrap text-[10px] font-bold",
                        selected
                          ? "text-blue-100"
                          : "text-slate-400",
                      ].join(" ")}
                    >

                      {item.weekDay}

                    </span>


                    <span className="mt-1 whitespace-nowrap text-lg font-black">

                      {item.day}

                    </span>


                    <span
                      className={[
                        "mt-2 h-1.5 w-1.5 rounded-full",
                        item.count >
                        0
                          ? selected
                            ? "bg-white"
                            : "bg-blue-500"
                          : "bg-transparent",
                      ].join(" ")}
                    />


                    {item.count >
                    1 ? (

                      <span
                        className={[
                          "absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black",
                          selected
                            ? "bg-white text-blue-700"
                            : "bg-blue-100 text-blue-700",
                        ].join(" ")}
                      >

                        {item.count}

                      </span>

                    ) : null}

                  </button>
                );
              }
            )}

          </div>


          <div className="mt-2">

            <div className="mb-3 flex items-center justify-between gap-3">

              <div>

                <p className="text-sm font-bold text-slate-900">

                  {formatLongDate(
                    selectedDate
                  )}

                </p>


                <p className="mt-0.5 text-xs text-slate-400">

                  {selectedContents.length ===
                  1
                    ? "1 conteúdo planejado"
                    : `${selectedContents.length} conteúdos planejados`}

                </p>

              </div>


              <Link
                href="/conteudos/novo"
                className="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm"
              >

                + Novo

              </Link>

            </div>


            {selectedContents.length >
            0 ? (

              <div className="space-y-3">

                {selectedContents.map(
                  (
                    content
                  ) => (

                    <Link
                      key={
                        content.id
                      }
                      href={
                        `/conteudos/${content.id}`
                      }
                      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.99]"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0">

                          <p className="truncate text-xs font-bold text-blue-600">

                            {content.clientName}

                          </p>


                          <h3 className="mt-1 text-[15px] font-bold leading-snug text-slate-900">

                            {content.title}

                          </h3>

                        </div>


                        <span className="shrink-0 text-lg text-slate-300">

                          ›

                        </span>

                      </div>


                      <div className="mt-3 flex flex-wrap gap-1.5">

                        {content.format ? (

                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">

                            {content.format}

                          </span>

                        ) : null}


                        <span
                          className={[
                            "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase",
                            getPriorityClass(
                              content.priority
                            ),
                          ].join(" ")}
                        >

                          {
                            priorityLabels[
                              content.priority
                            ] ||
                            content.priority
                          }

                        </span>


                        <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase text-violet-700">

                          {
                            areaLabels[
                              content.area
                            ] ||
                            content.area
                          }

                        </span>

                      </div>


                      <div className="mt-3 border-t border-slate-100 pt-3">

                        <span className="text-[11px] font-semibold text-slate-500">

                          {
                            statusLabels[
                              content.status
                            ] ||
                            content.status
                          }

                        </span>

                      </div>

                    </Link>
                  )
                )}

              </div>

            ) : (

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">

                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm">

                  ✓

                </div>


                <p className="mt-3 text-sm font-bold text-slate-700">

                  Dia livre

                </p>


                <p className="mt-1 text-xs leading-relaxed text-slate-400">

                  Nenhum conteúdo planejado para esta data.

                </p>


                <Link
                  href="/conteudos/novo"
                  className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm"
                >

                  + Adicionar conteúdo

                </Link>

              </div>

            )}

          </div>

        </>

      ) : (

        /* =================================================
           MES COMPACTO
           ================================================= */

        <div>

          <div className="grid grid-cols-7 gap-1">

            {weekDays.map(
              (
                day
              ) => (

                <div
                  key={
                    day
                  }
                  className="whitespace-nowrap py-2 text-center text-[9px] font-black text-slate-400"
                >

                  {day}

                </div>
              )
            )}


            {Array.from(
              {
                length:
                  firstDayOffset,
              }
            ).map(
              (
                _,
                index
              ) => (

                <div
                  key={
                    `empty-${index}`
                  }
                  className="aspect-square"
                />

              )
            )}


            {monthDays.map(
              (
                item
              ) => {

                const selected =
                  selectedDate ===
                  item.dateKey;


                const today =
                  todayKey ===
                  item.dateKey;


                return (

                  <button
                    key={
                      item.dateKey
                    }
                    type="button"
                    onClick={
                      () =>
                        selectDay(
                          item.dateKey,
                          true
                        )
                    }
                    className={[
                      "relative flex aspect-square min-h-[48px] flex-col items-center justify-center rounded-xl border transition",
                      selected
                        ? "border-blue-500 bg-blue-600 text-white"
                        : today
                          ? "border-blue-300 bg-blue-50 text-blue-800"
                          : "border-slate-100 bg-white text-slate-700",
                    ].join(" ")}
                  >

                    <span className="text-sm font-bold">

                      {item.day}

                    </span>


                    <div className="mt-1 flex h-1.5 items-center justify-center gap-0.5">

                      {item.count >
                      0 ? (

                        <>

                          <span
                            className={[
                              "h-1.5 w-1.5 rounded-full",
                              selected
                                ? "bg-white"
                                : "bg-blue-500",
                            ].join(" ")}
                          />


                          {item.count >
                          1 ? (

                            <span
                              className={[
                                "text-[8px] font-black",
                                selected
                                  ? "text-white"
                                  : "text-blue-600",
                              ].join(" ")}
                            >

                              +{item.count - 1}

                            </span>

                          ) : null}

                        </>

                      ) : null}

                    </div>

                  </button>
                );
              }
            )}

          </div>


          <div className="mt-4 rounded-2xl bg-slate-50 p-4">

            <p className="text-xs font-bold text-slate-700">

              Toque em um dia para abrir a agenda.

            </p>


            <p className="mt-1 text-[11px] text-slate-400">

              Os pontos azuis indicam dias com conteúdo planejado.

            </p>

          </div>

        </div>
      )}

    </div>
  );
}