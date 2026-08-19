"use client";

import {
  useState,
} from "react";

import {
  UserPlus,
} from "lucide-react";

import {
  createEmployeeInviteAction,
} from "./actions";


const PERMISSION_GROUPS = [
  {
    title:
      "Dashboard",

    description:
      "Visualizar o painel geral.",

    permissions: [
      {
        value:
          "dashboard.view",

        label:
          "Visualizar Dashboard",
      },
    ],
  },

  {
    title:
      "Social Media",

    description:
      "Clientes, calendário e aprovação.",

    permissions: [
      {
        value:
          "social.view",

        label:
          "Visualizar área",
      },

      {
        value:
          "social.manage",

        label:
          "Gerenciar conteúdos",
      },
    ],
  },

  {
    title:
      "Design",

    description:
      "Kanban e produção de peças.",

    permissions: [
      {
        value:
          "design.view",

        label:
          "Visualizar área",
      },

      {
        value:
          "design.manage",

        label:
          "Gerenciar Kanban",
      },
    ],
  },

  {
    title:
      "Filmmaker",

    description:
      "Produção audiovisual.",

    permissions: [
      {
        value:
          "filmmaker.view",

        label:
          "Visualizar área",
      },

      {
        value:
          "filmmaker.manage",

        label:
          "Gerenciar produção",
      },
    ],
  },

  {
    title:
      "CRM",

    description:
      "Acesso comercial.",

    permissions: [
      {
        value:
          "crm.view",

        label:
          "Visualizar CRM",
      },

      {
        value:
          "crm.manage",

        label:
          "Gerenciar CRM",
      },
    ],
  },
];


const ROLE_PRESETS:
  Record<
    string,
    string[]
  > = {

  SOCIAL_MEDIA: [
    "dashboard.view",
    "social.view",
    "social.manage",
  ],

  DESIGN: [
    "design.view",
    "design.manage",
  ],

  FILMMAKER: [
    "filmmaker.view",
    "filmmaker.manage",
  ],
};


export function InviteEmployeeForm() {
  const [
    role,
    setRole,
  ] = useState(
    "SOCIAL_MEDIA"
  );


  const [
    selected,
    setSelected,
  ] = useState<
    string[]
  >(
    ROLE_PRESETS
      .SOCIAL_MEDIA
  );


  function changeRole(
    nextRole:
      string
  ) {
    setRole(
      nextRole
    );

    setSelected(
      ROLE_PRESETS[
        nextRole
      ] || []
    );
  }


  function toggle(
    permission:
      string
  ) {
    setSelected(
      (
        current
      ) =>
        current.includes(
          permission
        )
          ? current.filter(
              (
                item
              ) =>
                item !==
                permission
            )
          : [
              ...current,
              permission,
            ]
    );
  }


  return (
    <form
      action={
        createEmployeeInviteAction
      }
      className="space-y-5"
    >
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Nome
          </label>

          <input
            name="name"
            required
            placeholder="Nome do funcionário"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-900 outline-none focus:border-blue-500"
          />
        </div>


        <div>
          <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
            E-mail
          </label>

          <input
            name="email"
            type="email"
            required
            placeholder="nome@empresa.com.br"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-900 outline-none focus:border-blue-500"
          />
        </div>


        <div>
          <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
            Cargo base
          </label>

          <select
            name="role"
            value={
              role
            }
            onChange={
              (
                event
              ) =>
                changeRole(
                  event
                    .target
                    .value
                )
            }
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-900 outline-none focus:border-blue-500"
          >
            <option value="SOCIAL_MEDIA">
              Social Media
            </option>

            <option value="DESIGN">
              Design
            </option>

            <option value="FILMMAKER">
              Filmmaker
            </option>
          </select>
        </div>
      </div>


      <div>
        <div className="mb-3">
          <p className="text-[11px] font-bold text-slate-900">
            Permissões deste funcionário
          </p>

          <p className="mt-1 text-[9px] text-slate-400">
            O cargo define um ponto de partida. Você pode liberar ou remover qualquer área.
          </p>
        </div>


        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {PERMISSION_GROUPS.map(
            (
              group
            ) => (
              <div
                key={
                  group.title
                }
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-[10px] font-bold text-slate-900">
                  {group.title}
                </p>

                <p className="mt-1 min-h-[28px] text-[8px] leading-relaxed text-slate-400">
                  {group.description}
                </p>


                <div className="mt-3 space-y-2">
                  {group.permissions.map(
                    (
                      permission
                    ) => (
                      <label
                        key={
                          permission.value
                        }
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                      >
                        <input
                          type="checkbox"
                          name="permissions"
                          value={
                            permission.value
                          }
                          checked={
                            selected.includes(
                              permission.value
                            )
                          }
                          onChange={
                            () =>
                              toggle(
                                permission.value
                              )
                          }
                          className="mt-0.5"
                        />

                        <span className="text-[9px] font-semibold text-slate-600">
                          {permission.label}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>


      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-[10px] font-bold text-white hover:bg-blue-700"
        >
          <UserPlus
            size={
              14
            }
          />

          Criar convite
        </button>
      </div>
    </form>
  );
}