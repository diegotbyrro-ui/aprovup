import Link from "next/link";

import {
  prisma,
} from "@/lib/prisma";

import {
  canAccessClient,
} from "@/lib/clientAccess";

import {
  requirePermission,
} from "@/lib/userAccess";

import {
  createGraphicDesignDemandAction,
} from "./actions";


const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

const labelClass =
  "mb-2 block text-xs font-black uppercase tracking-[0.08em] text-slate-500";


export default async function NovaDemandaDesignGraficoPage({
  searchParams,
}: {
  searchParams:
    Promise<{
      cliente?: string;
      error?: string;
    }>;
}) {
  const currentUser =
    await requirePermission(
      "social.manage"
    );


  const query =
    await searchParams;


  const allClients =
    await prisma.client.findMany({
      where: {
        agencyId:
          currentUser.agencyId,
      },

      orderBy: {
        name:
          "asc",
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
      query.cliente ||
      ""
    ).trim();


  const selectedClient =
    clients.some(
      (
        client
      ) =>
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
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10">
          <Link
            href={
              backHref
            }
            className="text-sm font-bold text-violet-200 hover:underline"
          >
            ← Voltar
          </Link>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-violet-300">
            Produção gráfica
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Solicitar Design Gráfico
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            Banners, faixas, folders, adesivos, painéis, materiais impressos e outras peças que não fazem parte do calendário editorial.
          </p>
        </div>
      </section>


      {query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          Não foi possível enviar a solicitação. Confira os campos obrigatórios.
        </div>
      ) : null}


      <form
        action={
          createGraphicDesignDemandAction
        }
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
      >
        <div className="border-b border-slate-100 pb-5">
          <h2 className="text-xl font-black text-slate-900">
            Informações do material
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            A solicitação será enviada diretamente para a aba Design Gráfico.
          </p>
        </div>


        <div>
          <label className={labelClass}>
            Cliente *
          </label>

          <select
            name="clientId"
            required
            defaultValue={
              selectedClient
            }
            className={fieldClass}
          >
            <option
              value=""
              disabled
            >
              Selecione o cliente
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
        </div>


        <div>
          <label className={labelClass}>
            Título da solicitação *
          </label>

          <input
            name="title"
            required
            placeholder="Ex: Faixa para lançamento do empreendimento"
            className={fieldClass}
          />
        </div>


        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <label className={labelClass}>
              Tipo de material *
            </label>

            <select
              name="materialType"
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

              <option value="Banner">
                Banner
              </option>

              <option value="Faixa">
                Faixa
              </option>

              <option value="Flyer / Panfleto">
                Flyer / Panfleto
              </option>

              <option value="Folder">
                Folder
              </option>

              <option value="Cartão / Convite">
                Cartão / Convite
              </option>

              <option value="Adesivo">
                Adesivo
              </option>

              <option value="Painel / Backdrop">
                Painel / Backdrop
              </option>

              <option value="Outdoor / Frontlight">
                Outdoor / Frontlight
              </option>

              <option value="Apresentação">
                Apresentação
              </option>

              <option value="Material impresso">
                Material impresso
              </option>

              <option value="Outro material gráfico">
                Outro
              </option>
            </select>
          </div>


          <div>
            <label className={labelClass}>
              Medidas / formato
            </label>

            <input
              name="dimensions"
              placeholder="Ex: 2,00 x 1,00 m"
              className={fieldClass}
            />
          </div>


          <div>
            <label className={labelClass}>
              Quantidade / versões
            </label>

            <input
              name="quantity"
              placeholder="Ex: 3 versões"
              className={fieldClass}
            />
          </div>
        </div>


        <div>
          <label className={labelClass}>
            Direcionamento / briefing *
          </label>

          <textarea
            name="briefing"
            required
            rows={7}
            placeholder="Descreva textos obrigatórios, informações, aplicação, acabamento, referências e tudo que o Design precisa saber."
            className={fieldClass}
          />
        </div>


        <div>
          <label className={labelClass}>
            Referências / links
          </label>

          <textarea
            name="references"
            rows={3}
            placeholder="Links do Drive, referências visuais, arquivos ou materiais de apoio."
            className={fieldClass}
          />
        </div>


        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <label className={labelClass}>
              Solicitado por
            </label>

            <input
              name="requester"
              defaultValue={
                requester
              }
              className={fieldClass}
            />
          </div>


          <div>
            <label className={labelClass}>
              Prioridade
            </label>

            <select
              name="priority"
              defaultValue="MEDIA"
              className={fieldClass}
            >
              <option value="BAIXA">
                Baixa
              </option>

              <option value="MEDIA">
                Média
              </option>

              <option value="ALTA">
                Alta
              </option>

              <option value="URGENTE">
                Urgente
              </option>
            </select>
          </div>


          <div>
            <label className={labelClass}>
              Data limite da entrega *
            </label>

            <input
              name="deadline"
              required
              type="date"
              className={fieldClass}
            />
          </div>
        </div>


        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
          <p className="text-sm font-black text-violet-900">
            Vai direto para o Design.
          </p>

          <p className="mt-1 text-xs leading-relaxed text-violet-700">
            Esta solicitação não ocupa uma data do calendário editorial. O Design acompanhará pelo prazo de entrega na aba exclusiva Design Gráfico.
          </p>
        </div>


        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-700"
          >
            Enviar para Design
          </button>
        </div>
      </form>
    </div>
  );
}