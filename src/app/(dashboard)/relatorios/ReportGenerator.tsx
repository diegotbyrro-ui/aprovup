"use client";

import Link from "next/link";

import {
  Download,
  FileText,
  Loader2,
  Settings2,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";


type ClientOption = {
  id: string;
  name: string;
  instagramUsername: string | null;
  instagramConnected: boolean;
};


type TemplateOption = {
  id: string;
  name: string;
  isDefault: boolean;
  originalFileName: string;
  elementCount: number;
};


export function ReportGenerator({
  clients,
  templates,
  canManageTemplates,
}: {
  clients: ClientOption[];
  templates: TemplateOption[];
  canManageTemplates: boolean;
}) {
  const defaultTemplate =
    templates.find(
      (template) =>
        template.isDefault
    ) ||
    templates[0] ||
    null;

  const [
    clientId,
    setClientId,
  ] = useState(
    clients[0]?.id ||
    ""
  );

  const [
    templateId,
    setTemplateId,
  ] = useState(
    defaultTemplate?.id ||
    ""
  );

  const [
    state,
    setState,
  ] = useState<
    "idle" |
    "loading" |
    "success" |
    "error"
  >(
    "idle"
  );

  const [
    message,
    setMessage,
  ] = useState(
    ""
  );

  const selectedClient =
    useMemo(
      () =>
        clients.find(
          (client) =>
            client.id ===
            clientId
        ) ||
        null,
      [
        clients,
        clientId,
      ]
    );

  const selectedTemplate =
    useMemo(
      () =>
        templates.find(
          (template) =>
            template.id ===
            templateId
        ) ||
        null,
      [
        templates,
        templateId,
      ]
    );

  async function downloadReport() {
    if (
      !clientId ||
      !templateId
    ) {
      return;
    }

    setState(
      "loading"
    );

    setMessage(
      "Buscando métricas e montando o PDF..."
    );

    try {
      const params =
        new URLSearchParams({
          cliente:
            clientId,
          modelo:
            templateId,
        });

      const response =
        await fetch(
          `/api/relatorios/gerar?${params.toString()}`,
          {
            method:
              "GET",
            cache:
              "no-store",
          }
        );

      if (
        !response.ok
      ) {
        const payload =
          await response
            .json()
            .catch(
              () => ({
                message:
                  "Não foi possível gerar o relatório.",
              })
            );

        throw new Error(
          payload?.message ||
          "Não foi possível gerar o relatório."
        );
      }

      const blob =
        await response.blob();

      const disposition =
        response.headers.get(
          "Content-Disposition"
        ) ||
        "";

      const filenameMatch =
        disposition.match(
          /filename="([^"]+)"/i
        );

      const fallbackName =
        `relatorio-${(
          selectedClient?.name ||
          "cliente"
        )
          .toLowerCase()
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .replace(
            /[^a-z0-9]+/g,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          )}.pdf`;

      const filename =
        filenameMatch?.[1] ||
        fallbackName;

      const objectUrl =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        objectUrl;

      anchor.download =
        filename;

      document.body.appendChild(
        anchor
      );

      anchor.click();
      anchor.remove();

      window.setTimeout(
        () =>
          URL.revokeObjectURL(
            objectUrl
          ),
        1000
      );

      setState(
        "success"
      );

      setMessage(
        "Relatório gerado e download iniciado."
      );
    }
    catch (
      error
    ) {
      setState(
        "error"
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Não foi possível gerar o relatório."
      );
    }
  }

  if (
    clients.length ===
    0
  ) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <FileText size={34} className="mx-auto text-slate-300" />
        <h2 className="mt-4 text-lg font-bold text-slate-800">
          Nenhum cliente disponível
        </h2>
      </section>
    );
  }

  if (
    templates.length ===
    0
  ) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <FileText size={34} className="mx-auto text-slate-300" />

        <h2 className="mt-4 text-lg font-bold text-slate-800">
          Nenhum modelo de relatório cadastrado
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Envie primeiro o PDF que será usado como layout do relatório.
        </p>

        {canManageTemplates ? (
          <Link
            href="/configuracoes/relatorios"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            <Settings2 size={15} />
            Configurar modelos
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">
            Gerar PDF
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Relatório mensal do cliente
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            O AprovUp usa os números do mês atual e compara com o mesmo período do mês anterior.
          </p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-700">
          O PDF mantém o layout cadastrado e substitui os campos dinâmicos pelas métricas reais.
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <label
            htmlFor="report-client"
            className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400"
          >
            Cliente
          </label>

          <select
            id="report-client"
            value={clientId}
            onChange={(event) => {
              setClientId(
                event.target.value
              );
              setState(
                "idle"
              );
              setMessage(
                ""
              );
            }}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          >
            {clients.map(
              (client) => (
                <option
                  key={client.id}
                  value={client.id}
                >
                  {client.name}
                  {
                    client.instagramUsername
                      ? ` — @${client.instagramUsername}`
                      : ""
                  }
                </option>
              )
            )}
          </select>

          <div className="mt-2">
            {selectedClient?.instagramConnected ? (
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                Instagram conectado
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">
                Sem Instagram conectado — métricas poderão aparecer como —
              </span>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="report-template"
            className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400"
          >
            Modelo
          </label>

          <select
            id="report-template"
            value={templateId}
            onChange={(event) => {
              setTemplateId(
                event.target.value
              );
              setState(
                "idle"
              );
              setMessage(
                ""
              );
            }}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          >
            {templates.map(
              (template) => (
                <option
                  key={template.id}
                  value={template.id}
                >
                  {template.name}
                  {
                    template.isDefault
                      ? " — Padrão"
                      : ""
                  }
                </option>
              )
            )}
          </select>

          {selectedTemplate ? (
            <p className="mt-2 text-[11px] text-slate-400">
              {selectedTemplate.elementCount} campo(s) configurado(s) • {selectedTemplate.originalFileName}
            </p>
          ) : null}
        </div>
      </div>

      {selectedTemplate &&
      selectedTemplate.elementCount ===
        0 ? (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-700">
          Este modelo ainda não possui campos dinâmicos posicionados. O PDF será baixado, mas continuará sem métricas sobrepostas.
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={
            state ===
            "loading"
          }
          onClick={
            downloadReport
          }
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
        >
          {state ===
          "loading" ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Download size={17} />
          )}

          {state ===
          "loading"
            ? "Gerando relatório..."
            : "Baixar relatório PDF"}
        </button>

        {message ? (
          <p
            className={[
              "text-xs",
              "font-semibold",
              state ===
              "error"
                ? "text-red-600"
                : state ===
                    "success"
                  ? "text-emerald-600"
                  : "text-slate-500",
            ].join(
              " "
            )}
          >
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
