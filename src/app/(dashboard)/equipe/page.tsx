import {
  prisma,
} from "@/lib/prisma";

import {
  requirePermission,
} from "@/lib/userAccess";

import {
  PasswordResetLinkButton,
} from "./PasswordResetLinkButton";


export default async function EquipePage() {

  const currentUser =
    await requirePermission(
      "users.manage"
    );


  const users =
    await prisma.user.findMany({
      where: {
        agencyId:
          currentUser.agencyId,
      },

      orderBy: [
        {
          name:
            "asc",
        },
        {
          email:
            "asc",
        },
      ],
    });


  /*
   * Esta acao continua exclusiva de DIRECTOR,
   * independentemente das permissoes personalizadas.
   */
  const canResetPasswords =
    currentUser.role ===
    "DIRECTOR";


  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold text-slate-900">
            Equipe
          </h1>

          <p className="text-slate-500">
            Gerencie os acessos da agência
          </p>

        </div>


        <button className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800">
          Convidar Membro
        </button>

      </div>


      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">

        <table className="w-full border-collapse text-left">

          <thead>

            <tr className="border-b border-slate-200 bg-slate-50 text-sm text-slate-600">

              <th className="p-4 font-medium">
                Nome
              </th>

              <th className="p-4 font-medium">
                E-mail
              </th>

              <th className="p-4 font-medium">
                Cargo/Papel
              </th>

              <th className="p-4 font-medium">
                Status
              </th>

              <th className="p-4 font-medium">
                Ações
              </th>

            </tr>

          </thead>


          <tbody className="divide-y divide-slate-100">

            {users.map(
              (user) => (

                <tr
                  key={user.id}
                  className="align-top transition-colors hover:bg-slate-50"
                >

                  <td className="p-4 font-medium text-slate-900">
                    {user.name || "Sem nome"}
                  </td>


                  <td className="p-4 text-slate-600">
                    {user.email || "Sem e-mail"}
                  </td>


                  <td className="p-4">

                    <span className="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {user.role}
                    </span>

                  </td>


                  <td className="p-4">

                    <span
                      className={
                        user.status ===
                        "APROVADO"

                          ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"

                          : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                      }
                    >
                      {user.status}
                    </span>

                  </td>


                  <td className="p-4">

                    <div className="space-y-3">

                      <button
                        type="button"
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        Editar
                      </button>


                      {canResetPasswords &&
                      user.status ===
                        "APROVADO" ? (

                        <PasswordResetLinkButton
                          userId={user.id}
                          userName={
                            user.name ||
                            user.email ||
                            "usuário"
                          }
                        />

                      ) : null}

                    </div>

                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>


      {canResetPasswords ? (

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">

          <div className="font-bold">
            Redefinição de senha
          </div>

          <div className="mt-1">

            Apenas usuários com cargo DIRECTOR podem gerar links.

            O link expira em 30 minutos, funciona apenas uma vez e um novo link invalida imediatamente o anterior.

          </div>

        </div>

      ) : null}

    </div>
  );
}