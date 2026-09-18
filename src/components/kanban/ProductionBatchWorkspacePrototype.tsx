"use client";

import Link from "next/link";

import {
  ChangeEvent,
  useMemo,
  useState,
} from "react";


type ReferenceFile = {
  name:
    string;

  originalName:
    string;

  url:
    string;

  mimeType:
    string;

  size:
    number;
};


type Item = {
  id:
    string;

  title:
    string;

  format:
    string;

  plannedDate:
    string | null;

  productionDeadline:
    string | null;

  briefing:
    string | null;

  caption:
    string | null;

  referenceFiles:
    ReferenceFile[];
};


function formatPublicationDate(
  value:
    string | null
) {
  if (!value) {
    return "Sem data";
  }

  const date =
    new Date(
      value
    );

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Maceio",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    }
  ).format(
    date
  );
}


function formatDeadline(
  value:
    string | null
) {
  if (!value) {
    return "Sem prazo definido";
  }

  const date =
    new Date(
      value
    );

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Maceio",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        false,
    }
  ).format(
    date
  );
}


function sizeLabel(
  bytes:
    number
) {
  if (
    !bytes ||
    bytes <=
      0
  ) {
    return "";
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${Math.max(
      1,
      Math.round(
        bytes /
        1024
      )
    )} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}


function isCarousel(
  format:
    string
) {
  return String(
    format ||
    ""
  )
    .toUpperCase()
    .includes(
      "CARROSSEL"
    );
}


function fileIdentity(
  file:
    File
) {
  return [
    file.name,
    file.size,
    file.lastModified,
  ].join(
    ":"
  );
}


export function ProductionBatchWorkspacePrototype({
  clientName,
  area,
  period,
  items,
}: {
  clientName:
    string;

  area:
    "DESIGN" | "FILMMAKER";

  period:
    string;

  items:
    Item[];
}) {
  const [
    files,
    setFiles,
  ] =
    useState<
      Record<
        string,
        File[]
      >
    >({});


  const [
    links,
    setLinks,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});


  const [
    sent,
    setSent,
  ] =
    useState(
      false
    );


  const [
    sending,
    setSending,
  ] =
    useState(
      false
    );


  const [
    sendMessage,
    setSendMessage,
  ] =
    useState(
      ""
    );


  const readyCount =
    useMemo(
      () =>
        items.filter(
          (
            item
          ) =>
            (
              (
                files[
                  item.id
                ] ||
                []
              ).length >
                0 ||
              Boolean(
                (
                  links[
                    item.id
                  ] ||
                  ""
                ).trim()
              )
            )
        ).length,
      [
        files,
        links,
        items,
      ]
    );


  const allReady =
    items.length >
      0 &&
    readyCount ===
      items.length;


  const totalFiles =
    Object.values(
      files
    ).reduce(
      (
        sum,
        list
      ) =>
        sum +
        list.length,
      0
    );


  const totalLinks =
    Object.values(
      links
    ).filter(
      (
        value
      ) =>
        Boolean(
          value.trim()
        )
    ).length;


  function addFiles(
    contentId:
      string,
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      Array.from(
        event.target.files ||
        []
      );


    setFiles(
      (
        current
      ) => {
        const existing =
          current[
            contentId
          ] ||
          [];

        const existingKeys =
          new Set(
            existing.map(
              fileIdentity
            )
          );

        const newFiles =
          selected.filter(
            (
              file
            ) =>
              !existingKeys.has(
                fileIdentity(
                  file
                )
              )
          );

        return {
          ...current,

          [contentId]: [
            ...existing,
            ...newFiles,
          ],
        };
      }
    );


    /*
     * Permite selecionar novamente o mesmo arquivo
     * depois de removê-lo.
     */
    event.target.value =
      "";


    setSent(
      false
    );
  }


  function removeFile(
    contentId:
      string,
    index:
      number
  ) {
    setFiles(
      (
        current
      ) => {
        const existing =
          current[
            contentId
          ] ||
          [];

        return {
          ...current,

          [contentId]:
            existing.filter(
              (
                _,
                fileIndex
              ) =>
                fileIndex !==
                index
            ),
        };
      }
    );


    setSent(
      false
    );
  }


  function updateLink(
    contentId:
      string,
    value:
      string
  ) {
    setLinks(
      (
        current
      ) => ({
        ...current,

        [contentId]:
          value,
      })
    );


    setSent(
      false
    );
  }


  async function sendPackage() {
    if (
      !allReady ||
      sending ||
      sent
    ) {
      return;
    }


    setSending(
      true
    );

    setSendMessage(
      "Preparando o pacote..."
    );


    try {
      const body =
        new FormData();


      body.append(
        "manifest",
        JSON.stringify(
          items.map(
            (
              item
            ) => ({
              id:
                item.id,
            })
          )
        )
      );


      for (
        const item
        of items
      ) {
        const selected =
          files[
            item.id
          ] ||
          [];


        for (
          const file
          of selected
        ) {
          body.append(
            "files:" +
              item.id,
            file
          );
        }


        const externalLink =
          (
            links[
              item.id
            ] ||
            ""
          ).trim();


        if (
          externalLink
        ) {
          body.append(
            "link:" +
              item.id,
            externalLink
          );
        }
      }


      setSendMessage(
        "Enviando materiais para o Supabase..."
      );


      const response =
        await fetch(
          "/api/pacotes-producao/finalizar",
          {
            method:
              "POST",

            body,
          }
        );


      const result =
        await response.json();


      if (
        !response.ok ||
        !result?.ok
      ) {
        throw new Error(
          result?.message ||
          "Nao foi possivel concluir o pacote."
        );
      }


      setSent(
        true
      );


      setSendMessage(
        "Pacote enviado ao Supabase e encaminhado para an\u00e1lise."
      );
    }
    catch (
      error
    ) {
      console.error(
        error
      );


      setSendMessage(
        "ERRO: " +
        (
          error instanceof Error
            ? error.message
            : "Falha ao enviar o pacote."
        )
      );
    }
    finally {
      setSending(
        false
      );
    }
  }


  return (
    <div className="space-y-4">

      {/* ===================================================
          CABECALHO
          =================================================== */}

      <section className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white p-5 shadow-sm">

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <span className="rounded-md bg-indigo-600 px-2 py-1 text-[8px] font-black uppercase tracking-[0.08em] text-white">
                Beta de produção
              </span>

              <span className="rounded-md border border-indigo-100 bg-white px-2 py-1 text-[8px] font-black uppercase text-indigo-600">
                {area ===
                "DESIGN"
                  ? "Design"
                  : "Filmmaker"}
              </span>

            </div>


            <h1 className="mt-3 text-2xl font-black text-slate-950">
              {clientName} • {period}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Todos os conteúdos aprovados para este pacote de produção.
            </p>

          </div>


          <div className="min-w-[210px] rounded-xl border border-slate-200 bg-white p-4">

            <div className="flex items-end justify-between gap-3">

              <div>

                <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
                  Materiais carregados
                </p>

                <p className="mt-1 text-2xl font-black text-slate-900">
                  {readyCount}/{items.length}
                </p>

              </div>

              <p className="text-[10px] font-black text-indigo-600">
                {totalFiles} arquivos
              </p>

            </div>


            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{
                  width:
                    `${
                      items.length
                        ? Math.round(
                            (
                              readyCount /
                              items.length
                            ) *
                              100
                          )
                        : 0
                    }%`,
                }}
              />

            </div>

          </div>

        </div>

      </section>


      {sent ? (

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">

          <p className="text-sm font-black text-emerald-700">
            Envio conclu?do.
          </p>

          <p className="mt-1 text-xs text-emerald-600">
            Materiais enviados ao Supabase e encaminhados para an\u00e1lise interna.
          </p>

        </div>

      ) : null}


      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">

        {/* ===================================================
            CONTEUDOS
            =================================================== */}

        <section className="space-y-3">

          {items.map(
            (
              item,
              index
            ) => {

              const selected =
                files[
                  item.id
                ] ||
                [];


              const carousel =
                isCarousel(
                  item.format
                );


              return (

                <article
                  key={
                    item.id
                  }
                  className={[
                    "overflow-hidden",
                    "rounded-xl",
                    "border",
                    "bg-white",
                    "shadow-sm",

                    selected.length >
                    0
                      ? "border-emerald-200 ring-1 ring-emerald-100"
                      : "border-slate-200",
                  ].join(
                    " "
                  )}
                >

                  {/* CABECALHO DO CONTEUDO */}

                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">

                    <div className="flex min-w-0 items-start gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">
                        {index +
                          1}
                      </div>


                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="rounded-md bg-blue-50 px-2 py-1 text-[8px] font-black text-blue-600">
                            Publicação: {formatPublicationDate(
                              item.plannedDate
                            )}
                          </span>


                          <span
                            className={[
                              "rounded-md",
                              "px-2",
                              "py-1",
                              "text-[8px]",
                              "font-black",

                              item.productionDeadline
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-600",
                            ].join(
                              " "
                            )}
                          >
                            Entrega: {formatDeadline(
                              item.productionDeadline
                            )}
                          </span>


                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[8px] font-black uppercase text-slate-500">
                            {item.format}
                          </span>


                          {carousel ? (
                            <span className="rounded-md bg-violet-50 px-2 py-1 text-[8px] font-black uppercase text-violet-600">
                              Múltiplos arquivos
                            </span>
                          ) : null}


                          {selected.length >
                          0 ? (
                            <span className="rounded-md bg-emerald-50 px-2 py-1 text-[8px] font-black uppercase text-emerald-600">
                              Material pronto
                            </span>
                          ) : null}

                        </div>


                        <h2 className="mt-2 text-base font-black text-slate-900">
                          {item.title}
                        </h2>

                      </div>

                    </div>


                    <Link
                      href={`/conteudos/${item.id}/visualizar`}
                      target="_blank"
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-black text-slate-600 hover:bg-slate-50"
                    >
                      Ver conteúdo original
                    </Link>

                  </div>


                  {/* CORPO */}

                  <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_370px]">

                    <div>

                      {/* BRIEFING */}

                      <p className="text-[9px] font-black uppercase tracking-[0.07em] text-slate-400">
                        Briefing / direcionamento
                      </p>

                      <div className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                        {item.briefing ||
                          "Nenhum briefing informado."}
                      </div>


                      {/* REFERENCIAS DA SOCIAL */}

                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">

                        <div className="flex items-center justify-between gap-3 px-3 py-3">

                          <div>

                            <p className="text-[9px] font-black uppercase tracking-[0.07em] text-slate-500">
                              Referências da Social Media
                            </p>

                            <p className="mt-0.5 text-[9px] text-slate-400">
                              Arquivos anexados pela Social para auxiliar na criação.
                            </p>

                          </div>


                          {item.referenceFiles.length >
                          0 ? (
                            <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-[8px] font-black text-blue-600">
                              {item.referenceFiles.length} anexo(s)
                            </span>
                          ) : null}

                        </div>


                        {item.referenceFiles.length >
                        0 ? (

                          <div className="border-t border-slate-100">

                            {item.referenceFiles
                              .slice(
                                0,
                                4
                              )
                              .map(
                                (
                                  reference
                                ) => (

                                  <div
                                    key={
                                      reference.url
                                    }
                                    className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0"
                                  >

                                    <a
                                      href={
                                        reference.url
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                                    >

                                      {reference.mimeType.startsWith(
                                        "image/"
                                      ) ? (

                                        <img
                                          src={
                                            reference.url
                                          }
                                          alt={
                                            reference.originalName
                                          }
                                          className="h-full w-full object-cover"
                                        />

                                      ) : (

                                        <span className="text-[8px] font-black text-slate-400">
                                          ARQ
                                        </span>

                                      )}

                                    </a>


                                    <div className="min-w-0 flex-1">

                                      <p
                                        className="truncate text-[10px] font-black text-slate-700"
                                        title={
                                          reference.originalName
                                        }
                                      >
                                        {reference.originalName ||
                                          reference.name}
                                      </p>


                                      <p className="mt-0.5 text-[8px] font-medium text-slate-400">
                                        {reference.size >
                                        0
                                          ? sizeLabel(
                                              reference.size
                                            )
                                          : "Arquivo de referência"}
                                      </p>

                                    </div>


                                    <div className="flex shrink-0 items-center gap-1.5">

                                      <a
                                        href={
                                          reference.url
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Abrir referência"
                                        className="flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-[8px] font-black text-slate-600 transition hover:bg-slate-50"
                                      >
                                        Abrir
                                      </a>


                                      <a
                                        href={`/api/conteudos/${item.id}/reference-download?url=${encodeURIComponent(
                                          reference.url
                                        )}`}
                                        title="Baixar referência"
                                        className="flex h-8 items-center justify-center rounded-md bg-blue-600 px-2.5 text-[8px] font-black text-white transition hover:bg-blue-700"
                                      >
                                        Baixar
                                      </a>

                                    </div>

                                  </div>

                                )
                              )}


                            {item.referenceFiles.length >
                            4 ? (

                              <details className="group">

                                <summary className="flex cursor-pointer list-none items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2.5 text-[9px] font-black text-slate-600 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">

                                  <span>
                                    Exibir todos os anexos ({item.referenceFiles.length - 4} ocultos)
                                  </span>

                                  <span className="text-[11px] text-slate-400 transition group-open:rotate-180">
                                    ▾
                                  </span>

                                </summary>


                                <div>

                                  {item.referenceFiles
                                    .slice(
                                      4
                                    )
                                    .map(
                                      (
                                        reference
                                      ) => (

                                        <div
                                          key={
                                            reference.url
                                          }
                                          className="flex items-center gap-3 border-t border-slate-100 px-3 py-2.5"
                                        >

                                          <a
                                            href={
                                              reference.url
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                                          >

                                            {reference.mimeType.startsWith(
                                              "image/"
                                            ) ? (

                                              <img
                                                src={
                                                  reference.url
                                                }
                                                alt={
                                                  reference.originalName
                                                }
                                                className="h-full w-full object-cover"
                                              />

                                            ) : (

                                              <span className="text-[8px] font-black text-slate-400">
                                                ARQ
                                              </span>

                                            )}

                                          </a>


                                          <div className="min-w-0 flex-1">

                                            <p
                                              className="truncate text-[10px] font-black text-slate-700"
                                              title={
                                                reference.originalName
                                              }
                                            >
                                              {reference.originalName ||
                                                reference.name}
                                            </p>

                                            <p className="mt-0.5 text-[8px] font-medium text-slate-400">
                                              {reference.size >
                                              0
                                                ? sizeLabel(
                                                    reference.size
                                                  )
                                                : "Arquivo de referência"}
                                            </p>

                                          </div>


                                          <div className="flex shrink-0 items-center gap-1.5">

                                            <a
                                              href={
                                                reference.url
                                              }
                                              target="_blank"
                                              rel="noreferrer"
                                              title="Abrir referência"
                                              className="flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-[8px] font-black text-slate-600 transition hover:bg-slate-50"
                                            >
                                              Abrir
                                            </a>

                                            <a
                                              href={`/api/conteudos/${item.id}/reference-download?url=${encodeURIComponent(
                                                reference.url
                                              )}`}
                                              title="Baixar referência"
                                              className="flex h-8 items-center justify-center rounded-md bg-blue-600 px-2.5 text-[8px] font-black text-white transition hover:bg-blue-700"
                                            >
                                              Baixar
                                            </a>

                                          </div>

                                        </div>

                                      )
                                    )}

                                </div>

                              </details>

                            ) : null}

                          </div>

                        ) : (

                          <div className="border-t border-slate-100 bg-slate-50 px-3 py-4 text-center">

                            <p className="text-[9px] font-semibold text-slate-400">
                              A Social Media não anexou referências neste conteúdo.
                            </p>

                          </div>

                        )}

                      </div>


                      {/* LEGENDA */}

                      {item.caption ? (

                        <>

                          <p className="mt-4 text-[9px] font-black uppercase tracking-[0.07em] text-slate-400">
                            Legenda
                          </p>

                          <div className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                            {item.caption}
                          </div>

                        </>

                      ) : null}

                    </div>


                    {/* =====================================
                        MATERIAL FINAL
                        ===================================== */}

                    <div className="self-start rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4">

                      <div className="flex items-start justify-between gap-2">

                        <div>

                          <p className="text-[10px] font-black text-slate-900">
                            Material final
                          </p>

                          <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
                            {carousel
                              ? "Carrossel: selecione todas as lâminas. Você pode adicionar mais arquivos em etapas."
                              : area === "FILMMAKER"
                                ? "Selecione o vídeo final e, se necessário, capa ou imagens adicionais."
                                : "Selecione a arte final deste conteúdo."}
                          </p>

                        </div>


                        {selected.length >
                        0 ? (
                          <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-1 text-[8px] font-black text-emerald-700">
                            {selected.length} arquivo(s)
                          </span>
                        ) : null}

                      </div>


                      <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg bg-indigo-600 px-3 py-3 text-[10px] font-black text-white hover:bg-indigo-700">

                        {selected.length >
                        0
                          ? "Adicionar mais arquivos"
                          : carousel
                            ? "Selecionar lâminas"
                            : "Selecionar arquivos"}

                        <input
                          type="file"
                          multiple
                          accept={
                            carousel
                              ? "image/*"
                              : area ===
                                  "FILMMAKER"
                                ? "video/*,image/*,application/pdf,.pdf"
                                : "image/*,application/pdf,.pdf"
                          }
                          className="hidden"
                          onChange={
                            (
                              event
                            ) =>
                              addFiles(
                                item.id,
                                event
                              )
                          }
                        />

                      </label>


                      {carousel ? (

                        <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-2">

                          <p className="text-[8px] font-bold leading-relaxed text-violet-700">
                            Carrossel aceita vários arquivos. Na versão final manteremos também a ordem das lâminas.
                          </p>

                        </div>

                      ) : null}


                      {selected.length >
                      0 ? (

                        <div className="mt-3 space-y-2">

                          {selected.map(
                            (
                              file,
                              fileIndex
                            ) => (

                              <div
                                key={`${fileIdentity(
                                  file
                                )}:${fileIndex}`}
                                className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-white p-2"
                              >

                                <div className="min-w-0 flex-1">

                                  <p className="truncate text-[9px] font-bold text-slate-700">
                                    {carousel
                                      ? `${fileIndex + 1}. ${file.name}`
                                      : file.name}
                                  </p>

                                  <p className="mt-0.5 text-[8px] text-slate-400">
                                    {sizeLabel(
                                      file.size
                                    )}
                                  </p>

                                </div>


                                <button
                                  type="button"
                                  onClick={
                                    () =>
                                      removeFile(
                                        item.id,
                                        fileIndex
                                      )
                                  }
                                  title="Remover arquivo"
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-red-100 bg-red-50 text-[14px] font-bold leading-none text-red-600 transition hover:bg-red-100"
                                >
                                  ×
                                </button>

                              </div>

                            )
                          )}

                        </div>

                      ) : (

                        <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-4 text-center">

                          <p className="text-[9px] font-semibold text-slate-400">
                            Nenhum arquivo selecionado.
                          </p>

                        </div>

                      )}


                      <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3">

                        <label className="block text-[8px] font-black uppercase tracking-[0.07em] text-blue-700">
                          Google Drive / arquivo externo
                        </label>

                        <p className="mt-1 text-[8px] leading-relaxed text-blue-600">
                          Se o arquivo estiver muito pesado, cole aqui o link compartilhado.
                        </p>

                        <input
                          type="url"
                          value={
                            links[
                              item.id
                            ] ||
                            ""
                          }
                          onChange={
                            (
                              event
                            ) =>
                              updateLink(
                                item.id,
                                event.target.value
                              )
                          }
                          placeholder="https://drive.google.com/..."
                          className="mt-2 h-9 w-full rounded-lg border border-blue-200 bg-white px-3 text-[9px] font-semibold text-slate-700 outline-none focus:border-blue-500"
                        />

                      </div>


                      <p className="mt-3 text-[8px] leading-relaxed text-indigo-500">
                        Os arquivos ser\u00e3o enviados ao Storage do AprovUp ao finalizar o pacote.
                      </p>

                    </div>

                  </div>

                </article>

              );
            }
          )}

        </section>


        {/* ===================================================
            FECHAMENTO
            =================================================== */}

        <aside>

          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">

            <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
              Fechamento do pacote
            </p>

            <h3 className="mt-2 text-lg font-black text-slate-900">
              Enviar todos juntos
            </h3>

            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
              O envio fica liberado somente quando todos os conteúdos tiverem pelo menos um arquivo final selecionado.
            </p>


            <div className="mt-4 rounded-xl bg-slate-50 p-3">

              <div className="flex items-center justify-between text-[10px]">

                <span className="font-semibold text-slate-500">
                  Prontos
                </span>

                <span className="font-black text-slate-900">
                  {readyCount}/{items.length}
                </span>

              </div>


              <div className="mt-2 flex items-center justify-between text-[10px]">

                <span className="font-semibold text-slate-500">
                  Arquivos
                </span>

                <span className="font-black text-slate-900">
                  {totalFiles}
                </span>

              </div>


              <div className="mt-2 flex items-center justify-between text-[10px]">

                <span className="font-semibold text-slate-500">
                  Links
                </span>

                <span className="font-black text-slate-900">
                  {totalLinks}
                </span>

              </div>

            </div>


            <button
              type="button"
              disabled={
                !allReady ||
                sending ||
                sent
              }
              onClick={
                sendPackage
              }
              className={[
                "mt-4",
                "flex",
                "h-11",
                "w-full",
                "items-center",
                "justify-center",
                "rounded-lg",
                "text-[10px]",
                "font-black",
                "transition",

                allReady
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "cursor-not-allowed bg-slate-100 text-slate-400",
              ].join(
                " "
              )}
            >
              {sending
                ? "Enviando pacote..."
                : sent
                  ? "Enviado para an\u00e1lise"
                  : "Enviar todos para an\u00e1lise"}
            </button>


            {sendMessage ? (
              <div
                className={[
                  "mt-3",
                  "rounded-lg",
                  "px-3",
                  "py-2",
                  "text-[9px]",
                  "font-bold",

                  sendMessage.startsWith(
                    "ERRO:"
                  )
                    ? "bg-red-50 text-red-700"
                    : sent
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-blue-50 text-blue-700",
                ].join(
                  " "
                )}
              >
                {sendMessage}
              </div>
            ) : null}


            {!allReady ? (

              <p className="mt-2 text-center text-[8px] font-semibold text-slate-400">
                Falta material em {items.length - readyCount} conteúdo(s).
              </p>

            ) : (

              <p className="mt-2 text-center text-[8px] font-bold text-emerald-600">
                Pacote completo e pronto para envio.
              </p>

            )}

          </div>

        </aside>

      </div>

    </div>
  );
}