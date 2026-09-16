import Link from "next/link";


type Area =
  | "DESIGN"
  | "FILMMAKER";


type BatchContent = {
  id:
    string;

  title:
    string;

  status?:
    | string
    | null;

  format?:
    | string
    | null;

  plannedDate?:
    | Date
    | string
    | null;

  productionDeadline?:
    | Date
    | string
    | null;

  client?: {
    id?:
      string;

    name?:
      | string
      | null;

    logoUrl?:
      | string
      | null;
  } | null;
};


function dateParts(
  value?:
    | Date
    | string
    | null
) {
  if (!value) {
    return null;
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
    return null;
  }

  const parts =
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
          "numeric",
      }
    ).formatToParts(
      date
    );

  const get =
    (
      type:
        string
    ) =>
      parts.find(
        (
          part
        ) =>
          part.type ===
          type
      )?.value ||
      "";

  return {
    day:
      get(
        "day"
      ),

    month:
      get(
        "month"
      ),

    year:
      get(
        "year"
      ),
  };
}


function periodOf(
  value?:
    | Date
    | string
    | null
) {
  const parts =
    dateParts(
      value
    );

  if (!parts) {
    return {
      key:
        "SEM_DATA",

      month:
        "0",

      year:
        "0",

      label:
        "Sem período",
    };
  }

  const months = [
    "",
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

  const monthNumber =
    Number(
      parts.month
    );

  return {
    key:
      `${parts.year}-${parts.month}`,

    month:
      String(
        monthNumber
      ),

    year:
      parts.year,

    label:
      `${months[monthNumber] || "Mês"} ${parts.year}`,
  };
}


function formatDate(
  value?:
    | Date
    | string
    | null
) {
  const parts =
    dateParts(
      value
    );

  if (!parts) {
    return "Sem data";
  }

  return `${parts.day}/${parts.month}`;
}


function deadlineLabel(
  value?:
    | Date
    | string
    | null
) {
  const parts =
    dateParts(
      value
    );

  if (!parts) {
    return "Sem prazo";
  }

  return `${parts.day}/${parts.month}`;
}


function initials(
  value?:
    | string
    | null
) {
  return String(
    value ||
    "Cliente"
  )
    .split(
      /\s+/
    )
    .filter(
      Boolean
    )
    .slice(
      0,
      2
    )
    .map(
      (
        part
      ) =>
        part.charAt(
          0
        )
    )
    .join(
      ""
    )
    .toUpperCase();
}


export function ProductionBatchKanbanPrototype({
  contents,
  area,
}: {
  contents:
    BatchContent[];

  area:
    Area;
}) {
  /*
   * Neste protótipo o pacote representa apenas
   * conteúdos recém-aprovados na Etapa 1.
   */
  const approved =
    contents.filter(
      (
        item
      ) =>
        item.status ===
          "APROVADO" &&
        item.format !==
          "DEMANDA_EMERGENCIAL" &&
        !(
          area ===
            "DESIGN" &&
          item.format ===
            "DESIGN_GRAFICO"
        )
    );


  const emergencies =
    contents.filter(
      (
        item
      ) =>
        item.status ===
          "APROVADO" &&
        item.format ===
          "DEMANDA_EMERGENCIAL"
    );


  const groups =
    new Map<
      string,
      {
        clientId:
          string;

        clientName:
          string;

        clientLogo:
          string;

        month:
          string;

        year:
          string;

        period:
          string;

        items:
          BatchContent[];
      }
    >();


  for (
    const item
    of approved
  ) {
    const clientId =
      item.client?.id ||
      "SEM_CLIENTE";

    const clientName =
      item.client?.name ||
      "Cliente";

    const period =
      periodOf(
        item.plannedDate
      );

    const key =
      `${clientId}:${period.key}`;


    const existing =
      groups.get(
        key
      );

    if (existing) {
      existing.items.push(
        item
      );

      continue;
    }


    groups.set(
      key,
      {
        clientId,

        clientName,

        clientLogo:
          item.client?.logoUrl ||
          "",

        month:
          period.month,

        year:
          period.year,

        period:
          period.label,

        items: [
          item,
        ],
      }
    );
  }


  const packages =
    Array.from(
      groups.values()
    )
      .map(
        (
          group
        ) => ({
          ...group,

          items:
            [...group.items]
              .sort(
                (
                  a,
                  b
                ) => {
                  const aTime =
                    a.plannedDate
                      ? new Date(
                          a.plannedDate
                        ).getTime()
                      : Number.MAX_SAFE_INTEGER;

                  const bTime =
                    b.plannedDate
                      ? new Date(
                          b.plannedDate
                        ).getTime()
                      : Number.MAX_SAFE_INTEGER;

                  return (
                    aTime -
                    bTime
                  );
                }
              ),
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          a.clientName.localeCompare(
            b.clientName,
            "pt-BR"
          )
      );


  return (
    <>
      {/* PACOTES MENSAIS */}
      <div className="flex w-[292px] shrink-0 flex-col overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50/30">
        <div className="border-b border-indigo-100 bg-white px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />

            <h3 className="text-[11px] font-black text-slate-900">
              Pacotes mensais
            </h3>

            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[8px] font-black text-indigo-600">
              {packages.length}
            </span>
          </div>

          <p className="mt-1 text-[8px] text-slate-400">
            Um card por cliente e mês.
          </p>
        </div>


        <div className="h-[540px] space-y-3 overflow-y-auto overscroll-contain p-3 pr-2 [scrollbar-gutter:stable] [scrollbar-width:thin]">
          {packages.length ===
          0 ? (
            <div className="flex min-h-[130px] items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-white/70 px-4 text-center">
              <p className="text-[9px] font-semibold text-slate-400">
                Nenhum pacote aguardando produção.
              </p>
            </div>
          ) : (
            packages.map(
              (
                batch
              ) => {
                const first =
                  batch.items[0];

                return (
                  <article
                    key={`${batch.clientId}:${batch.month}:${batch.year}`}
                    className="overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-indigo-100 bg-indigo-50/70 p-3">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-indigo-100 bg-white">
                          {batch.clientLogo ? (
                            <img
                              src={
                                batch.clientLogo
                              }
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-[9px] font-black text-indigo-600">
                              {initials(
                                batch.clientName
                              )}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-black text-slate-900">
                            {batch.clientName}
                          </p>

                          <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.06em] text-indigo-600">
                            {batch.period}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-md bg-white px-2 py-1 text-[7px] font-black text-indigo-600 shadow-sm">
                          {batch.items.length}
                        </span>
                      </div>
                    </div>


                    <div className="p-3">
                      <p className="text-[8px] font-bold uppercase tracking-[0.06em] text-slate-400">
                        Conteúdos para produzir
                      </p>

                      <div className="mt-2 space-y-1.5">
                        {batch.items
                          .slice(
                            0,
                            4
                          )
                          .map(
                            (
                              item
                            ) => (
                              <div
                                key={
                                  item.id
                                }
                                className="flex items-center gap-2 text-[8px]"
                              >
                                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-black text-slate-500">
                                  {formatDate(
                                    item.plannedDate
                                  )}
                                </span>

                                <span className="truncate font-semibold text-slate-600">
                                  {item.title}
                                </span>
                              </div>
                            )
                          )}

                        {batch.items.length >
                        4 ? (
                          <p className="pt-1 text-[8px] font-bold text-indigo-500">
                            + {batch.items.length - 4} conteúdos
                          </p>
                        ) : null}
                      </div>


                      <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                        <p className="text-[7px] font-black uppercase text-slate-400">
                          Primeira publicação
                        </p>

                        <p className="mt-0.5 truncate text-[9px] font-black text-slate-700">
                          {first
                            ? `${formatDate(
                                first.plannedDate
                              )} • ${first.title}`
                            : "Sem data"}
                        </p>
                      </div>


                      <Link
                        href={
                          `/pacotes-producao/prototipo?cliente=${encodeURIComponent(
                            batch.clientId
                          )}&area=${area}&mes=${batch.month}&ano=${batch.year}`
                        }
                        className="mt-3 flex h-9 items-center justify-center rounded-lg bg-slate-950 text-[9px] font-black text-white transition hover:bg-indigo-700"
                      >
                        Abrir pacote
                      </Link>
                    </div>
                  </article>
                );
              }
            )
          )}
        </div>
      </div>


      {/* DEMANDAS EMERGENCIAIS */}
      <div className="flex w-[292px] shrink-0 flex-col overflow-hidden rounded-xl border border-red-200 bg-red-50/30">
        <div className="border-b border-red-100 bg-white px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-600" />

            <h3 className="text-[11px] font-black text-slate-900">
              Emergenciais
            </h3>

            <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[8px] font-black text-red-600">
              {emergencies.length}
            </span>
          </div>

          <p className="mt-1 text-[8px] text-red-400">
            Prioridade máxima.
          </p>
        </div>


        <div className="h-[540px] space-y-3 overflow-y-auto overscroll-contain p-3 pr-2 [scrollbar-gutter:stable] [scrollbar-width:thin]">
          {emergencies.length ===
          0 ? (
            <div className="flex min-h-[130px] items-center justify-center rounded-xl border border-dashed border-red-200 bg-white/70 px-4 text-center">
              <p className="text-[9px] font-semibold text-slate-400">
                Nenhuma emergência agora.
              </p>
            </div>
          ) : (
            emergencies.map(
              (
                item
              ) => (
                <article
                  key={
                    item.id
                  }
                  className="overflow-hidden rounded-xl border-2 border-red-300 bg-white shadow-sm ring-2 ring-red-50"
                >
                  <div className="bg-red-600 px-3 py-2 text-[8px] font-black uppercase tracking-[0.07em] text-white">
                    Demanda emergencial
                  </div>

                  <div className="p-3">
                    <p className="text-[9px] font-bold text-red-600">
                      {item.client?.name || "Cliente"}
                    </p>

                    <p className="mt-1.5 line-clamp-3 text-[11px] font-black leading-snug text-slate-900">
                      {item.title}
                    </p>

                    <div className="mt-3 rounded-lg bg-red-50 px-2.5 py-2">
                      <p className="text-[7px] font-black uppercase text-red-400">
                        Entrega
                      </p>

                      <p className="mt-0.5 text-[9px] font-black text-red-700">
                        {deadlineLabel(
                          item.productionDeadline
                        )}
                      </p>
                    </div>

                    <Link
                      href={`/conteudos/${item.id}/visualizar`}
                      className="mt-3 flex h-9 items-center justify-center rounded-lg bg-red-600 text-[9px] font-black text-white hover:bg-red-700"
                    >
                      Abrir emergência
                    </Link>
                  </div>
                </article>
              )
            )
          )}
        </div>
      </div>
    </>
  );
}