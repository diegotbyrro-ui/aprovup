import Link from "next/link";

import { prisma } from "@/lib/prisma";
import {
  hasAnyPermission,
} from "@/lib/userAccess";

import {
  isDirector,
  isSocialMedia,
  requireCurrentUser,
} from "@/lib/auth";

import {
  canAccessClient,
} from "@/lib/clientAccess";

import {
  redirect,
} from "next/navigation";

import { createEmergencyDemandAction } from "./actions";

import {
  ReferenceAttachmentsField,
} from "@/components/content/ReferenceAttachmentsField";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100";

const labelClass =
  "mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500";

export default async function NovaDemandaEmergencialPage({
  searchParams,
}: {
  searchParams: Promise<{
    cliente?: string;
    error?: string;
  }>;
}) {
  const currentUser =
    await requireCurrentUser();


  const canCreateEmergency =
    isDirector(
      currentUser.role
    ) ||
    isSocialMedia(
      currentUser.role
    ) ||
    hasAnyPermission(
      currentUser,
      [
        "social.view",
        "social.manage",
      ]
    );


  if (
    !canCreateEmergency
  ) {
    redirect(
      "/acesso-bloqueado"
    );
  }

  const query =
    await searchParams;

  const allClients =
    await prisma.client.findMany({
      where: {
        agencyId:
          currentUser.agencyId,
      },

      orderBy: {
        name: "asc",
      },
    });

  const clients =
    allClients.filter(
      (
        client
      ) =>
        canAccessClient(
          currentUser,
          client
        )
    );



  const requestedClient =
    String(
      query.cliente || ""
    ).trim();

  const selectedClient =
    clients.some(
      (client) =>
        client.id ===
        requestedClient
    )
      ? requestedClient
      : "";

  const requester =
    currentUser.name ||
    currentUser.email ||
    "Social Media";

  const backHref =
    selectedClient
      ? `/calendario-editorial?cliente=${selectedClient}`
      : "/clientes";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative z-10">
          <Link
            href={backHref}
            className="text-sm font-bold text-red-200 hover:underline"
          >
            ← Voltar
          </Link>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-red-300">
            Fluxo direto de produção
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Demanda Emergencial
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            Use este formulário para demandas urgentes que precisam entrar
            diretamente em produção, sem aguardar a aprovação inicial
            do cliente.
          </p>
        </div>
      </section>

      {query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          Preencha todos os campos obrigatórios antes de enviar a demanda.
        </div>
      ) : null}

      <form
        action={createEmergencyDemandAction}
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
      >
        <div className="border-b border-slate-100 pb-5">
          <h2 className="text-xl font-black text-slate-900">
            Informações da demanda
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            A demanda será enviada imediatamente para a área escolhida.
          </p>
        </div>

        <div>
          <label className={labelClass}>
            Cliente
          </label>

          <select
            name="clientId"
            required
            defaultValue={selectedClient}
            className={fieldClass}
          >
            <option
              value=""
              disabled
            >
              Selecione o cliente
            </option>

            {clients.map(
              (client) => (
                <option
                  key={client.id}
                  value={client.id}
                >
                  {client.name}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Título
          </label>

          <input
            name="title"
            required
            type="text"
            placeholder="Ex: Criar arte urgente para promoção de amanhã"
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            Conteúdo / direcionamento
          </label>

          <textarea
            name="briefing"
            required
            rows={7}
            placeholder="Explique exatamente o que precisa ser produzido, informações obrigatórias, referências e orientações."
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            Link do arquivo / material em alta qualidade
          </label>

          <input
            name="fileLinks"
            type="url"
            placeholder="Ex: https://drive.google.com/... ou link do WeTransfer / Dropbox"
            className={fieldClass}
          />

          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Use este campo quando o arquivo for muito pesado ou quando precisar enviar o material original em alta qualidade para a produção.
          </p>
        </div>

        <ReferenceAttachmentsField
          existing={[]}
        />

        <div>
          <label className={labelClass}>
            Legenda
          </label>

          <textarea
            name="caption"
            rows={5}
            placeholder="Legenda do conteúdo, caso já esteja definida."
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <label className={labelClass}>
              Quem está pedindo
            </label>

            <input
              name="requester"
              required
              type="text"
              defaultValue={requester}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Para quem
            </label>

            <select
              name="area"
              required
              defaultValue=""
              className={fieldClass}
            >
              <option
                value=""
                disabled
              >
                Selecione
              </option>

              <option value="DESIGN">
                Design
              </option>

              <option value="FILMMAKER">
                Filmmaker
              </option>
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Data limite da entrega
            </label>

            <input
              name="deadline"
              required
              type="date"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <p className="text-sm font-black text-red-800">
            Esta demanda entra diretamente em produção.
          </p>

          <p className="mt-1 text-xs leading-relaxed text-red-600">
            Ao clicar em enviar, ela entra diretamente nas demandas do
            Design ou do Filmmaker com prioridade urgente e o prazo informado.
            Quando o material ficar pronto, a LIV avisará a Social Media
            responsável para revisar e encaminhar ao cliente.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-700"
          >
            Enviar demanda emergencial
          </button>
        </div>
      </form>
    </div>
  );
}