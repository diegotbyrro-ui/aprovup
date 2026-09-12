import Link from "next/link";

import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  KeyRound,
  MessageCircleMore,
  Pause,
  Smartphone,
  Trash2,
  UsersRound,
} from "lucide-react";

import {
  prisma,
} from "@/lib/prisma";

import {
  requirePermission,
} from "@/lib/userAccess";

import {
  decryptMetaSecret,
} from "@/lib/metaCrypto";

import {
  deleteWhatsappMemberAction,
  pauseWhatsappConnectionAction,
  regenerateWhatsappVerifyTokenAction,
  saveSecretaryIdentityAction,
  saveWhatsappConnectionAction,
  saveWhatsappMemberAction,
  subscribeWhatsappAppAction,
  testWhatsappConnectionAction,
} from "./actions";


export const dynamic =
  "force-dynamic";


function siteUrl() {
  return String(
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    "https://aprovup.com.br"
  )
    .replace(
      /\/+$/,
      ""
    );
}


export default async function SecretarySettingsPage({
  searchParams,
}: {
  searchParams?:
    Promise<
      Record<
        string,
        string |
        undefined
      >
    >;
}) {
  const user =
    await requirePermission(
      "settings.manage"
    );


  const params =
    searchParams
      ? await searchParams
      : {};


  const [
    connection,
    members,
    users,
  ] =
    await Promise.all([
      prisma
        .secretaryWhatsappConnection
        .findUnique({
          where: {
            agencyId:
              user.agencyId,
          },
        }),

      prisma
        .secretaryWhatsappMember
        .findMany({
          where: {
            agencyId:
              user.agencyId,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        }),

      prisma.user
        .findMany({
          where: {
            agencyId:
              user.agencyId,

            status:
              "APROVADO",
          },

          orderBy: {
            name:
              "asc",
          },

          select: {
            id:
              true,

            name:
              true,

            email:
              true,

            role:
              true,
          },
        }),
    ]);


  let verifyToken =
    "";


  if (
    connection
      ?.encryptedVerifyToken
  ) {
    try {
      verifyToken =
        decryptMetaSecret(
          connection
            .encryptedVerifyToken
        );
    }
    catch {
    }
  }


  const webhookUrl =
    siteUrl() +
    "/api/integrations/whatsapp/webhook";


  const success =
    params.identity ===
      "saved"
      ? "Identidade da secretária salva."
      : params.wa ===
      "connected"
      ? "Conexão validada com a Meta."
      : params.wa ===
          "saved"
        ? "Configuração salva."
        : params.wa ===
            "subscribed"
          ? "Aplicativo inscrito no WABA."
          : params.wa ===
              "verify-regenerated"
            ? "Novo Verify Token gerado."
            : params.member ===
                "saved"
              ? "Número autorizado."
              : null;


  const hasError =
    Boolean(
      params.wa &&
      [
        "test-error",
        "subscribe-error",
        "required",
        "token-required",
        "not-configured",
      ].includes(
        params.wa
      )
    );


  return (
    <div className="space-y-5">

      <header>
        <Link
          href="/secretaria"
          className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-500"
        >
          <ArrowLeft
            size={14}
          />

          Voltar
        </Link>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-950">
              WhatsApp de {
                connection
                  ?.secretaryName
                  ?.trim() ||
                "sua Secretária IA"
              }
            </h1>

            <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-500">
              Conecte o número empresarial, autorize funcionários e ative avisos automáticos.
            </p>
          </div>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-black text-slate-600">
            {
              connection
                ?.status ||
              "NÃO CONFIGURADO"
            }
          </span>
        </div>
      </header>


      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[10px] font-bold text-emerald-700">
          {success}
        </div>
      ) : null}


      {hasError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-bold text-red-700">
          A Meta recusou a operação ou faltam dados. Confira WABA ID, Phone Number ID, token e permissões do aplicativo.
        </div>
      ) : null}



      <form
        action={
          saveSecretaryIdentityAction
        }
        className="rounded-2xl border border-violet-200 bg-gradient-to-br from-white to-violet-50/60 p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-500">
              Identidade da secretária
            </p>

            <h2 className="mt-1 text-[15px] font-black text-slate-950">
              Como ela se apresenta
            </h2>

            <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
              Esses dados são usados no AprovUp e nas respostas enviadas pelo WhatsApp.
            </p>
          </div>

          <button className="h-10 rounded-lg bg-violet-600 px-5 text-[10px] font-black text-white">
            Salvar identidade
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
              Nome da secretária
            </span>

            <input
              name="secretaryName"
              maxLength={80}
              defaultValue={
                connection
                  ?.secretaryName ||
                ""
              }
              placeholder="Ex.: Liv"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-900 outline-none focus:border-violet-400"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
              Empresa que ela representa
            </span>

            <input
              name="secretaryCompanyName"
              maxLength={160}
              defaultValue={
                connection
                  ?.secretaryCompanyName ||
                ""
              }
              placeholder="Ex.: Level UP Marketing Digital"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-900 outline-none focus:border-violet-400"
            />
          </label>
        </div>


        <div className="mt-4 grid gap-4 rounded-2xl border border-violet-100 bg-white/80 p-4 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
          <div className="flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-3xl border border-violet-100 bg-violet-100 text-2xl font-black text-violet-700">
            {connection?.secretaryAvatarUrl ? (
              <img
                src={connection.secretaryAvatarUrl}
                alt={`Foto de ${connection.secretaryName || "Secretária"}`}
                className="h-full w-full object-cover"
              />
            ) : (
              connection?.secretaryName?.trim().charAt(0) || "IA"
            )}
          </div>

          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400">
              Foto da secretária
            </p>

            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              Envie JPG, PNG ou WebP de até 5 MB. De preferência uma imagem quadrada.
            </p>

            <input
              type="file"
              name="secretaryAvatar"
              accept="image/jpeg,image/png,image/webp"
              className="mt-3 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:text-[9px] file:font-black file:text-white"
            />

            {connection?.secretaryAvatarUrl ? (
              <label className="mt-3 flex items-center gap-2 text-[9px] font-bold text-red-600">
                <input
                  type="checkbox"
                  name="removeAvatar"
                />
                Remover foto atual ao salvar
              </label>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-[9px] leading-relaxed text-slate-500">
          Exemplo: “Sou a Liv, assistente virtual e secretária da Level UP Marketing Digital.”
        </p>
      </form>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">

        <form
          action={
            saveWhatsappConnectionAction
          }
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <MessageCircleMore
              size={20}
              className="text-emerald-600"
            />

            <div>
              <h2 className="text-[12px] font-black text-slate-950">
                WhatsApp Business Platform
              </h2>

              <p className="text-[9px] text-slate-400">
                O token fica criptografado no banco.
              </p>
            </div>
          </div>


          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <input
              name="wabaId"
              required
              defaultValue={
                connection
                  ?.wabaId ||
                ""
              }
              placeholder="WABA ID"
              className="h-10 rounded-lg border border-slate-200 px-3 text-[10px]"
            />

            <input
              name="phoneNumberId"
              required
              defaultValue={
                connection
                  ?.phoneNumberId ||
                ""
              }
              placeholder="Phone Number ID"
              className="h-10 rounded-lg border border-slate-200 px-3 text-[10px]"
            />

            <input
              name="displayPhoneNumber"
              defaultValue={
                connection
                  ?.displayPhoneNumber ||
                ""
              }
              placeholder="Número exibido"
              className="h-10 rounded-lg border border-slate-200 px-3 text-[10px]"
            />

            <input
              name="graphVersion"
              defaultValue={
                connection
                  ?.graphVersion ||
                process.env
                  .META_GRAPH_VERSION ||
                "v26.0"
              }
              placeholder="v26.0"
              className="h-10 rounded-lg border border-slate-200 px-3 text-[10px]"
            />

            <input
              name="accessToken"
              type="password"
              placeholder={
                connection
                  ?.encryptedAccessToken
                  ? "Deixe vazio para manter o token atual"
                  : "Access Token"
              }
              className="h-10 rounded-lg border border-slate-200 px-3 text-[10px] sm:col-span-2"
            />
          </div>


          <div className="mt-5 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2">
              <BellRing
                size={15}
                className="text-blue-600"
              />

              <p className="text-[10px] font-black text-slate-900">
                Mensagens proativas
              </p>
            </div>

            <p className="mt-1 text-[9px] leading-relaxed text-slate-400">
              Fora da janela de 24h, use um template aprovado com dois parâmetros: título e mensagem.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                name="alertTemplateName"
                defaultValue={
                  connection
                    ?.alertTemplateName ||
                  ""
                }
                placeholder="aprovup_secretaria_alerta"
                className="h-10 rounded-lg border border-slate-200 px-3 text-[10px]"
              />

              <input
                name="alertTemplateLanguage"
                defaultValue={
                  connection
                    ?.alertTemplateLanguage ||
                  "pt_BR"
                }
                className="h-10 rounded-lg border border-slate-200 px-3 text-[10px]"
              />
            </div>

            <label className="mt-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-[9px] text-blue-700">
              <input
                type="checkbox"
                name="proactiveEnabled"
                defaultChecked={
                  connection
                    ?.proactiveEnabled ||
                  false
                }
              />

              Ativar alertas de publicação, aprovações paradas e resumo diário.
            </label>
          </div>


          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button className="h-10 rounded-lg bg-slate-950 px-5 text-[10px] font-black text-white">
              Salvar
            </button>

            {connection ? (
              <>
                <button
                  formAction={
                    testWhatsappConnectionAction
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-[10px] font-black text-emerald-700"
                >
                  <CheckCircle2
                    size={13}
                  />

                  Validar
                </button>

                <button
                  formAction={
                    pauseWhatsappConnectionAction
                  }
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-[10px] font-black text-slate-600"
                >
                  <Pause
                    size={13}
                  />

                  Pausar
                </button>
              </>
            ) : null}
          </div>
        </form>


        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[11px] font-black text-slate-900">
              Webhook da Meta
            </h2>

            <p className="mt-3 text-[8px] font-black uppercase text-slate-400">
              Callback URL
            </p>

            <code className="mt-1 block break-all rounded-lg bg-slate-950 p-3 text-[9px] text-white">
              {webhookUrl}
            </code>

            <p className="mt-3 text-[8px] font-black uppercase text-slate-400">
              Verify Token
            </p>

            <code className="mt-1 block break-all rounded-lg bg-slate-100 p-3 text-[9px] text-slate-700">
              {
                verifyToken ||
                "Salve a configuração para gerar."
              }
            </code>

            {connection ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <form
                  action={
                    regenerateWhatsappVerifyTokenAction
                  }
                >
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[9px] font-bold">
                    <KeyRound
                      size={12}
                    />

                    Novo token
                  </button>
                </form>

                <form
                  action={
                    subscribeWhatsappAppAction
                  }
                >
                  <button className="h-9 rounded-lg border border-blue-200 bg-blue-50 px-3 text-[9px] font-bold text-blue-700">
                    Inscrever app no WABA
                  </button>
                </form>
              </div>
            ) : null}
          </section>


          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-black text-amber-800">
              Grupo da empresa
            </p>

            <p className="mt-1 text-[9px] leading-relaxed text-amber-700">
              O AprovUp usa apenas endpoints documentados. Enquanto a modalidade de grupo empresarial não estiver liberada para sua conta/provedor, os avisos são enviados individualmente aos membros selecionados.
            </p>
          </section>
        </div>

      </div>


      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <UsersRound
            size={18}
            className="text-blue-600"
          />

          <div>
            <h2 className="text-[12px] font-black text-slate-950">
              Equipe autorizada no WhatsApp
            </h2>

            <p className="text-[9px] text-slate-400">
              O telefone é associado a um usuário real e às permissões dele.
            </p>
          </div>
        </div>


        <form
          action={
            saveWhatsappMemberAction
          }
          className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <select
            name="userId"
            required
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[10px]"
          >
            <option value="">
              Usuário do AprovUp
            </option>

            {users.map(
              (
                item
              ) => (
                <option
                  key={
                    item.id
                  }
                  value={
                    item.id
                  }
                >
                  {
                    item.name ||
                    item.email ||
                    item.id
                  } — {
                    item.role
                  }
                </option>
              )
            )}
          </select>

          <input
            name="phoneE164"
            required
            placeholder="5582999999999"
            className="h-10 rounded-lg border border-slate-200 px-3 text-[10px]"
          />

          <input
            name="displayName"
            placeholder="Nome"
            className="h-10 rounded-lg border border-slate-200 px-3 text-[10px]"
          />

          <button className="h-10 rounded-lg bg-blue-600 px-5 text-[10px] font-black text-white">
            Autorizar
          </button>

          <div className="flex flex-wrap gap-4 lg:col-span-4">
            <label className="flex items-center gap-2 text-[9px] font-semibold text-slate-600">
              <input
                type="checkbox"
                name="canUseSecretary"
                defaultChecked
              />

              Pode conversar
            </label>

            <label className="flex items-center gap-2 text-[9px] font-semibold text-slate-600">
              <input
                type="checkbox"
                name="canConfirmActions"
              />

              Pode confirmar ações
            </label>

            <label className="flex items-center gap-2 text-[9px] font-semibold text-slate-600">
              <input
                type="checkbox"
                name="receiveAlerts"
              />

              Recebe alertas
            </label>
          </div>
        </form>


        <div className="mt-5 space-y-2">
          {members.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-[10px] text-slate-400">
              Nenhum número autorizado.
            </div>
          ) : members.map(
            (
              member
            ) => (
              <div
                key={
                  member.id
                }
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Smartphone
                    size={15}
                    className="text-slate-400"
                  />

                  <div>
                    <p className="text-[10px] font-black text-slate-900">
                      {
                        member.displayName ||
                        member.phoneE164
                      }
                    </p>

                    <p className="text-[9px] text-slate-400">
                      +{
                        member.phoneE164
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {member.canUseSecretary ? (
                    <span className="rounded bg-blue-50 px-2 py-1 text-[8px] font-bold text-blue-600">
                      IA
                    </span>
                  ) : null}

                  {member.canConfirmActions ? (
                    <span className="rounded bg-violet-50 px-2 py-1 text-[8px] font-bold text-violet-600">
                      AÇÕES
                    </span>
                  ) : null}

                  {member.receiveAlerts ? (
                    <span className="rounded bg-amber-50 px-2 py-1 text-[8px] font-bold text-amber-700">
                      ALERTAS
                    </span>
                  ) : null}

                  <form
                    action={
                      deleteWhatsappMemberAction.bind(
                        null,
                        member.id
                      )
                    }
                  >
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600">
                      <Trash2
                        size={12}
                      />
                    </button>
                  </form>
                </div>
              </div>
            )
          )}
        </div>
      </section>

    </div>
  );
}
