import Link from 'next/link';

import {
  Bot,
  Clock3,
  MessageCircleMore,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
} from 'lucide-react';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  SecretaryConversationsClient,
} from './SecretaryConversationsClient';


export const dynamic =
  'force-dynamic';


function formatDateTime(
  value:
    Date |
    null |
    undefined
) {
  if (!value) {
    return 'Ainda não recebido';
  }

  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      timeZone:
        'America/Maceio',

      day:
        '2-digit',

      month:
        '2-digit',

      hour:
        '2-digit',

      minute:
        '2-digit',
    }
  ).format(
    value
  );
}


export default async function SecretaryPage() {
  const user =
    await requirePermission(
      'settings.manage'
    );


  const [
    agency,
    connection,
    members,
    threads,
  ] =
    await Promise.all([
      prisma.agency
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
        .secretaryWhatsappConnection
        .findUnique({
          where: {
            agencyId:
              user.agencyId,
          },

          select: {
            secretaryName:
              true,

            secretaryCompanyName:
              true,

            secretaryAvatarUrl:
              true,

            status:
              true,

            displayPhoneNumber:
              true,

            lastWebhookAt:
              true,
          },
        }),

      prisma
        .secretaryWhatsappMember
        .findMany({
          where: {
            agencyId:
              user.agencyId,

            isActive:
              true,
          },

          select: {
            userId:
              true,

            phoneE164:
              true,

            displayName:
              true,

            canUseSecretary:
              true,

            lastInboundAt:
              true,
          },

          orderBy: {
            displayName:
              'asc',
          },
        }),

      prisma
        .secretaryThread
        .findMany({
          where: {
            agencyId:
              user.agencyId,

            channel:
              'WHATSAPP',
          },

          orderBy: {
            updatedAt:
              'desc',
          },

          take:
            100,

          select: {
            id:
              true,

            userId:
              true,

            externalConversationId:
              true,

            title:
              true,

            updatedAt:
              true,

            messages: {
              orderBy: {
                createdAt:
                  'desc',
              },

              take:
                120,

              select: {
                id:
                  true,

                role:
                  true,

                content:
                  true,

                inputType:
                  true,

                createdAt:
                  true,
              },
            },
          },
        }),
    ]);


  const secretaryName =
    connection
      ?.secretaryName
      ?.trim() ||
    'Secretária IA';

  const secretaryCompanyName =
    connection
      ?.secretaryCompanyName
      ?.trim() ||
    agency
      ?.name
      ?.trim() ||
    'sua empresa';

  const secretaryAvatarUrl =
    connection
      ?.secretaryAvatarUrl
      ?.trim() ||
    '';


  const memberByPhone =
    new Map(
      members.map(
        (
          member
        ) => [
          member.phoneE164,
          member,
        ]
      )
    );


  const conversations =
    threads
      .map(
        (
          thread
        ) => {
          const phone =
            thread
              .externalConversationId ||
            '';

          const member =
            memberByPhone.get(
              phone
            );

          const orderedMessages =
            [
              ...thread.messages,
            ].reverse();

          const latestMessage =
            orderedMessages[
              orderedMessages.length -
                1
            ];

          return {
            id:
              thread.id,

            userId:
              thread.userId,

            phone,

            displayName:
              member
                ?.displayName
                ?.trim() ||
              'Contato WhatsApp',

            lastInboundAt:
              member
                ?.lastInboundAt
                ?.toISOString() ||
              null,

            updatedAt:
              (
                latestMessage
                  ?.createdAt ||
                thread.updatedAt
              ).toISOString(),

            messages:
              orderedMessages.map(
                (
                  message
                ) => ({
                  id:
                    message.id,

                  role:
                    message.role,

                  content:
                    message.content,

                  inputType:
                    message.inputType,

                  createdAt:
                    message
                      .createdAt
                      .toISOString(),
                })
              ),
          };
        }
      )
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b.updatedAt
          ).getTime() -
          new Date(
            a.updatedAt
          ).getTime()
      );


  const authorizedMembers =
    members.filter(
      (
        member
      ) =>
        member
          .canUseSecretary
    ).length;


  const connectionStatus =
    connection
      ?.status ||
    'PENDENTE';


  return (
    <div className="space-y-5">

      <section className="rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8">

        <div className="flex flex-wrap items-center justify-between gap-6">

          <div>
            <div className="flex items-center gap-2 text-blue-300">
              <Sparkles
                size={15}
              />

              <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                Central administrativa da Secretária IA
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black">
              Conversas da {secretaryName}
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
              Acompanhe em um só lugar tudo que a {secretaryName} conversa pelo WhatsApp com a equipe da {secretaryCompanyName}. Esta área é somente para administração e não possui chat interno com a IA.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-black text-emerald-200">
              <ShieldCheck
                size={14}
              />

              Acesso administrativo
            </div>
          </div>


          <div className="flex items-center gap-3">
            <Link
              href="/secretaria/configuracoes"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-[10px] font-black text-white hover:bg-white/15"
            >
              <Settings
                size={14}
              />

              Configurações
            </Link>

            <div className="hidden h-16 w-16 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-white/10 text-blue-200 sm:flex">
              {secretaryAvatarUrl ? (
                <img
                  src={secretaryAvatarUrl}
                  alt={`Foto de ${secretaryName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Bot
                  size={30}
                />
              )}
            </div>
          </div>

        </div>

      </section>


      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <MessageCircleMore
              size={15}
            />

            <span className="text-[9px] font-black uppercase tracking-[0.12em]">
              Conversas
            </span>
          </div>

          <p className="mt-2 text-2xl font-black text-slate-950">
            {conversations.length}
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            Históricos do WhatsApp
          </p>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Users
              size={15}
            />

            <span className="text-[9px] font-black uppercase tracking-[0.12em]">
              Equipe autorizada
            </span>
          </div>

          <p className="mt-2 text-2xl font-black text-slate-950">
            {authorizedMembers}
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            Pessoas que podem falar com a {secretaryName}
          </p>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Wifi
              size={15}
            />

            <span className="text-[9px] font-black uppercase tracking-[0.12em]">
              WhatsApp
            </span>
          </div>

          <p className={
            'mt-2 text-sm font-black ' +
            (
              connectionStatus ===
              'ATIVO'
                ? 'text-emerald-600'
                : 'text-amber-600'
            )
          }>
            {connectionStatus}
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            {connection
              ?.displayPhoneNumber ||
              'Número não configurado'}
          </p>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock3
              size={15}
            />

            <span className="text-[9px] font-black uppercase tracking-[0.12em]">
              Último webhook
            </span>
          </div>

          <p className="mt-2 text-sm font-black text-slate-950">
            {formatDateTime(
              connection
                ?.lastWebhookAt
            )}
          </p>

          <p className="mt-1 text-[10px] text-slate-500">
            Última atividade recebida da Meta
          </p>
        </div>
      </section>


      <SecretaryConversationsClient
        secretaryName={
          secretaryName
        }

        secretaryAvatarUrl={
          secretaryAvatarUrl
        }

        conversations={
          conversations
        }
      />

    </div>
  );
}
