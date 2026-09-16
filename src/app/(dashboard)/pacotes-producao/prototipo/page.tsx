import Link from "next/link";

import {
  prisma,
} from "@/lib/prisma";

import {
  requireAgencyContext,
} from "@/lib/tenant";

import {
  listAprovUpReferenceFiles,
} from "@/lib/aprovupStorage";

import {
  ProductionBatchWorkspacePrototype,
} from "@/components/kanban/ProductionBatchWorkspacePrototype";


const monthNames = [
  "",
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];


function belongsToPeriod(
  value:
    Date | null,
  month:
    number,
  year:
    number
) {
  if (!value) {
    return false;
  }

  const parts =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        timeZone:
          "America/Maceio",

        month:
          "numeric",

        year:
          "numeric",
      }
    ).formatToParts(
      value
    );

  const parsedMonth =
    Number(
      parts.find(
        (
          part
        ) =>
          part.type ===
          "month"
      )?.value ||
      0
    );

  const parsedYear =
    Number(
      parts.find(
        (
          part
        ) =>
          part.type ===
          "year"
      )?.value ||
      0
    );

  return (
    parsedMonth ===
      month &&
    parsedYear ===
      year
  );
}


export default async function ProductionBatchPrototypePage({
  searchParams,
}: {
  searchParams:
    Promise<{
      cliente?:
        string;

      area?:
        string;

      mes?:
        string;

      ano?:
        string;
    }>;
}) {
  const {
    agencyId,
  } =
    await requireAgencyContext();


  const params =
    await searchParams;


  const clientId =
    String(
      params.cliente ||
      ""
    );


  const area =
    params.area ===
    "FILMMAKER"
      ? "FILMMAKER"
      : "DESIGN";


  const month =
    Number(
      params.mes ||
      0
    );


  const year =
    Number(
      params.ano ||
      0
    );


  const client =
    await prisma.client.findFirst({
      where: {
        id:
          clientId,

        agencyId,
      },

      select: {
        id:
          true,

        name:
          true,
      },
    });


  if (
    !client ||
    month <
      1 ||
    month >
      12 ||
    year <
      2020
  ) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h1 className="font-black text-red-700">
            Pacote inválido
          </h1>

          <p className="mt-2 text-sm text-red-600">
            Não foi possível localizar este pacote de produção.
          </p>
        </div>
      </div>
    );
  }


  const rawContents =
    await prisma.content.findMany({
      where: {
        clientId:
          client.id,

        area,

        status:
          "APROVADO",
      },

      orderBy: [
        {
          plannedDate:
            "asc",
        },

        {
          createdAt:
            "asc",
        },
      ],
    });


  const contents =
    rawContents.filter(
      (
        content
      ) =>
        content.format !==
          "DEMANDA_EMERGENCIAL" &&
        !(
          area ===
            "DESIGN" &&
          content.format ===
            "DESIGN_GRAFICO"
        ) &&
        belongsToPeriod(
          content.plannedDate,
          month,
          year
        )
    );


  const packageItems =
    await Promise.all(
      contents.map(
        async (
          content
        ) => {
          const referenceFiles =
            await listAprovUpReferenceFiles(
              content.id
            );

          return {
            id:
              content.id,

            title:
              content.title,

            format:
              content.format ||
              "Conteúdo",

            plannedDate:
              content.plannedDate
                ? content.plannedDate.toISOString()
                : null,

            productionDeadline:
              content.productionDeadline
                ? content.productionDeadline.toISOString()
                : null,

            briefing:
              content.briefing,

            caption:
              content.caption,

            referenceFiles:
              referenceFiles.map(
                (
                  file
                ) => ({
                  name:
                    file.name,

                  originalName:
                    file.originalName,

                  url:
                    file.url,

                  mimeType:
                    file.mimeType,

                  size:
                    file.size,
                })
              ),
          };
        }
      )
    );


  const back =
    area ===
    "FILMMAKER"
      ? `/filmmaker?cliente=${client.id}`
      : `/design?cliente=${client.id}`;


  return (
    <div className="space-y-4 p-6">
      <div>
        <Link
          href={
            back
          }
          className="text-[10px] font-black text-slate-500 hover:text-slate-900"
        >
          ← Voltar para {area === "FILMMAKER" ? "Filmmaker" : "Design"}
        </Link>
      </div>


      <ProductionBatchWorkspacePrototype
        clientName={
          client.name
        }
        area={
          area
        }
        period={
          `${monthNames[month]} ${year}`
        }
        items={
          packageItems
        }
      />
    </div>
  );
}