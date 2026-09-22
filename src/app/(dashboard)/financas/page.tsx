import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
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
  requirePermission,
} from "@/lib/userAccess";


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

      maximumFractionDigits:
        0,
    }
  );


const revenueData = [
  {
    month:
      "Abr",

    income:
      27,

    expenses:
      17,
  },
  {
    month:
      "Mai",

    income:
      30,

    expenses:
      18,
  },
  {
    month:
      "Jun",

    income:
      29,

    expenses:
      19,
  },
  {
    month:
      "Jul",

    income:
      31,

    expenses:
      18,
  },
  {
    month:
      "Ago",

    income:
      33,

    expenses:
      19,
  },
  {
    month:
      "Set",

    income:
      36,

    expenses:
      20,
  },
];


const clientRevenue = [
  {
    name:
      "Rocha Empreendimentos",

    value:
      5200,

    share:
      15,
  },
  {
    name:
      "Autochina Veículos",

    value:
      4200,

    share:
      12,
  },
  {
    name:
      "Colégio Sacramento",

    value:
      3200,

    share:
      9,
  },
  {
    name:
      "SLAC Saúde",

    value:
      2800,

    share:
      8,
  },
  {
    name:
      "Escola O Verbo",

    value:
      2500,

    share:
      7,
  },
];


const upcoming = [
  {
    type:
      "receive",

    title:
      "Mensalidade de cliente",

    subtitle:
      "Vencimento hoje",

    value:
      2500,
  },
  {
    type:
      "pay",

    title:
      "Ferramentas e softwares",

    subtitle:
      "Vencimento em 2 dias",

    value:
      1480,
  },
  {
    type:
      "receive",

    title:
      "Contrato mensal",

    subtitle:
      "Vencimento em 3 dias",

    value:
      4200,
  },
  {
    type:
      "pay",

    title:
      "Prestador de serviço",

    subtitle:
      "Vencimento em 4 dias",

    value:
      2100,
  },
];


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


export default async function FinancePage() {

  await requirePermission(
    "settings.manage"
  );


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

              <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200">
                Protótipo visual
              </span>

            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight">
              Finanças
            </h1>

            <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-slate-300">
              Uma visão clara da saúde financeira da agência, receitas, despesas, previsões e resultados.
            </p>

          </div>


          <div className="flex flex-wrap items-center gap-2">

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-[10px] font-black text-white"
            >
              <CalendarDays
                size={14}
              />

              Setembro 2026

              <ChevronDown
                size={13}
              />
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[10px] font-black text-white shadow-lg shadow-blue-950/20"
            >
              <Plus
                size={14}
              />

              Novo lançamento
            </button>

          </div>

        </div>

      </section>


      <section className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">

        {[
          "Dashboard",
          "A receber",
          "A pagar",
          "Fluxo de caixa",
          "Relatórios",
        ].map(
          (
            item,
            index
          ) => (
            <button
              type="button"
              key={
                item
              }
              className={
                index === 0
                  ? "shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-[10px] font-black text-white"
                  : "shrink-0 rounded-xl px-4 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-50"
              }
            >
              {item}
            </button>
          )
        )}

      </section>


      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">

        <FinanceCard
          label="Faturamento"
          value="R$ 36.400"
          helper="+10,3% vs. agosto"
          icon={
            <CircleDollarSign
              size={18}
            />
          }
          tone="blue"
        />

        <FinanceCard
          label="Recebido"
          value="R$ 29.800"
          helper="81,9% do faturamento"
          icon={
            <ArrowDownRight
              size={18}
            />
          }
          tone="green"
        />

        <FinanceCard
          label="A receber"
          value="R$ 6.600"
          helper="5 recebimentos pendentes"
          icon={
            <Clock3
              size={18}
            />
          }
          tone="amber"
        />

        <FinanceCard
          label="Despesas"
          value="R$ 19.700"
          helper="+3,2% vs. agosto"
          icon={
            <ArrowUpRight
              size={18}
            />
          }
          tone="red"
        />

        <FinanceCard
          label="Lucro"
          value="R$ 16.700"
          helper="Resultado projetado"
          icon={
            <TrendingUp
              size={18}
            />
          }
          tone="violet"
        />

        <FinanceCard
          label="Margem"
          value="45,9%"
          helper="Meta: 50%"
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

          <div className="flex flex-wrap items-start justify-between gap-3">

            <div>

              <p className="text-[11px] font-black text-slate-950">
                Evolução financeira
              </p>

              <p className="mt-1 text-[9px] font-semibold text-slate-400">
                Entradas x despesas dos últimos 6 meses
              </p>

            </div>

            <div className="flex items-center gap-4 text-[9px] font-bold text-slate-400">

              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Receita
              </span>

              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Despesas
              </span>

            </div>

          </div>


          <div className="mt-8 flex h-[230px] items-end gap-4 border-b border-slate-100 px-2">

            {revenueData.map(
              (
                item
              ) => (
                <div
                  key={
                    item.month
                  }
                  className="flex h-full min-w-0 flex-1 flex-col justify-end"
                >

                  <div className="flex flex-1 items-end justify-center gap-1.5">

                    <div
                      className="w-[38%] rounded-t-lg bg-blue-600"
                      style={{
                        height:
                          String(
                            (
                              item.income /
                              40
                            ) *
                            100
                          ) +
                          "%",
                      }}
                    />

                    <div
                      className="w-[38%] rounded-t-lg bg-slate-200"
                      style={{
                        height:
                          String(
                            (
                              item.expenses /
                              40
                            ) *
                            100
                          ) +
                          "%",
                      }}
                    />

                  </div>

                  <p className="py-3 text-center text-[9px] font-black uppercase tracking-wider text-slate-400">
                    {item.month}
                  </p>

                </div>
              )
            )}

          </div>

        </article>


        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="text-[11px] font-black text-slate-950">
                Próximos 7 dias
              </p>

              <p className="mt-1 text-[9px] font-semibold text-slate-400">
                Entradas e saídas previstas
              </p>

            </div>

            <Landmark
              size={17}
              className="text-slate-300"
            />

          </div>


          <div className="mt-5 grid grid-cols-2 gap-2">

            <div className="rounded-xl bg-emerald-50 p-3">

              <p className="text-[8px] font-black uppercase tracking-wider text-emerald-600">
                A receber
              </p>

              <p className="mt-1 text-lg font-black text-emerald-900">
                R$ 8.200
              </p>

            </div>

            <div className="rounded-xl bg-red-50 p-3">

              <p className="text-[8px] font-black uppercase tracking-wider text-red-600">
                A pagar
              </p>

              <p className="mt-1 text-lg font-black text-red-900">
                R$ 3.580
              </p>

            </div>

          </div>


          <div className="mt-4 space-y-2">

            {upcoming.map(
              (
                item,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3"
                >

                  <div className={
                    item.type ===
                    "receive"
                      ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"
                      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600"
                  }>
                    {
                      item.type ===
                      "receive"
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

                    <p className="truncate text-[10px] font-black text-slate-800">
                      {item.title}
                    </p>

                    <p className="mt-0.5 text-[8px] font-semibold text-slate-400">
                      {item.subtitle}
                    </p>

                  </div>

                  <p className={
                    item.type ===
                    "receive"
                      ? "text-[10px] font-black text-emerald-600"
                      : "text-[10px] font-black text-red-600"
                  }>
                    {
                      item.type ===
                      "receive"
                        ? "+"
                        : "-"
                    }
                    {
                      currency.format(
                        item.value
                      )
                    }
                  </p>

                </div>
              )
            )}

          </div>

        </article>

      </section>


      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between gap-4">

            <div>

              <p className="text-[11px] font-black text-slate-950">
                Receita por cliente
              </p>

              <p className="mt-1 text-[9px] font-semibold text-slate-400">
                Participação no faturamento do mês
              </p>

            </div>

            <button
              type="button"
              className="text-[9px] font-black text-blue-600"
            >
              Ver todos
            </button>

          </div>


          <div className="mt-5 space-y-4">

            {clientRevenue.map(
              (
                client
              ) => (
                <div
                  key={
                    client.name
                  }
                >

                  <div className="flex items-center justify-between gap-4">

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <UsersRound
                          size={14}
                        />
                      </div>

                      <p className="truncate text-[10px] font-black text-slate-800">
                        {client.name}
                      </p>

                    </div>

                    <div className="shrink-0 text-right">

                      <p className="text-[10px] font-black text-slate-950">
                        {
                          currency.format(
                            client.value
                          )
                        }
                      </p>

                      <p className="text-[8px] font-bold text-slate-400">
                        {client.share}% do total
                      </p>

                    </div>

                  </div>


                  <div className="ml-11 mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">

                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width:
                          String(
                            Math.min(
                              100,
                              client.share *
                              4
                            )
                          ) +
                          "%",
                      }}
                    />

                  </div>

                </div>
              )
            )}

          </div>

        </article>


        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-start justify-between gap-4">

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

              <div className="flex items-start gap-3">

                <CircleAlert
                  size={15}
                  className="mt-0.5 shrink-0 text-red-500"
                />

                <div>

                  <p className="text-[10px] font-black text-red-800">
                    2 recebimentos em atraso
                  </p>

                  <p className="mt-1 text-[9px] leading-relaxed text-red-600">
                    R$ 1.800 vencidos aguardando regularização.
                  </p>

                </div>

              </div>

            </div>


            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">

              <div className="flex items-start gap-3">

                <ReceiptText
                  size={15}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>

                  <p className="text-[10px] font-black text-amber-900">
                    4 contas vencem nesta semana
                  </p>

                  <p className="mt-1 text-[9px] leading-relaxed text-amber-700">
                    Total previsto de R$ 3.580 em saídas.
                  </p>

                </div>

              </div>

            </div>


            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

              <div className="flex items-start gap-3">

                <TrendingUp
                  size={15}
                  className="mt-0.5 shrink-0 text-blue-600"
                />

                <div>

                  <p className="text-[10px] font-black text-blue-900">
                    Meta mensal em 72%
                  </p>

                  <p className="mt-1 text-[9px] leading-relaxed text-blue-700">
                    Faltam R$ 13.600 para atingir R$ 50 mil.
                  </p>

                </div>

              </div>

            </div>

          </div>

        </article>

      </section>


      <section className="grid gap-4 md:grid-cols-3">

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Receita recorrente
            </p>

            <CircleDollarSign
              size={16}
              className="text-blue-500"
            />

          </div>

          <p className="mt-3 text-2xl font-black text-slate-950">
            R$ 31.200
          </p>

          <p className="mt-1 text-[9px] font-semibold text-slate-400">
            MRR atual
          </p>

        </article>


        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Ticket médio
            </p>

            <UsersRound
              size={16}
              className="text-violet-500"
            />

          </div>

          <p className="mt-3 text-2xl font-black text-slate-950">
            R$ 2.840
          </p>

          <p className="mt-1 text-[9px] font-semibold text-slate-400">
            Por cliente ativo
          </p>

        </article>


        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Saldo projetado
            </p>

            <Landmark
              size={16}
              className="text-emerald-500"
            />

          </div>

          <p className="mt-3 text-2xl font-black text-slate-950">
            R$ 18.920
          </p>

          <p className="mt-1 text-[9px] font-semibold text-slate-400">
            Final do mês
          </p>

        </article>

      </section>


      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-4">

        <div className="flex items-start gap-3">

          <CircleAlert
            size={16}
            className="mt-0.5 shrink-0 text-slate-400"
          />

          <div>

            <p className="text-[10px] font-black text-slate-600">
              Primeira versão visual
            </p>

            <p className="mt-1 text-[9px] leading-relaxed text-slate-400">
              Os valores exibidos nesta tela são demonstrativos. Na próxima etapa vamos estruturar contas a receber, contas a pagar, recorrências, categorias, clientes e fluxo de caixa real.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}
