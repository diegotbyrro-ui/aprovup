import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Camera,
  MinusCircle,
  Sparkles,
  XCircle,
} from "lucide-react";

import {
  getIntegrationHealthSummary,
  type IntegrationHealthItem,
  type IntegrationHealthStatus,
} from "@/lib/integrationHealth";


function statusInfo(
  status:
    IntegrationHealthStatus
) {
  if (
    status ===
    "healthy"
  ) {
    return {
      label:
        "Funcionando",

      badge:
        "border-emerald-200 bg-emerald-50 text-emerald-700",

      icon:
        CheckCircle2,
    };
  }

  if (
    status ===
    "warning"
  ) {
    return {
      label:
        "Atencao",

      badge:
        "border-amber-200 bg-amber-50 text-amber-700",

      icon:
        AlertTriangle,
    };
  }

  if (
    status ===
    "error"
  ) {
    return {
      label:
        "Problema",

      badge:
        "border-red-200 bg-red-50 text-red-700",

      icon:
        XCircle,
    };
  }

  return {
    label:
      "Nao configurado",

    badge:
      "border-slate-200 bg-slate-50 text-slate-500",

    icon:
      MinusCircle,
  };
}


function IntegrationIcon({
  integration,
}: {
  integration:
    IntegrationHealthItem["key"];
}) {
  if (
    integration ===
    "meta"
  ) {
    return (
      <Camera
        size={22}
      />
    );
  }

  if (
    integration ===
    "google"
  ) {
    return (
      <CalendarDays
        size={22}
      />
    );
  }

  if (
    integration ===
    "anthropic"
  ) {
    return (
      <Sparkles
        size={22}
      />
    );
  }

  return (
    <Bot
      size={22}
    />
  );
}


function formatCheckedAt(
  date:
    Date
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
    date
  );
}


export async function IntegrationHealthPanel({
  agencyId,
}: {
  agencyId:
    string;
}) {
  const health =
    await getIntegrationHealthSummary(
      agencyId,
      true
    );

  const hasProblem =
    health.overall !==
    "healthy";

  return (
    <section
      id="saude-integracoes"
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={
              hasProblem
                ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
                : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
            }
          >
            <Activity
              size={21}
            />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">
              {"Sa\u00fade das integra\u00e7\u00f5es"}
            </p>

            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {
                hasProblem
                  ? "Existe pelo menos uma integra\u00e7\u00e3o que precisa de aten\u00e7\u00e3o."
                  : "Meta, Google, OpenAI e Claude s\u00e3o monitorados para antecipar falhas."
              }
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            {"\u00daltima verifica\u00e7\u00e3o"}
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-600">
            {formatCheckedAt(
              health.checkedAt
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {health.items.map(
          (
            item
          ) => {
            const info =
              statusInfo(
                item.status
              );

            const StatusIcon =
              info.icon;

            return (
              <article
                key={
                  item.key
                }
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
                        <IntegrationIcon
                          integration={
                            item.key
                          }
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {item.name}
                        </h3>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${info.badge}`}
                    >
                      <StatusIcon
                        size={12}
                      />

                      {info.label}
                    </span>
                  </div>

                  <p className="mt-4 min-h-[40px] text-xs leading-relaxed text-slate-500">
                    {item.summary}
                  </p>
                </div>

                <div className="space-y-2 p-5">
                  {item.details.map(
                    (
                      detail
                    ) => (
                      <div
                        key={
                          detail.label
                        }
                        className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span className="text-[10px] font-semibold text-slate-400">
                          {
                            detail.label
                          }
                        </span>

                        <span className="text-right text-[10px] font-bold text-slate-700">
                          {
                            detail.value
                          }
                        </span>
                      </div>
                    )
                  )}

                  {item.actionHref &&
                  item.actionLabel ? (
                    <a
                      href={
                        item.actionHref
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                    >
                      {
                        item.actionLabel
                      }

                      <ExternalLink
                        size={12}
                      />
                    </a>
                  ) : null}
                </div>
              </article>
            );
          }
        )}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        {
          "O monitor apenas consulta o estado das integra\u00e7\u00f5es. Ele n\u00e3o publica conte\u00fado, n\u00e3o cria eventos e n\u00e3o altera dados."
        }
      </div>
    </section>
  );
}