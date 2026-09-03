import {
  Ban,
  CheckCircle2,
  Clock3,
  KeyRound,
  Settings2,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  prisma,
} from "@/lib/prisma";

import {
  getEffectivePermissions,
  requirePermission,
} from "@/lib/userAccess";

import {
  InviteEmployeeForm,
} from "./InviteEmployeeForm";

import {
  InviteCopyButton,
} from "./InviteCopyButton";
import {
  DeleteEmployeeButton,
} from "./DeleteEmployeeButton";

import {
  deactivateEmployeeAction,
  reactivateEmployeeAction,
  regenerateInviteAction,
  updateEmployeeAccessAction,
} from "./actions";


const ROLE_LABELS:
  Record<
    string,
    string
  > = {

  DIRECTOR:
    "Administrador",

  SOCIAL_MEDIA:
    "Social Media",

  DESIGN:
    "Design",

  FILMMAKER:
    "Filmaker",
};


const PERMISSION_OPTIONS = [
  [
    "dashboard.view",
    "Dashboard",
  ],

  [
    "social.view",
    "Ver Social",
  ],

  [
    "social.manage",
    "Gerenciar Social",
  ],

  [
    "design.view",
    "Ver Design",
  ],

  [
    "design.manage",
    "Gerenciar Design",
  ],

  [
    "filmmaker.view",
    "Ver Filmmaker",
  ],

  [
    "filmmaker.manage",
    "Gerenciar Filmmaker",
  ],

  [
    "crm.view",
    "Ver CRM",
  ],

  [
    "crm.manage",
    "Gerenciar CRM",
  ],
] as const;


function statusLabel(
  status:
    string
) {
  if (
    status ===
    "APROVADO"
  ) {
    return "Ativo";
  }

  if (
    status ===
    "PENDENTE"
  ) {
    return "Convite pendente";
  }

  if (
    status ===
    "INATIVO"
  ) {
    return "Inativo";
  }

  return status;
}


function statusClass(
  status:
    string
) {
  if (
    status ===
    "APROVADO"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    status ===
    "PENDENTE"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-500";
}


export default async function TeamAccessPage({
  searchParams,
}: {
  searchParams?:
    Promise<{
      error?:
        string;

      created?:
        string;
    }>;
}) {
  const currentUser =
    await requirePermission(
      "users.manage"
    );


  const params =
    searchParams
      ? await searchParams
      : {};


  const users =
    await prisma.user.findMany({
      where: {
        agencyId:
          currentUser.agencyId,
      },

      orderBy: [
        {
          role:
            "asc",
        },

        {
          createdAt:
            "desc",
        },
      ],
    });


  const administrators =
    users.filter(
      (
        user
      ) =>
        user.role ===
        "DIRECTOR"
    );


  const employees =
    users.filter(
      (
        user
      ) =>
        user.role !==
        "DIRECTOR"
    );


  const activeCount =
    employees.filter(
      (
        user
      ) =>
        user.status ===
        "APROVADO"
    ).length;


  const pendingCount =
    employees.filter(
      (
        user
      ) =>
        user.status ===
        "PENDENTE"
    ).length;


  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-600">
            Configurações
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Equipe e acessos
          </h1>

          <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-500">
            Convide funcionários e determine exatamente quais áreas do AprovUp cada conta pode visualizar e gerenciar.
          </p>
        </div>


        <div className="flex flex-wrap gap-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-lg font-bold leading-none text-slate-900">
              {employees.length}
            </p>

            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.07em] text-slate-400">
              Funcionários
            </p>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-lg font-bold leading-none text-emerald-700">
              {activeCount}
            </p>

            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.07em] text-emerald-500">
              Ativos
            </p>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="text-lg font-bold leading-none text-amber-700">
              {pendingCount}
            </p>

            <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.07em] text-amber-500">
              Convites
            </p>
          </div>
        </div>
      </section>


      {params?.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-bold text-red-700">
          Não foi possível concluir a ação. Verifique os dados e tente novamente.
        </div>
      ) : null}


      <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <ShieldCheck
              size={
                16
              }
            />
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-900">
              Conta administradora
            </p>

            <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
              A conta Administrador possui acesso total e não pode remover acidentalmente as próprias permissões.
            </p>
          </div>
        </div>
      </section>


      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white">
            <UsersRound
              size={
                16
              }
            />
          </div>

          <div>
            <h2 className="text-[12px] font-bold text-slate-900">
              Convidar funcionário
            </h2>

            <p className="mt-0.5 text-[9px] text-slate-400">
              O funcionário receberá um link para criar a própria senha.
            </p>
          </div>
        </div>

        <InviteEmployeeForm />
      </section>


      <section className="space-y-3">
        <div>
          <h2 className="text-[12px] font-bold text-slate-900">
            Administradores
          </h2>

          <p className="mt-0.5 text-[9px] text-slate-400">
            Contas com acesso completo ao sistema.
          </p>
        </div>


        <div className="grid gap-3 lg:grid-cols-2">
          {administrators.map(
            (
              user
            ) => (
              <article
                key={
                  user.id
                }
                className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <ShieldCheck
                        size={
                          16
                        }
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-slate-900">
                        {user.name ||
                          "Administrador"}
                      </p>

                      <p className="truncate text-[9px] text-slate-400">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-[8px] font-bold text-blue-600">
                    ACESSO TOTAL
                  </span>
                </div>

                {user.id ===
                currentUser.id ? (
                  <p className="mt-3 text-[8px] font-bold uppercase tracking-[0.08em] text-blue-500">
                    Esta é sua conta
                  </p>
                ) : null}
                {/* DIRECTOR_INVITE_BLOCK */}
                {user.status ===
                  "PENDENTE" &&
                user.inviteToken ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 p-2.5">
                    <Clock3
                      size={
                        13
                      }
                      className="text-amber-600"
                    />

                    <span className="text-[9px] font-semibold text-amber-700">
                      Aguardando criação da senha
                    </span>

                    <InviteCopyButton
                      token={
                        user.inviteToken
                      }
                    />

                    <form
                      action={
                        regenerateInviteAction.bind(
                          null,
                          user.id
                        )
                      }
                    >
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 text-[9px] font-bold text-amber-700 hover:bg-amber-50"
                      >
                        <KeyRound
                          size={
                            11
                          }
                        />

                        Novo link
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            )
          )}
        </div>
      </section>


      <section className="space-y-3">
        <div>
          <h2 className="text-[12px] font-bold text-slate-900">
            Funcionários
          </h2>

          <p className="mt-0.5 text-[9px] text-slate-400">
            Edite cargo, situação e permissões individualmente.
          </p>
        </div>


        {employees.length ===
        0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <UserRound
              size={
                22
              }
              className="mx-auto text-slate-300"
            />

            <p className="mt-3 text-[10px] font-semibold text-slate-400">
              Nenhum funcionário cadastrado.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map(
              (
                user
              ) => {
                const effective =
                  getEffectivePermissions(
                    user
                  );


                return (
                  <article
                    key={
                      user.id
                    }
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[12px] font-bold text-slate-900">
                            {user.name ||
                              "Funcionário"}
                          </h3>

                          <span
                            className={[
                              "rounded-md",
                              "border",
                              "px-2",
                              "py-1",
                              "text-[8px]",
                              "font-bold",
                              statusClass(
                                user.status
                              ),
                            ].join(
                              " "
                            )}
                          >
                            {statusLabel(
                              user.status
                            )}
                          </span>

                          <span className="rounded-md bg-slate-100 px-2 py-1 text-[8px] font-bold text-slate-500">
                            {ROLE_LABELS[
                              user.role
                            ] ||
                              user.role}
                          </span>
                        </div>

                        <p className="mt-1 text-[9px] text-slate-400">
                          {user.email}
                        </p>


                        {user.status ===
                          "PENDENTE" &&
                        user.inviteToken ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 p-2.5">
                            <Clock3
                              size={
                                13
                              }
                              className="text-amber-600"
                            />

                            <span className="text-[9px] font-semibold text-amber-700">
                              Aguardando criação da senha
                            </span>

                            <InviteCopyButton
                              token={
                                user.inviteToken
                              }
                            />

                            <form
                              action={
                                regenerateInviteAction.bind(
                                  null,
                                  user.id
                                )
                              }
                            >
                              <button
                                type="submit"
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 text-[9px] font-bold text-amber-700 hover:bg-amber-50"
                              >
                                <KeyRound
                                  size={
                                    11
                                  }
                                />

                                Novo link
                              </button>
                            </form>
                          </div>
                        ) : null}
                      </div>


                      <form
                        action={
                          updateEmployeeAccessAction.bind(
                            null,
                            user.id
                          )
                        }
                        className="w-full xl:max-w-[720px]"
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            name="role"
                            defaultValue={
                              user.role
                            }
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-700"
                          >
                            <option value="SOCIAL_MEDIA">
                              Social Media
                            </option>

                            <option value="DESIGN">
                              Design
                            </option>

                            <option value="FILMMAKER">
                              Filmaker
                            </option>
                          </select>


                          <select
                            name="status"
                            defaultValue={
                              user.status ===
                              "RECUSADO"
                                ? "INATIVO"
                                : user.status
                            }
                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[9px] font-semibold text-slate-700"
                          >
                            <option value="APROVADO">
                              Ativo
                            </option>

                            <option value="PENDENTE">
                              Convite pendente
                            </option>

                            <option value="INATIVO">
                              Inativo
                            </option>
                          </select>
                        </div>


                        <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                          {PERMISSION_OPTIONS.map(
                            (
                              [
                                value,
                                label,
                              ]
                            ) => (
                              <label
                                key={
                                  value
                                }
                                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
                              >
                                <input
                                  type="checkbox"
                                  name="permissions"
                                  value={
                                    value
                                  }
                                  defaultChecked={
                                    effective.includes(
                                      value
                                    )
                                  }
                                />

                                <span className="text-[8px] font-semibold text-slate-600">
                                  {label}
                                </span>
                              </label>
                            )
                          )}
                        </div>


                        <div className="mt-2 flex flex-wrap justify-end gap-2">
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[9px] font-bold text-white hover:bg-blue-700"
                          >
                            <Settings2
                              size={
                                11
                              }
                            />

                            Salvar permissões
                          </button>


                          {user.status ===
                          "INATIVO" ? (
                            <button
                              formAction={
                                reactivateEmployeeAction.bind(
                                  null,
                                  user.id
                                )
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[9px] font-bold text-emerald-700"
                            >
                              <CheckCircle2
                                size={
                                  11
                                }
                              />

                              Reativar
                            </button>
                          ) : (
                            <button
                              formAction={
                                deactivateEmployeeAction.bind(
                                  null,
                                  user.id
                                )
                              }
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[9px] font-bold text-red-700"
                            >
                              <Ban
                                size={
                                  11
                                }
                              />

                              Desativar
                            </button>
                          )}
                          <DeleteEmployeeButton
                            userId={user.id}
                            userName={
                              user.name ||
                              user.email ||
                              "Funcionário"
                            }
                          />

                        </div>
                      </form>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}