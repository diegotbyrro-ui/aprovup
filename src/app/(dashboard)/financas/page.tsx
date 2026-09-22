import Link from "next/link";

import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Landmark,
  Plus,
  ReceiptText,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";

import {
  prisma,
} from "@/lib/prisma";

import {
  requirePermission,
} from "@/lib/userAccess";

import {
  createFinanceEntryAction,
  reopenFinanceEntryAction,
  settleFinanceEntryAction,
} from "./actions";


export const dynamic =
  "force-dynamic";


const currency =
  new Intl.NumberFormat(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL",
    }
  );


const monthFormatter =
  new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Maceio",

      month:
        "long",

      year:
        "numeric",
    }
  );


const shortMonthFormatter =
  new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Maceio",

      month:
        "short",
    }
  );


const dateFormatter =
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
  );


function formatMoney(
  cents:
    number
) {
  return currency.format(
    cents /
    100
  );
}


function currentPeriodKey() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "America/Maceio",

        year:
          "numeric",

        month:
          "2-digit",
      }
    ).formatToParts(
      new Date()
    );


  const year =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "year"
    )?.value;


  const month =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "month"
    )?.value;


  return (
    year &&
    month
      ? year +
        "-" +
        month
      : "2026-09"
  );
}


function validPeriod(
  value?:
    string
) {
  if (
    value &&
    /^\d{4}-\d{2}$/.test(
      value
    )
  ) {
    const month =
      Number(
        value.slice(
          5,
          7
        )
      );


    if (
      month >=
        1 &&
      month <=
        12
    ) {
      return value;
    }
  }


  return currentPeriodKey();
}


function monthRange(
  period:
    string
) {
  const year =
    Number(
      period.slice(
        0,
        4
      )
    );


  const month =
    Number(
      period.slice(
        5,
        7
      )
    );


  const start =
    new Date(
      Date.UTC(
        year,
        month -
          1,
        1,
        3,
        0,
        0
      )
    );


  const end =
    new Date(
      Date.UTC(
        year,
        month,
        1,
        3,
        0,
        0
      )
    );


  return {
    start,
    end,
  };
}


function shiftPeriod(
  period:
    string,
  offset:
    number
) {
  const year =
    Number(
      period.slice(
        0,
        4
      )
    );


  const month =
    Number(
      period.slice(
        5,
        7
      )
    );


  const date =
    new Date(
      Date.UTC(
        year,
        month -
          1 +
          offset,
        15,
        15,
        0,
        0
      )
    );


  return (
    String(
      date.getUTCFullYear()
    ) +
    "-" +
    String(
      date.getUTCMonth() +
        1
    ).padStart(
      2,
      "0"
    )
  );
}


function sum(
  values:
    number[]
) {
  return values.reduce(
    (
      total,
      value
    ) =>
      total +
      value,
    0
  );
}


function statusInfo(
  status:
    string,
  dueDate:
    Date
) {
  if (
    status ===
    "PAGO"
  ) {
    return {
      label:
        "Pago",

      className:
        "bg-emerald-50 text-emerald-700",
    };
  }


  if (
    dueDate.getTime() <
    Date.now()
  ) {
    return {
      label:
        "Atrasado",

      className:
        "bg-red-50 text-red-700",
    };
  }


  return {
    label:
      "Pendente",

    className:
      "bg-amber-50 text-amber-700",
  };
}


function FinanceCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label:
    string;

  value:
    string;

  helper:
    string;

  icon:
    React.ReactNode;

  tone:
    "blue" |
    "green" |
    "amber" |
    "violet" |
    "red" |
    "slate";
}) {

  const tones = {
    blue:
      "bg-blue-50 text-blue-600",

    green:
      "bg-emerald-50 text-emerald-600",

    amber:
      "bg-amber-50 text-amber-600",

    violet:
      "bg-violet-50 text-violet-600",

    red:
      "bg-red-50 text-red-600",

    slate:
      "bg-slate-100 text-slate-600",
  };


  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 truncate text-[25px] font-black tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-[10px] font-semibold text-slate-400">
            {helper}
          </p>

        </div>

        <div className={
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " +
          tones[
            tone
          ]
        }>
          {icon}
        </div>

      </div>

    </article>
  );
}


type Entry = {
  id:
    string;

  type:
    string;

  description:
    string;

  category:
    string |
    null;

  amountCents:
    number;

  dueDate:
    Date;

  status:
    string;

  paidAt:
    Date |
    null;

  isRecurring:
    boolean;

  installmentNumber:
    number |
    null;

  installmentTotal:
    number |
    null;

  client: {
    id:
      string;

    name:
      string;
  } |
    null;
};


function FinanceEntryRow({
  entry,
  returnTo,
}: {
  entry:
    Entry;

  returnTo:
    string;
}) {

  const status =
    statusInfo(
      entry.status,
      entry.dueDate
    );


  return (
    <div className="grid gap-3 rounded-xl border border-slate-100 bg-white p-3 md:grid-cols-[minmax(0,1.5fr)_130px_130px_110px_auto] md:items-center">

      <div className="min-w-0">

        <div className="flex flex-wrap items-center gap-2">

          <p className="truncate text-[10px] font-black text-slate-900">
            {entry.description}
          </p>

          {
            entry.isRecurring
              ? (
                <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-[7px] font-black text-violet-600">
                  RECORRENTE
                  {
                    entry.installmentNumber &&
                    entry.installmentTotal
                      ? " " +
                        entry.installmentNumber +
                        "/" +
                        entry.installmentTotal
                      : ""
                  }
                </span>
              )
              : null
          }

        </div>

        <p className="mt-1 truncate text-[8px] font-semibold text-slate-400">
          {
            entry.client
              ?.name ||
            "Sem cliente"
          }
          {
            entry.category
              ? " • " +
                entry.category
              : ""
          }
        </p>

      </div>


      <div>

        <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">
          Vencimento
        </p>

        <p className="mt-1 text-[9px] font-black text-slate-700">
          {
            dateFormatter.format(
              entry.dueDate
            )
          }
        </p>

      </div>


      <div>

        <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">
          Valor
        </p>

        <p className={
          "mt-1 text-[10px] font-black " +
          (
            entry.type ===
            "RECEITA"
              ? "text-emerald-600"
              : "text-red-600"
          )
        }>
          {
            entry.type ===
            "RECEITA"
              ? "+"
              : "-"
          }
          {
            formatMoney(
              entry.amountCents
            )
          }
        </p>

      </div>


      <div>

        <span className={
          "inline-flex rounded-full px-2 py-1 text-[8px] font-black " +
          status.className
        }>
          {status.label}
        </span>

      </div>


      <div className="flex justify-end">

        {
          entry.status ===
          "PAGO"
            ? (
              <form
                action={
                  reopenFinanceEntryAction.bind(
                    null,
                    entry.id
                  )
                }
              >
                <input
                  type="hidden"
                  name="returnTo"
                  value={
                    returnTo
                  }
                />

                <button
                  type="submit"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-[8px] font-black text-slate-500 hover:bg-slate-50"
                >
                  Reabrir
                </button>
              </form>
            )
            : (
              <form
                action={
                  settleFinanceEntryAction.bind(
                    null,
                    entry.id
                  )
                }
              >
                <input
                  type="hidden"
                  name="returnTo"
                  value={
                    returnTo
                  }
                />

                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[8px] font-black text-white hover:bg-emerald-700"
                >
                  <CheckCircle2
                    size={11}
                  />

                  {
                    entry.type ===
                    "RECEITA"
                      ? "Recebido"
                      : "Pago"
                  }
                </button>
              </form>
            )
        }

      </div>

    </div>
  );
}


export default async function FinancePage({
  searchParams,
}: {
  searchParams?:
    Promise<{
      aba?:
        string;

      periodo?:
        string;

      ok?:
        string;

      erro?:
        string;
    }>;
}) {

  const user =
    await requirePermission(
      "settings.manage"
    );


  const params =
    searchParams
      ? await searchParams
      : {};


  const tab =
    [
      "dashboard",
      "receber",
      "pagar",
      "fluxo",
      "relatorios",
    ].includes(
      String(
        params.aba ||
        ""
      )
    )
      ? String(
          params.aba
        )
      : "dashboard";


  const period =
    validPeriod(
      params.periodo
    );


  const {
    start,
    end,
  } =
    monthRange(
      period
    );


  const [
    clients,
    entries,
  ] =
    await Promise.all([
      prisma.client
        .findMany({
          where: {
            agencyId:
              user.agencyId,
          },

          select: {
            id:
              true,

            name:
              true,
          },

          orderBy: {
            name:
              "asc",
          },
        }),

      prisma.financeEntry
        .findMany({
          where: {
            agencyId:
              user.agencyId,
          },

          include: {
            client: {
              select: {
                id:
                  true,

                name:
                  true,
              },
            },
          },

          orderBy: [
            {
              dueDate:
                "asc",
            },

            {
              createdAt:
                "asc",
            },
          ],

          take:
            1000,
        }),
    ]);


  const monthEntries =
    entries.filter(
      (
        entry
      ) =>
        entry.dueDate >=
          start &&
        entry.dueDate <
          end
    );


  const revenues =
    monthEntries.filter(
      (
        entry
      ) =>
        entry.type ===
        "RECEITA"
    );


  const expenses =
    monthEntries.filter(
      (
        entry
      ) =>
        entry.type ===
        "DESPESA"
    );


  const revenueTotal =
    sum(
      revenues.map(
        (
          entry
        ) =>
          entry.amountCents
      )
    );


  const receivedTotal =
    sum(
      revenues
        .filter(
          (
            entry
          ) =>
            entry.status ===
            "PAGO"
        )
        .map(
          (
            entry
          ) =>
            entry.amountCents
        )
    );


  const receivableTotal =
    sum(
      revenues
        .filter(
          (
            entry
          ) =>
            entry.status !==
            "PAGO"
        )
        .map(
          (
            entry
          ) =>
            entry.amountCents
        )
    );


  const expenseTotal =
    sum(
      expenses.map(
        (
          entry
        ) =>
          entry.amountCents
      )
    );


  const result =
    revenueTotal -
    expenseTotal;


  const margin =
    revenueTotal >
      0
      ? (
          result /
          revenueTotal
        ) *
        100
      : 0;


  const recurringRevenue =
    sum(
      revenues
        .filter(
          (
            entry
          ) =>
            entry.isRecurring
        )
        .map(
          (
            entry
          ) =>
            entry.amountCents
        )
    );


  const revenueClientIds =
    new Set(
      revenues
        .map(
          (
            entry
          ) =>
            entry.clientId
        )
        .filter(
          Boolean
        )
    );


  const averageTicket =
    revenueClientIds.size >
      0
      ? Math.round(
          revenueTotal /
          revenueClientIds.size
        )
      : 0;


  const now =
    new Date();


  const sevenDays =
    new Date(
      now.getTime() +
      7 *
        24 *
        60 *
        60 *
        1000
    );


  const upcoming =
    entries
      .filter(
        (
          entry
        ) =>
          entry.status !==
            "PAGO" &&
          entry.dueDate >=
            now &&
          entry.dueDate <=
            sevenDays
      )
      .slice(
        0,
        8
      );


  const upcomingReceivable =
    sum(
      upcoming
        .filter(
          (
            entry
          ) =>
            entry.type ===
            "RECEITA"
        )
        .map(
          (
            entry
          ) =>
            entry.amountCents
        )
    );


  const upcomingPayable =
    sum(
      upcoming
        .filter(
          (
            entry
          ) =>
            entry.type ===
            "DESPESA"
        )
        .map(
          (
            entry
          ) =>
            entry.amountCents
        )
    );


  const overdue =
    entries.filter(
      (
        entry
      ) =>
        entry.status !==
          "PAGO" &&
        entry.dueDate <
          now
    );


  const overdueRevenue =
    overdue.filter(
      (
        entry
      ) =>
        entry.type ===
        "RECEITA"
    );


  const overdueRevenueTotal =
    sum(
      overdueRevenue.map(
        (
          entry
        ) =>
          entry.amountCents
      )
    );


  const revenueByClient =
    new Map<
      string,
      {
        name:
          string;

        value:
          number;
      }
    >();


  for (
    const entry
    of revenues
  ) {
    if (
      !entry.client
    ) {
      continue;
    }


    const current =
      revenueByClient.get(
        entry.client.id
      );


    revenueByClient.set(
      entry.client.id,
      {
        name:
          entry.client.name,

        value:
          (
            current
              ?.value ||
            0
          ) +
          entry.amountCents,
      }
    );
  }


  const topClients =
    Array.from(
      revenueByClient.values()
    )
      .sort(
        (
          a,
          b
        ) =>
          b.value -
          a.value
      )
      .slice(
        0,
        5
      );


  const graphData =
    Array.from(
      {
        length:
          6,
      },
      (
        _,
        index
      ) => {
        const key =
          shiftPeriod(
            period,
            index -
              5
          );


        const range =
          monthRange(
            key
          );


        const monthItems =
          entries.filter(
            (
              entry
            ) =>
              entry.dueDate >=
                range.start &&
              entry.dueDate <
                range.end
          );


        return {
          key,

          label:
            shortMonthFormatter
              .format(
                range.start
              )
              .replace(
                ".",
                ""
              ),

          income:
            sum(
              monthItems
                .filter(
                  (
                    entry
                  ) =>
                    entry.type ===
                    "RECEITA"
                )
                .map(
                  (
                    entry
                  ) =>
                    entry.amountCents
                )
            ),

          expenses:
            sum(
              monthItems
                .filter(
                  (
                    entry
                  ) =>
                    entry.type ===
                    "DESPESA"
                )
                .map(
                  (
                    entry
                  ) =>
                    entry.amountCents
                )
            ),
        };
      }
    );


  const graphMax =
    Math.max(
      1,
      ...graphData.map(
        (
          item
        ) =>
          Math.max(
            item.income,
            item.expenses
          )
      )
    );


  const returnTo =
    "/financas?aba=" +
    encodeURIComponent(
      tab
    ) +
    "&periodo=" +
    encodeURIComponent(
      period
    );


  const categories =
    new Map<
      string,
      {
        income:
          number;

        expense:
          number;
      }
    >();


  for (
    const entry
    of monthEntries
  ) {
    const key =
      entry.category ||
      "Sem categoria";


    const current =
      categories.get(
        key
      ) || {
        income:
          0,

        expense:
          0,
      };


    if (
      entry.type ===
      "RECEITA"
    ) {
      current.income +=
        entry.amountCents;
    }
    else {
      current.expense +=
        entry.amountCents;
    }


    categories.set(
      key,
      current
    );
  }


  const tabItems = [
    {
      key:
        "dashboard",

      label:
        "Dashboard",
    },
    {
      key:
        "receber",

      label:
        "A receber",
    },
    {
      key:
        "pagar",

      label:
        "A pagar",
    },
    {
      key:
        "fluxo",

      label:
        "Fluxo de caixa",
    },
    {
      key:
        "relatorios",

      label:
        "Relatórios",
    },
  ];


  return (
    <div className="space-y-5">

      <section className="overflow-hidden rounded-3xl bg-slate-950 px-6 py-6 text-white shadow-sm sm:px-8">

        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

          <div>

            <div className="flex flex-wrap items-center gap-2">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-blue-200">
                <WalletCards
                  size={18}
                />
              </div>

              <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-blue-200">
                Financeiro gerencial
              </span>

            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight">
              Finanças
            </h1>

            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-slate-300">
              Receitas, despesas, vencimentos, fluxo de caixa e resultado financeiro da agência.
            </p>

          </div>


          <div className="flex flex-wrap items-center gap-2">

            <form className="flex items-center gap-2">

              <input
                type="hidden"
                name="aba"
                value={
                  tab
                }
              />

              <input
                type="month"
                name="periodo"
                defaultValue={
                  period
                }
                className="h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-[10px] font-black text-white [color-scheme:dark]"
              />

              <button
                type="submit"
                className="h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-[9px] font-black"
              >
                Aplicar
              </button>

            </form>

          </div>

        </div>

      </section>


      {
        params.ok ===
        "1"
          ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] font-black text-emerald-700">
              Lançamento criado com sucesso.
            </div>
          )
          : null
      }


      {
        params.erro ===
        "1"
          ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-black text-red-700">
              Não foi possível criar o lançamento. Confira os campos obrigatórios.
            </div>
          )
          : null
      }


      <section className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">

        {
          tabItems.map(
            (
              item
            ) => (
              <Link
                key={
                  item.key
                }
                href={
                  "/financas?aba=" +
                  item.key +
                  "&periodo=" +
                  period
                }
                className={
                  tab ===
                  item.key
                    ? "shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-[10px] font-black text-white"
                    : "shrink-0 rounded-xl px-4 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-50"
                }
              >
                {item.label}
              </Link>
            )
          )
        }

      </section>


      <details className="group rounded-2xl border border-blue-200 bg-blue-50/30 shadow-sm">

        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Plus
                size={16}
              />
            </div>

            <div>

              <p className="text-[11px] font-black text-slate-900">
                Novo lançamento
              </p>

              <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
                Cadastre uma receita ou despesa.
              </p>

            </div>

          </div>

          <ChevronDown
            size={16}
            className="text-slate-400 transition group-open:rotate-180"
          />

        </summary>


        <form
          action={
            createFinanceEntryAction
          }
          className="grid gap-4 border-t border-blue-100 bg-white p-5 md:grid-cols-2 xl:grid-cols-4"
        >

          <input
            type="hidden"
            name="returnTo"
            value={
              returnTo
            }
          />


          <label className="space-y-1.5">

            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              Tipo *
            </span>

            <select
              name="type"
              required
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="RECEITA">
                Receita
              </option>

              <option value="DESPESA">
                Despesa
              </option>
            </select>

          </label>


          <label className="space-y-1.5 xl:col-span-2">

            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              Descrição *
            </span>

            <input
              name="description"
              required
              placeholder="Ex.: Mensalidade Rocha Empreendimentos"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-blue-500"
            />

          </label>


          <label className="space-y-1.5">

            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              Valor *
            </span>

            <input
              name="amount"
              required
              inputMode="decimal"
              placeholder="2500,00"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-blue-500"
            />

          </label>


          <label className="space-y-1.5">

            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              Vencimento *
            </span>

            <input
              type="date"
              name="dueDate"
              required
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-blue-500"
            />

          </label>


          <label className="space-y-1.5">

            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              Cliente
            </span>

            <select
              name="clientId"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-blue-500"
            >

              <option value="">
                Sem cliente
              </option>

              {
                clients.map(
                  (
                    client
                  ) => (
                    <option
                      key={
                        client.id
                      }
                      value={
                        client.id
                      }
                    >
                      {client.name}
                    </option>
                  )
                )
              }

            </select>

          </label>


          <label className="space-y-1.5">

            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              Categoria
            </span>

            <select
              name="category"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="">
                Sem categoria
              </option>

              <option>Mensalidade</option>
              <option>Projeto avulso</option>
              <option>Serviço extra</option>
              <option>Equipe</option>
              <option>Terceirizados</option>
              <option>Ferramentas</option>
              <option>Aluguel</option>
              <option>Impostos</option>
              <option>Tráfego</option>
              <option>Equipamentos</option>
              <option>Transporte</option>
              <option>Outros</option>
            </select>

          </label>


          <label className="space-y-1.5">

            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              Forma de pagamento
            </span>

            <select
              name="paymentMethod"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="">
                Não informado
              </option>

              <option>Pix</option>
              <option>Boleto</option>
              <option>Transferência</option>
              <option>Cartão</option>
              <option>Dinheiro</option>
              <option>Outro</option>
            </select>

          </label>


          <label className="space-y-1.5 md:col-span-2 xl:col-span-3">

            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              Observações
            </span>

            <input
              name="notes"
              placeholder="Informações adicionais..."
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-blue-500"
            />

          </label>


          <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">

            <label className="flex cursor-pointer items-center gap-2">

              <input
                type="checkbox"
                name="isRecurring"
                className="h-4 w-4 rounded"
              />

              <span className="text-[9px] font-black text-violet-700">
                Repetir mensalmente
              </span>

            </label>

            <input
              type="number"
              name="installments"
              min="2"
              max="24"
              defaultValue="12"
              className="mt-2 h-8 w-full rounded-lg border border-violet-100 bg-white px-2 text-[9px] font-bold text-slate-600"
            />

            <p className="mt-1 text-[7px] font-semibold text-violet-400">
              Quantidade de meses.
            </p>

          </div>


          <div className="flex items-end md:col-span-2 xl:col-span-4">

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-[9px] font-black text-white hover:bg-blue-700"
            >
              <Plus
                size={13}
              />

              Criar lançamento
            </button>

          </div>

        </form>

      </details>


      {
        tab ===
        "dashboard"
          ? (
            <>

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">

                <FinanceCard
                  label="Faturamento"
                  value={
                    formatMoney(
                      revenueTotal
                    )
                  }
                  helper={
                    revenues.length +
                    " lançamento(s)"
                  }
                  icon={
                    <CircleDollarSign
                      size={18}
                    />
                  }
                  tone="blue"
                />

                <FinanceCard
                  label="Recebido"
                  value={
                    formatMoney(
                      receivedTotal
                    )
                  }
                  helper={
                    revenueTotal >
                    0
                      ? (
                          (
                            receivedTotal /
                            revenueTotal
                          ) *
                          100
                        ).toFixed(
                          1
                        ) +
                        "% do faturamento"
                      : "Sem receita no período"
                  }
                  icon={
                    <ArrowDownRight
                      size={18}
                    />
                  }
                  tone="green"
                />

                <FinanceCard
                  label="A receber"
                  value={
                    formatMoney(
                      receivableTotal
                    )
                  }
                  helper={
                    revenues.filter(
                      (
                        item
                      ) =>
                        item.status !==
                        "PAGO"
                    ).length +
                    " pendência(s)"
                  }
                  icon={
                    <Clock3
                      size={18}
                    />
                  }
                  tone="amber"
                />

                <FinanceCard
                  label="Despesas"
                  value={
                    formatMoney(
                      expenseTotal
                    )
                  }
                  helper={
                    expenses.length +
                    " lançamento(s)"
                  }
                  icon={
                    <ArrowUpRight
                      size={18}
                    />
                  }
                  tone="red"
                />

                <FinanceCard
                  label="Resultado"
                  value={
                    formatMoney(
                      result
                    )
                  }
                  helper="Receita menos despesas"
                  icon={
                    <TrendingUp
                      size={18}
                    />
                  }
                  tone="violet"
                />

                <FinanceCard
                  label="Margem"
                  value={
                    margin.toFixed(
                      1
                    ) +
                    "%"
                  }
                  helper="Resultado sobre faturamento"
                  icon={
                    <BarChart3
                      size={18}
                    />
                  }
                  tone="slate"
                />

              </section>


              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.7fr)]">

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div>

                    <p className="text-[11px] font-black text-slate-950">
                      Evolução financeira
                    </p>

                    <p className="mt-1 text-[9px] font-semibold text-slate-400">
                      Receitas x despesas dos Últimos 6 meses
                    </p>

                  </div>


                  <div className="mt-5 flex items-center gap-4 text-[8px] font-black text-slate-400">

                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-600" />
                      Receita
                    </span>

                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                      Despesas
                    </span>

                  </div>


                  <div className="mt-7 flex h-[220px] items-end gap-4 border-b border-slate-100 px-2">

                    {
                      graphData.map(
                        (
                          item
                        ) => (
                          <div
                            key={
                              item.key
                            }
                            className="flex h-full min-w-0 flex-1 flex-col justify-end"
                          >

                            <div className="flex flex-1 items-end justify-center gap-1.5">

                              <div
                                title={
                                  formatMoney(
                                    item.income
                                  )
                                }
                                className="w-[38%] rounded-t-lg bg-blue-600"
                                style={{
                                  height:
                                    Math.max(
                                      2,
                                      (
                                        item.income /
                                        graphMax
                                      ) *
                                      100
                                    ) +
                                    "%",
                                }}
                              />

                              <div
                                title={
                                  formatMoney(
                                    item.expenses
                                  )
                                }
                                className="w-[38%] rounded-t-lg bg-slate-200"
                                style={{
                                  height:
                                    Math.max(
                                      2,
                                      (
                                        item.expenses /
                                        graphMax
                                      ) *
                                      100
                                    ) +
                                    "%",
                                }}
                              />

                            </div>

                            <p className="py-3 text-center text-[8px] font-black uppercase text-slate-400">
                              {item.label}
                            </p>

                          </div>
                        )
                      )
                    }

                  </div>

                </article>


                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div>

                    <p className="text-[11px] font-black text-slate-950">
                      Próximos 7 dias
                    </p>

                    <p className="mt-1 text-[9px] font-semibold text-slate-400">
                      Entradas e saídas previstas
                    </p>

                  </div>


                  <div className="mt-5 grid grid-cols-2 gap-2">

                    <div className="rounded-xl bg-emerald-50 p-3">

                      <p className="text-[8px] font-black uppercase text-emerald-600">
                        A receber
                      </p>

                      <p className="mt-1 text-lg font-black text-emerald-900">
                        {
                          formatMoney(
                            upcomingReceivable
                          )
                        }
                      </p>

                    </div>

                    <div className="rounded-xl bg-red-50 p-3">

                      <p className="text-[8px] font-black uppercase text-red-600">
                        A pagar
                      </p>

                      <p className="mt-1 text-lg font-black text-red-900">
                        {
                          formatMoney(
                            upcomingPayable
                          )
                        }
                      </p>

                    </div>

                  </div>


                  <div className="mt-4 space-y-2">

                    {
                      upcoming.length
                        ? upcoming.map(
                            (
                              entry
                            ) => (
                              <div
                                key={
                                  entry.id
                                }
                                className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3"
                              >

                                <div className={
                                  entry.type ===
                                  "RECEITA"
                                    ? "flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"
                                    : "flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600"
                                }>
                                  {
                                    entry.type ===
                                    "RECEITA"
                                      ? (
                                        <ArrowDownRight
                                          size={14}
                                        />
                                      )
                                      : (
                                        <ArrowUpRight
                                          size={14}
                                        />
                                      )
                                  }
                                </div>

                                <div className="min-w-0 flex-1">

                                  <p className="truncate text-[9px] font-black text-slate-800">
                                    {entry.description}
                                  </p>

                                  <p className="mt-0.5 text-[8px] text-slate-400">
                                    {
                                      dateFormatter.format(
                                        entry.dueDate
                                      )
                                    }
                                  </p>

                                </div>

                                <p className={
                                  entry.type ===
                                  "RECEITA"
                                    ? "text-[9px] font-black text-emerald-600"
                                    : "text-[9px] font-black text-red-600"
                                }>
                                  {
                                    entry.type ===
                                    "RECEITA"
                                      ? "+"
                                      : "-"
                                  }
                                  {
                                    formatMoney(
                                      entry.amountCents
                                    )
                                  }
                                </p>

                              </div>
                            )
                          )
                        : (
                          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-[9px] font-semibold text-slate-400">
                            Nenhum vencimento nos próximos 7 dias.
                          </div>
                        )
                    }

                  </div>

                </article>

              </section>


              <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <p className="text-[11px] font-black text-slate-950">
                    Receita por cliente
                  </p>

                  <p className="mt-1 text-[9px] font-semibold text-slate-400">
                    Participação no faturamento do mês
                  </p>


                  <div className="mt-5 space-y-4">

                    {
                      topClients.length
                        ? topClients.map(
                            (
                              client
                            ) => {

                              const share =
                                revenueTotal >
                                0
                                  ? (
                                      client.value /
                                      revenueTotal
                                    ) *
                                    100
                                  : 0;


                              return (
                                <div
                                  key={
                                    client.name
                                  }
                                >

                                  <div className="flex items-center justify-between gap-4">

                                    <div className="flex min-w-0 items-center gap-3">

                                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                        <UsersRound
                                          size={14}
                                        />
                                      </div>

                                      <p className="truncate text-[10px] font-black text-slate-800">
                                        {client.name}
                                      </p>

                                    </div>

                                    <div className="text-right">

                                      <p className="text-[10px] font-black text-slate-950">
                                        {
                                          formatMoney(
                                            client.value
                                          )
                                        }
                                      </p>

                                      <p className="text-[8px] font-bold text-slate-400">
                                        {
                                          share.toFixed(
                                            1
                                          )
                                        }%
                                      </p>

                                    </div>

                                  </div>


                                  <div className="ml-11 mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">

                                    <div
                                      className="h-full rounded-full bg-blue-600"
                                      style={{
                                        width:
                                          Math.min(
                                            100,
                                            share
                                          ) +
                                          "%",
                                      }}
                                    />

                                  </div>

                                </div>
                              );
                            }
                          )
                        : (
                          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-[9px] font-semibold text-slate-400">
                            Cadastre receitas vinculadas aos clientes para visualizar este ranking.
                          </p>
                        )
                    }

                  </div>

                </article>


                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <div className="flex items-start justify-between gap-3">

                    <div>

                      <p className="text-[11px] font-black text-slate-950">
                        Atenção financeira
                      </p>

                      <p className="mt-1 text-[9px] font-semibold text-slate-400">
                        Pontos que precisam de acompanhamento
                      </p>

                    </div>

                    <CircleAlert
                      size={17}
                      className="text-amber-500"
                    />

                  </div>


                  <div className="mt-5 space-y-2">

                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">

                      <p className="text-[10px] font-black text-red-800">
                        {
                          overdueRevenue.length
                        } recebimento(s) em atraso
                      </p>

                      <p className="mt-1 text-[9px] text-red-600">
                        {
                          formatMoney(
                            overdueRevenueTotal
                          )
                        } vencidos.
                      </p>

                    </div>


                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">

                      <p className="text-[10px] font-black text-amber-900">
                        {
                          upcoming.length
                        } vencimento(s) nos próximos 7 dias
                      </p>

                      <p className="mt-1 text-[9px] text-amber-700">
                        Acompanhe entradas e saídas previstas.
                      </p>

                    </div>

                  </div>

                </article>

              </section>


              <section className="grid gap-4 md:grid-cols-3">

                <FinanceCard
                  label="Receita recorrente"
                  value={
                    formatMoney(
                      recurringRevenue
                    )
                  }
                  helper="MRR cadastrado no período"
                  icon={
                    <CircleDollarSign
                      size={17}
                    />
                  }
                  tone="blue"
                />

                <FinanceCard
                  label="Ticket médio"
                  value={
                    formatMoney(
                      averageTicket
                    )
                  }
                  helper="Por cliente com receita"
                  icon={
                    <UsersRound
                      size={17}
                    />
                  }
                  tone="violet"
                />

                <FinanceCard
                  label="Resultado projetado"
                  value={
                    formatMoney(
                      result
                    )
                  }
                  helper="Fechamento do período"
                  icon={
                    <Landmark
                      size={17}
                    />
                  }
                  tone="green"
                />

              </section>

            </>
          )
          : null
      }


      {
        tab ===
        "receber"
          ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div>

                <h2 className="text-sm font-black text-slate-950">
                  Contas a receber
                </h2>

                <p className="mt-1 text-[9px] font-semibold text-slate-400">
                  Receitas de {
                    monthFormatter.format(
                      start
                    )
                  }.
                </p>

              </div>


              <div className="mt-5 space-y-2">

                {
                  revenues.length
                    ? revenues.map(
                        (
                          entry
                        ) => (
                          <FinanceEntryRow
                            key={
                              entry.id
                            }
                            entry={
                              entry
                            }
                            returnTo={
                              returnTo
                            }
                          />
                        )
                      )
                    : (
                      <div className="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center text-[10px] font-semibold text-slate-400">
                        Nenhuma receita cadastrada neste período.
                      </div>
                    )
                }

              </div>

            </section>
          )
          : null
      }


      {
        tab ===
        "pagar"
          ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div>

                <h2 className="text-sm font-black text-slate-950">
                  Contas a pagar
                </h2>

                <p className="mt-1 text-[9px] font-semibold text-slate-400">
                  Despesas de {
                    monthFormatter.format(
                      start
                    )
                  }.
                </p>

              </div>


              <div className="mt-5 space-y-2">

                {
                  expenses.length
                    ? expenses.map(
                        (
                          entry
                        ) => (
                          <FinanceEntryRow
                            key={
                              entry.id
                            }
                            entry={
                              entry
                            }
                            returnTo={
                              returnTo
                            }
                          />
                        )
                      )
                    : (
                      <div className="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center text-[10px] font-semibold text-slate-400">
                        Nenhuma despesa cadastrada neste período.
                      </div>
                    )
                }

              </div>

            </section>
          )
          : null
      }


      {
        tab ===
        "fluxo"
          ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

              <div>

                <h2 className="text-sm font-black text-slate-950">
                  Fluxo de caixa projetado
                </h2>

                <p className="mt-1 text-[9px] font-semibold text-slate-400">
                  Movimentação prevista por vencimento.
                </p>

              </div>


              <div className="mt-5 space-y-2">

                {
                  monthEntries.length
                    ? monthEntries.map(
                        (
                          entry
                        ) => (
                          <FinanceEntryRow
                            key={
                              entry.id
                            }
                            entry={
                              entry
                            }
                            returnTo={
                              returnTo
                            }
                          />
                        )
                      )
                    : (
                      <div className="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center text-[10px] font-semibold text-slate-400">
                        Nenhuma movimentação cadastrada neste período.
                      </div>
                    )
                }

              </div>

            </section>
          )
          : null
      }


      {
        tab ===
        "relatorios"
          ? (
            <section className="grid gap-4 xl:grid-cols-2">

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <h2 className="text-sm font-black text-slate-950">
                  Resultado do período
                </h2>

                <div className="mt-5 space-y-3">

                  <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
                    <span className="text-[9px] font-black text-blue-700">
                      Receita
                    </span>

                    <strong className="text-[11px] text-blue-900">
                      {
                        formatMoney(
                          revenueTotal
                        )
                      }
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3">
                    <span className="text-[9px] font-black text-red-700">
                      Despesas
                    </span>

                    <strong className="text-[11px] text-red-900">
                      {
                        formatMoney(
                          expenseTotal
                        )
                      }
                    </strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                    <span className="text-[9px] font-black text-emerald-700">
                      Resultado
                    </span>

                    <strong className="text-[11px] text-emerald-900">
                      {
                        formatMoney(
                          result
                        )
                      }
                    </strong>
                  </div>

                </div>

              </article>


              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <h2 className="text-sm font-black text-slate-950">
                  Por categoria
                </h2>

                <div className="mt-5 space-y-2">

                  {
                    categories.size
                      ? Array.from(
                          categories.entries()
                        )
                          .sort(
                            (
                              a,
                              b
                            ) =>
                              (
                                b[1].income +
                                b[1].expense
                              ) -
                              (
                                a[1].income +
                                a[1].expense
                              )
                          )
                          .map(
                            (
                              [
                                category,
                                values,
                              ]
                            ) => (
                              <div
                                key={
                                  category
                                }
                                className="rounded-xl border border-slate-100 px-4 py-3"
                              >

                                <p className="text-[9px] font-black text-slate-700">
                                  {category}
                                </p>

                                <div className="mt-1 flex gap-4 text-[8px] font-bold">

                                  <span className="text-emerald-600">
                                    + {
                                      formatMoney(
                                        values.income
                                      )
                                    }
                                  </span>

                                  <span className="text-red-600">
                                    - {
                                      formatMoney(
                                        values.expense
                                      )
                                    }
                                  </span>

                                </div>

                              </div>
                            )
                          )
                      : (
                        <p className="rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center text-[10px] font-semibold text-slate-400">
                          Nenhuma categoria movimentada no período.
                        </p>
                      )
                  }

                </div>

              </article>

            </section>
          )
          : null
      }

    </div>
  );
}
