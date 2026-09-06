import Link from "next/link";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Headphones,
  Mail,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";

import {
  requireCurrentUser,
} from "@/lib/auth";

import {
  prisma,
} from "@/lib/prisma";

import {
  createSupportTicketAction,
  replySupportTicketAction,
} from "./actions";


export const dynamic =
  "force-dynamic";


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


const priorityLabels:
  Record<string, string> = {

    BAIXA:
      "Baixa",

    NORMAL:
      "Normal",

    ALTA:
      "Alta",

    URGENTE:
      "Urgente",
  };


const statusLabels:
  Record<string, string> = {

    ABERTO:
      "Aberto",

    EM_ATENDIMENTO:
      "Em atendimento",

    AGUARDANDO_CLIENTE:
      "Aguardando você",

    RESOLVIDO:
      "Resolvido",
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


export default async function AjudaPage({
  searchParams,
}: {
  searchParams?:
    Promise<{
      ticket?: string;
      created?: string;
      sent?: string;
      error?: string;
    }>;
}) {

  const user =
    await requireCurrentUser();


  const params =
    searchParams
      ? await searchParams
      : {};


  const visibilityWhere =
    user.role ===
      "DIRECTOR"
      ? {
          agencyId:
            user.agencyId,
        }
      : {
          agencyId:
            user.agencyId,

          createdByUserId:
            user.id,
        };


  const [
    agency,
    tickets,
  ] =
    await Promise.all([

      prisma
        .agency
        .findUnique({

          where: {
            id:
              user.agencyId,
          },

          select: {
            name:
              true,
          },

        }),


      prisma
        .supportTicket
        .findMany({

          where:
            visibilityWhere,

          orderBy: {
            updatedAt:
              "desc",
          },

          take:
            30,

          include: {

            messages: {

              orderBy: {
                createdAt:
                  "desc",
              },

              take:
                1,
            },

          },

        }),

    ]);


  const selectedId =
    String(
      params?.ticket ||
      ""
    ).trim();


  const selectedTicket =
    selectedId
      ? await prisma
          .supportTicket
          .findFirst({

            where: {

              id:
                selectedId,

              ...visibilityWhere,

            },

            include: {

              messages: {

                orderBy: {
                  createdAt:
                    "asc",
                },

              },

            },

          })
      : null;


  return (

    <div className="mx-auto max-w-6xl space-y-6">

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-6 py-8 text-white md:px-8">

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
                Suporte AprovUp
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight">
                Central de ajuda
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                Tire dúvidas, informe problemas e acompanhe seus chamados sem sair do AprovUp.
              </p>

            </div>


            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">

              <p className="text-xs font-semibold text-slate-400">
                Agência
              </p>

              <p className="mt-1 font-bold">
                {agency?.name || "Sua agência"}
              </p>

            </div>

          </div>

        </div>

      </section>


      {params?.created ? (

        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">

          <CheckCircle2 size={17} />

          Chamado criado. Nossa equipe já recebeu sua solicitação.

        </div>

      ) : null}


      {params?.sent ? (

        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">

          <CheckCircle2 size={17} />

          Sua mensagem foi enviada.

        </div>

      ) : null}


      {params?.error ? (

        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">

          <AlertCircle size={17} />

          Não foi possível concluir a solicitação. Confira os campos e tente novamente.

        </div>

      ) : null}


      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <a
          href="https://wa.me/5582981122022"
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
        >

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <MessageCircle size={20} />
          </div>

          <p className="mt-4 font-bold text-slate-900">
            WhatsApp
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Fale diretamente com nossa equipe.
          </p>

          <p className="mt-3 text-sm font-bold text-emerald-700">
            (82) 98112-2022
          </p>

        </a>


        <a
          href="tel:+5582981122022"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
        >

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Phone size={20} />
          </div>

          <p className="mt-4 font-bold text-slate-900">
            Telefone
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Entre em contato com o suporte.
          </p>

          <p className="mt-3 text-sm font-bold text-blue-700">
            (82) 98112-2022
          </p>

        </a>


        <a
          href="mailto:contato@aprovup.com.br"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
        >

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Mail size={20} />
          </div>

          <p className="mt-4 font-bold text-slate-900">
            E-mail
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Envie sua solicitação por e-mail.
          </p>

          <p className="mt-3 break-all text-sm font-bold text-violet-700">
            contato@aprovup.com.br
          </p>

        </a>


        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Headphones size={20} />
          </div>

          <p className="mt-4 font-bold text-slate-900">
            Chamado de suporte
          </p>

          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Registre e acompanhe seu atendimento.
          </p>

          <a
            href="#novo-chamado"
            className="mt-3 inline-flex text-sm font-bold text-orange-700"
          >
            Abrir chamado
          </a>

        </div>

      </section>


      <section
        id="novo-chamado"
        className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]"
      >

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div>

            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">
              Novo chamado
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              Como podemos ajudar?
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Quanto mais detalhes você informar, mais rápido conseguimos entender o problema.
            </p>

          </div>


          <form
            action={createSupportTicketAction}
            className="mt-6 space-y-4"
          >

            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-600">
                Assunto
              </label>

              <input
                name="subject"
                required
                minLength={5}
                maxLength={120}
                placeholder="Ex.: Não consigo conectar o Instagram"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />

            </div>


            <div className="grid gap-4 sm:grid-cols-2">

              <div>

                <label className="mb-1.5 block text-xs font-bold text-slate-600">
                  Categoria
                </label>

                <select
                  name="category"
                  defaultValue="DUVIDA"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                >
                  <option value="DUVIDA">Dúvida</option>
                  <option value="PROBLEMA_TECNICO">Problema técnico</option>
                  <option value="INTEGRACAO">Integração</option>
                  <option value="CONTA_ACESSO">Conta e acesso</option>
                  <option value="FATURAMENTO">Faturamento</option>
                  <option value="SUGESTAO">Sugestão</option>
                  <option value="OUTRO">Outro</option>
                </select>

              </div>


              <div>

                <label className="mb-1.5 block text-xs font-bold text-slate-600">
                  Prioridade
                </label>

                <select
                  name="priority"
                  defaultValue="NORMAL"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="NORMAL">Normal</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>

              </div>

            </div>


            <div>

              <label className="mb-1.5 block text-xs font-bold text-slate-600">
                Descreva o que aconteceu
              </label>

              <textarea
                name="message"
                required
                minLength={10}
                maxLength={5000}
                rows={7}
                placeholder="Explique o problema, o que estava tentando fazer e o que apareceu na tela."
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />

            </div>


            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <Send size={16} />

              Enviar chamado
            </button>

          </form>

        </div>


        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between gap-3">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">
                Histórico
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                Seus chamados
              </h2>

            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              {tickets.length}
            </span>

          </div>


          <div className="mt-5 space-y-3">

            {tickets.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">

                <Clock3
                  size={26}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-3 text-sm font-bold text-slate-700">
                  Nenhum chamado ainda
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Quando você precisar, nossa equipe estará por aqui.
                </p>

              </div>

            ) : (

              tickets.map(
                (
                  ticket
                ) => (

                  <Link
                    key={ticket.id}
                    href={`/ajuda?ticket=${ticket.id}`}
                    className={
                      selectedId ===
                      ticket.id
                        ? "block rounded-2xl border border-blue-200 bg-blue-50/60 p-4"
                        : "block rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                    }
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <p className="truncate text-sm font-bold text-slate-900">
                          {ticket.subject}
                        </p>

                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          #{ticketCode(ticket.id)}
                          {" • "}
                          {categoryLabels[ticket.category] || ticket.category}
                        </p>

                      </div>


                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">
                        {statusLabels[ticket.status] || ticket.status}
                      </span>

                    </div>


                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {ticket.messages[0]?.message || "Sem mensagens."}
                    </p>


                    <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-slate-400">

                      <span>
                        {priorityLabels[ticket.priority] || ticket.priority}
                      </span>

                      <span>
                        {formatDate(ticket.updatedAt)}
                      </span>

                    </div>

                  </Link>

                )
              )

            )}

          </div>

        </div>

      </section>


      {selectedTicket ? (

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">
                Chamado #{ticketCode(selectedTicket.id)}
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                {selectedTicket.subject}
              </h2>

            </div>


            <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {statusLabels[selectedTicket.status] || selectedTicket.status}
            </span>

          </div>


          <div className="mt-6 space-y-4">

            {selectedTicket.messages.map(
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

                    <div className="flex items-center justify-between gap-4">

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


          {selectedTicket.status !==
          "RESOLVIDO" ? (

            <form
              action={replySupportTicketAction}
              className="mt-6 border-t border-slate-100 pt-5"
            >

              <input
                type="hidden"
                name="ticketId"
                value={selectedTicket.id}
              />

              <label className="mb-2 block text-xs font-bold text-slate-600">
                Responder ao suporte
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">

                <textarea
                  name="message"
                  required
                  rows={3}
                  maxLength={5000}
                  placeholder="Escreva sua mensagem..."
                  className="min-h-[88px] flex-1 resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                />

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <Send size={15} />

                  Enviar
                </button>

              </div>

            </form>

          ) : (

            <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              Este chamado foi marcado como resolvido.
            </div>

          )}

        </section>

      ) : null}

    </div>
  );
}