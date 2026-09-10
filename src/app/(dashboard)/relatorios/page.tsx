import Link from "next/link";

import {
  FileDown,
  FileText,
  LayoutTemplate,
  Settings2,
} from "lucide-react";

import {
  requireCurrentUser,
} from "@/lib/auth";

import {
  canAccessClient,
} from "@/lib/clientAccess";

import {
  prisma,
} from "@/lib/prisma";

import {
  requireSaasFeature,
} from "@/lib/saasAccess";

import {
  hasPermission,
} from "@/lib/userAccess";

import {
  ReportGenerator,
} from "./ReportGenerator";


export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";


export default async function RelatoriosPage() {
  await requireSaasFeature("reports");

  const currentUser =
    await requireCurrentUser();

  const [
    candidateClients,
    templates,
  ] = await Promise.all([
    prisma.client.findMany({
      where: {
        agencyId:
          currentUser.agencyId,
      },
      select: {
        id: true,
        name: true,
        agencyId: true,
        internalResponsible: true,
        instagramConnection: {
          select: {
            username: true,
            status: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    }),

    prisma.reportTemplate.findMany({
      where: {
        agencyId:
          currentUser.agencyId,
        status:
          "ATIVO",
      },
      select: {
        id: true,
        name: true,
        isDefault: true,
        elements: true,
        originalFileName: true,
      },
      orderBy: [
        {
          isDefault:
            "desc",
        },
        {
          createdAt:
            "desc",
        },
      ],
    }),
  ]);

  const clients =
    candidateClients
      .filter(
        (client) =>
          canAccessClient(
            currentUser,
            client
          )
      )
      .map(
        (client) => ({
          id:
            client.id,
          name:
            client.name,
          instagramUsername:
            client.instagramConnection?.username ||
            null,
          instagramConnected:
            client.instagramConnection?.status ===
            "ATIVO",
        })
      );

  const reportTemplates =
    templates.map(
      (template) => ({
        id:
          template.id,
        name:
          template.name,
        isDefault:
          template.isDefault,
        originalFileName:
          template.originalFileName,
        elementCount:
          Array.isArray(
            template.elements
          )
            ? template.elements.length
            : 0,
      })
    );

  const canManageTemplates =
    hasPermission(
      currentUser,
      "settings.manage"
    );

  const connectedCount =
    clients.filter(
      (client) =>
        client.instagramConnected
    ).length;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-7 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                <FileDown size={20} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                  AprovUp Reports
                </p>

                <h1 className="mt-0.5 text-3xl font-bold tracking-tight text-white">
                  Relatórios
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300">
              Gere o relatório do cliente usando o layout white-label da agência e as métricas do Instagram conectado.
            </p>
          </div>

          {canManageTemplates ? (
            <Link
              href="/configuracoes/relatorios"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/15"
            >
              <Settings2 size={15} />
              Modelos de relatório
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Clientes disponíveis
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {clients.length}
            </p>
            <FileText size={20} className="text-blue-600" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Instagram conectado
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {connectedCount}
            </p>
            <span className="text-lg font-black text-pink-600">
              @
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Layouts cadastrados
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-3xl font-bold text-slate-900">
              {reportTemplates.length}
            </p>
            <LayoutTemplate size={20} className="text-violet-600" />
          </div>
        </div>
      </section>

      <ReportGenerator
        clients={clients}
        templates={reportTemplates}
        canManageTemplates={canManageTemplates}
      />
    </div>
  );
}
