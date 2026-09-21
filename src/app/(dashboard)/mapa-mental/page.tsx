import Link from "next/link";

import {
  ArrowRight,
  BrainCircuit,
  Clock3,
  Network,
  Plus,
  Users,
} from "lucide-react";

import {
  prisma,
} from "@/lib/prisma";

import {
  canAccessClient,
} from "@/lib/clientAccess";

import {
  hasPermission,
  requirePermission,
} from "@/lib/userAccess";

import {
  createMindMapAction,
} from "./actions";

import {
  DeleteMindMapButton,
} from "./DeleteMindMapButton";


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


function itemCount(
  value: unknown
) {
  return Array.isArray(
    value
  )
    ? value.length
    : 0;
}


export default async function MindMapsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
  }>;
}) {
  const user =
    await requirePermission(
      "mindmap.view"
    );


  const canManage =
    hasPermission(
      user,
      "mindmap.manage"
    );


  const params =
    searchParams
      ? await searchParams
      : {};


  const [
    allMaps,
    allClients,
  ] =
    await Promise.all([
      prisma.mindMap.findMany({
        where: {
          agencyId:
            user.agencyId,
        },

        include: {
          client: {
            select: {
              id:
                true,

              name:
                true,

              logoUrl:
                true,

              agencyId:
                true,

              internalResponsible:
                true,
            },
          },
        },

        orderBy: {
          updatedAt:
            "desc",
        },
      }),

      prisma.client.findMany({
        where: {
          agencyId:
            user.agencyId,
        },

        select: {
          id:
            true,

          name:
            true,

          agencyId:
            true,

          internalResponsible:
            true,
        },

        orderBy: {
          name:
            "asc",
        },
      }),
    ]);


  const maps =
    allMaps.filter(
      (
        map
      ) =>
        !map.client ||
        canAccessClient(
          user,
          map.client
        )
    );


  const clients =
    allClients.filter(
      (
        client
      ) =>
        canAccessClient(
          user,
          client
        )
    );


  return (
    <div className="space-y-6">

      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-7 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">

          <div>
            <div className="flex items-center gap-2 text-blue-300">
              <BrainCircuit
                size={
                  18
                }
              />

              <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
                Estrategia visual
              </p>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Mapa Mental
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
              Organize campanhas, ideias, conteudos e projetos em um canvas visual conectado.
            </p>
          </div>


          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-2xl font-bold text-white">
                {maps.length}
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Mapas
              </p>
            </div>


            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-2xl font-bold text-white">
                {
                  maps.reduce(
                    (
                      total,
                      map
                    ) =>
                      total +
                      itemCount(
                        map.nodes
                      ),
                    0
                  )
                }
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Blocos
              </p>
            </div>

          </div>

        </div>
      </section>


      {params.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Nao foi possivel criar o mapa com o cliente selecionado.
        </div>
      ) : null}


      {canManage ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-4 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Plus
                size={
                  18
                }
              />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Criar novo mapa
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-500">
                Crie um mapa livre ou vinculado a um cliente da agencia.
              </p>
            </div>

          </div>


          <form
            action={
              createMindMapAction
            }
            className="grid gap-3 xl:grid-cols-[1fr_1fr_260px_auto]"
          >

            <input
              name="title"
              placeholder="Titulo do mapa"
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />


            <input
              name="description"
              placeholder="Descricao opcional"
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />


            <select
              name="clientId"
              defaultValue=""
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">
                Sem cliente
              </option>

              {clients.map(
                (
                  client
                ) => (
                  <option
                    key={
                      client.id
                    }
                    value={
                      client.id
                    }
                  >
                    {client.name}
                  </option>
                )
              )}
            </select>


            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <Plus
                size={
                  16
                }
              />

              Criar mapa
            </button>

          </form>

        </section>
      ) : null}


      <section>

        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-900">
            Seus mapas
          </h2>

          <p className="mt-1 text-[10px] text-slate-500">
            As alteracoes sao salvas automaticamente.
          </p>
        </div>


        {maps.length ===
        0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">

            <BrainCircuit
              size={
                28
              }
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 text-sm font-bold text-slate-700">
              Nenhum mapa mental criado ainda.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Crie seu primeiro mapa para organizar ideias e estrategias.
            </p>

          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">

            {maps.map(
              (
                map
              ) => (
                <article
                  key={
                    map.id
                  }
                  className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex min-w-0 items-start gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                        <Network
                          size={
                            19
                          }
                        />
                      </div>


                      <div className="min-w-0">

                        <h3 className="truncate text-base font-bold text-slate-900">
                          {map.title}
                        </h3>

                        <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                          {map.description ||
                            "Mapa visual de ideias e estrategias."}
                        </p>

                      </div>

                    </div>


                    {canManage ? (
                      <DeleteMindMapButton
                        mapId={
                          map.id
                        }
                      />
                    ) : null}

                  </div>


                  <div className="mt-5 grid grid-cols-2 gap-2">

                    <div className="rounded-xl bg-slate-50 px-3 py-3">

                      <div className="flex items-center gap-2 text-slate-400">
                        <Network
                          size={
                            13
                          }
                        />

                        <span className="text-[8px] font-bold uppercase tracking-wider">
                          Blocos
                        </span>
                      </div>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {itemCount(
                          map.nodes
                        )}
                      </p>

                    </div>


                    <div className="rounded-xl bg-slate-50 px-3 py-3">

                      <div className="flex items-center gap-2 text-slate-400">
                        <Users
                          size={
                            13
                          }
                        />

                        <span className="text-[8px] font-bold uppercase tracking-wider">
                          Cliente
                        </span>
                      </div>

                      <p className="mt-1 truncate text-[11px] font-bold text-slate-700">
                        {map.client?.name ||
                          "Mapa livre"}
                      </p>

                    </div>

                  </div>


                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">

                    <div className="flex items-center gap-2 text-[9px] text-slate-400">
                      <Clock3
                        size={
                          12
                        }
                      />

                      <span>
                        {formatDate(
                          map.updatedAt
                        )}
                      </span>
                    </div>


                    <Link
                      href={
                        "/mapa-mental/" +
                        map.id
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-[10px] font-bold text-white transition hover:bg-slate-800"
                    >
                      Abrir mapa

                      <ArrowRight
                        size={
                          13
                        }
                      />
                    </Link>

                  </div>

                </article>
              )
            )}

          </div>
        )}

      </section>

    </div>
  );
}
