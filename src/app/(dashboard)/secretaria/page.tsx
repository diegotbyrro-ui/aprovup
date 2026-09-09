import Link from 'next/link';

import {
  Bot,
  Settings,
  Sparkles,
} from 'lucide-react';

import {
  prisma,
} from '@/lib/prisma';

import {
  hasPermission,
  requirePermission,
} from '@/lib/userAccess';

import {
  SecretaryClient,
} from './SecretaryClient';


export const dynamic =
  'force-dynamic';


export default async function SecretaryPage() {
  const user =
    await requirePermission(
      'secretary.use'
    );


  const thread =
    await prisma
      .secretaryThread
      .findFirst({
        where: {
          agencyId:
            user.agencyId,

          userId:
            user.id,

          channel:
            'WEB',
        },

        orderBy: {
          updatedAt:
            'desc',
        },
      });


  const messages =
    thread
      ? await prisma
          .secretaryMessage
          .findMany({
            where: {
              threadId:
                thread.id,
            },

            orderBy: {
              createdAt:
                'desc',
            },

            take:
              50,
          })
      : [];


  const pending =
    thread
      ? await prisma
          .secretaryPendingAction
          .findFirst({
            where: {
              agencyId:
                user.agencyId,

              userId:
                user.id,

              threadId:
                thread.id,

              status:
                'PENDING',

              OR: [
                {
                  expiresAt:
                    null,
                },

                {
                  expiresAt: {
                    gt:
                      new Date(),
                  },
                },
              ],
            },

            orderBy: {
              createdAt:
                'desc',
            },
          })
      : null;


  const alerts =
    await prisma
      .secretaryAlert
      .findMany({
        where: {
          agencyId:
            user.agencyId,

          status:
            'OPEN',
        },

        orderBy: {
          createdAt:
            'desc',
        },

        take:
          20,
      });


  const canManage =
    hasPermission(
      user,
      'settings.manage'
    );


  return (
    <div className="space-y-5">

      <section className="rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8">

        <div className="flex items-center justify-between gap-6">

          <div>
            <div className="flex items-center gap-2 text-blue-300">
              <Sparkles
                size={15}
              />

              <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                Inteligência operacional
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black">
              Secretária IA
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Converse naturalmente por texto ou áudio. Ela consulta métricas, publicações, aprovações e Google Agenda.
            </p>
          </div>


          <div className="flex items-center gap-3">
            {
              canManage
                ? (
                  <Link
                    href="/secretaria/configuracoes"
                    className="hidden items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-[10px] font-black text-white hover:bg-white/15 sm:inline-flex"
                  >
                    <Settings
                      size={14}
                    />

                    WhatsApp
                  </Link>
                )
                : null
            }

            <div className="hidden h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-blue-200 sm:flex">
              <Bot
                size={30}
              />
            </div>
          </div>

        </div>

      </section>


      <SecretaryClient
        initialThreadId={
          thread?.id ||
          null
        }

        initialMessages={
          messages
            .reverse()
            .map(
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
            )
        }

        initialPendingAction={
          pending
            ? {
                id:
                  pending.id,

                type:
                  pending.type,

                payload:
                  pending
                    .payload as
                    unknown as
                    Record<
                      string,
                      unknown
                    >,

                expiresAt:
                  pending
                    .expiresAt
                    ?.toISOString() ||
                  null,
              }
            : null
        }

        alerts={
          alerts.map(
            (
              alert
            ) => ({
              id:
                alert.id,

              title:
                alert.title,

              message:
                alert.message,

              severity:
                alert.severity,
            })
          )
        }
      />

    </div>
  );
}
