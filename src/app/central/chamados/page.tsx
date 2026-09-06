import Link from "next/link";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Headphones,
  Send,
} from "lucide-react";

import {
  requireCommanderAccess,
} from "@/lib/commanderAccess";

import {
  prisma,
} from "@/lib/prisma";

import {
  adminReplySupportTicketAction,
  updateSupportTicketStatusAction,
} from "./actions";


export const dynamic =
  "force-dynamic";


const statusLabels:
  Record<string, string> = {

    ABERTO:
      "Aberto",

    EM_ATENDIMENTO:
      "Em atendimento",

    AGUARDANDO_CLIENTE:
      "Aguardando cliente",

    RESOLVIDO:
      "Resolvido",
  };


const categoryLabels:
  Record<string, string> = {

    DUVIDA:
      "Dúvida",

    PROBLEMA_TECNICO:
      "Problema técnico",

    INTEGRACAO:
      "Integração",

    CONTA_ACESSO:
      "Conta e acesso",

    FATURAMENTO:
      "Faturamento",

    SUGESTAO:
      "Sugestão",

    OUTRO:
      "Outro",
  };


function formatDate(
  value: Date
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle:
        "short",

      timeStyle:
        "short",

      timeZone:
        "America/Maceio",
    }
  ).format(
    value
  );
}


function ticketCode(
  id: string
) {
  return id
    .slice(-6)
    .toUpperCase();
}


export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams?:
    Promise<{
      ticket?: string;
      sent?: string;
      statusUpdated?: string;
      error?: string;
    }>;
}) {

  await requireCommanderAccess();


  const params =
    searchParams
      ? await searchParams
      : {};


  const tickets =
    await prisma
      .supportTicket
      .findMany({

        orderBy: {
          updatedAt:
            "desc",
        },

        include: {

          agency: {

            select: {
              name:
                true,
            },

          },

          messages: {

            orderBy: {
              createdAt:
                "desc",
            },

            take:
              1,
          },

        },

        take:
          100,

      });


  const selectedId =
    String(
      params?.ticket ||
      tickets[0]?.id ||
      ""
    ).trim();


  const selected =
    selectedId
      ? await prisma
          .supportTicket
          .findUnique({

            where: {
              id:
                selectedId,
            },

            include: {

              agency: {

                select: {
                  name:
                    true,
                },

              },

              messages: {

                orderBy: {
                  createdAt:
                    "asc",
                },

              },

            },

          })
      : null;


  const openCount =
    tickets.filter(
      (
        item
      ) =>
        item.status !==
        "RESOLVIDO"
    ).length;


  return (

    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-8">

      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <Link
              href="/central"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={14} />

              Central administrativa
            </Link>

            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
              Suporte AprovUp
            </p>

            <h1 className="mt-1 text-3xl font-black">
              Chamados das agências
            </h1>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">

            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Em aberto
            </p>

            <p className="mt-1 text-2xl font-black">
              {openCount}
            </p>

          </div>

        </div>


        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex items-center justify-between px-2 pb-4">

              <p className="font-bold">
                Chamados
              </p>

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                {tickets.length}
              </span>

            </div>


            <div className="max-h-[75vh] space-y-2 overflow-y-auto pr-1">

              {tickets.length === 0 ? (

                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">

                  <Headphones
                    size={28}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-bold">
                    Nenhum chamado
                  </p>

                </div>

              ) : (

                tickets.map(
                  (
                    ticket
                  ) => (

                    <Link
                      key={ticket.id}
                      href={`/central/chamados?ticket=${ticket.id}`}
                      className={
                        selectedId ===
                        ticket.id
                          ? "block rounded-2xl border border-blue-200 bg-blue-50 p-4"
                          : "block rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
                      }
                    >

                      <div className="flex items-start justify-between gap-2">

                        <div className="min-w-0">

                          <p className="truncate text-sm font-bold">
                            {ticket.subject}
                          </p>

                          <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">
                            {ticket.agency.name}
                            {" • "}
                            #{ticketCode(ticket.id)}
                          </p>

                        </div>

                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
                          {statusLabels[ticket.status] || ticket.status}
                        </span>

                      </div>


                      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {ticket.messages[0]?.message || ""}
                      </p>


                      <p className="mt-3 text-[10px] font-semibold text-slate-400">
                        {formatDate(ticket.updatedAt)}
                      </p>

                    </Link>

                  )
                )

              )}

            </div>

          </section>


          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            {!selected ? (

              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">

                <Clock3
                  size={32}
                  className="text-slate-300"
                />

                <p className="mt-3 font-bold">
                  Selecione um chamado
                </p>

              </div>

            ) : (

              <>

                <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      {selected.agency.name}
                      {" • "}
                      #{ticketCode(selected.id)}
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      {selected.subject}
                    </h2>

                    <p className="mt-2 text-xs text-slate-500">
                      Aberto por {selected.createdByName}
                      {selected.createdByEmail
                        ? ` • ${selected.createdByEmail}`
                        : ""}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {categoryLabels[selected.category] || selected.category}
                      {" • Prioridade "}
                      {selected.priority}
                    </p>

                  </div>


                  <form
                    action={updateSupportTicketStatusAction}
                    className="flex items-center gap-2"
                  >

                    <input
                      type="hidden"
                      name="ticketId"
                      value={selected.id}
                    />

                    <select
                      name="status"
                      defaultValue={selected.status}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                    >
                      <option value="ABERTO">Aberto</option>
                      <option value="EM_ATENDIMENTO">Em atendimento</option>
                      <option value="AGUARDANDO_CLIENTE">Aguardando cliente</option>
                      <option value="RESOLVIDO">Resolvido</option>
                    </select>

                    <button
                      type="submit"
                      className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                    >
                      Atualizar
                    </button>

                  </form>

                </div>


                {params?.sent ? (

                  <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">

                    <CheckCircle2 size={16} />

                    Resposta enviada.

                  </div>

                ) : null}


                <div className="mt-6 space-y-4">

                  {selected.messages.map(
                    (
                      item
                    ) => {

                      const admin =
                        item.authorType ===
                        "ADMIN";


                      return (

                        <div
                          key={item.id}
                          className={
                            admin
                              ? "ml-auto max-w-3xl rounded-2xl bg-slate-950 p-4 text-white"
                              : "max-w-3xl rounded-2xl bg-slate-100 p-4 text-slate-800"
                          }
                        >

                          <div className="flex items-center justify-between gap-3">

                            <p className="text-xs font-bold">
                              {admin
                                ? "Suporte AprovUp"
                                : item.authorName}
                            </p>

                            <p className="text-[10px] text-slate-400">
                              {formatDate(item.createdAt)}
                            </p>

                          </div>


                          <p className={
                            admin
                              ? "mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200"
                              : "mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600"
                          }>
                            {item.message}
                          </p>

                        </div>

                      );
                    }
                  )}

                </div>


                {selected.status !==
                "RESOLVIDO" ? (

                  <form
                    action={adminReplySupportTicketAction}
                    className="mt-6 border-t border-slate-100 pt-5"
                  >

                    <input
                      type="hidden"
                      name="ticketId"
                      value={selected.id}
                    />

                    <label className="mb-2 block text-xs font-bold text-slate-600">
                      Responder como Suporte AprovUp
                    </label>

                    <textarea
                      name="message"
                      required
                      rows={4}
                      maxLength={5000}
                      placeholder="Escreva a resposta para a agência..."
                      className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                    />

                    <button
                      type="submit"
                      className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      <Send size={16} />

                      Enviar resposta
                    </button>

                  </form>

                ) : (

                  <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    Chamado resolvido.
                  </div>

                )}

              </>

            )}

          </section>

        </div>

      </div>

    </main>
  );
}