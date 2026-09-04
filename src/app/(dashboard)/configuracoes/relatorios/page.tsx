import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Upload,
} from 'lucide-react';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  createReportTemplateAction,
  setDefaultReportTemplateAction,
} from './actions';


function formatFileSize(
  bytes: number
) {

  if (
    bytes >=
    1024 * 1024
  ) {

    return (
      (
        bytes /
        1024 /
        1024
      ).toFixed(1) +
      ' MB'
    );
  }


  return (
    Math.max(
      1,
      Math.round(
        bytes /
        1024
      )
    ) +
    ' KB'
  );
}


export default async function ReportTemplatesPage({
  searchParams,
}: {
  searchParams?:
    Promise<{
      status?: string;
      error?: string;
    }>;
}) {

  const currentUser =
    await requirePermission(
      'settings.manage'
    );


  const params =
    searchParams
      ? await searchParams
      : {};


  const templates =
    await prisma
      .reportTemplate
      .findMany({

        where: {

          agencyId:
            currentUser.agencyId,

          status:
            'ATIVO',
        },

        orderBy: [
          {
            isDefault:
              'desc',
          },
          {
            createdAt:
              'desc',
          },
        ],

      });


  const successMessage =
    params.status ===
    'saved'
      ? 'Modelo enviado com sucesso.'
      : params.status ===
        'default'
        ? 'Modelo padrão atualizado.'
        : '';


  const errorMessages:
    Record<string, string> = {

      name:
        'Informe um nome para o modelo.',

      file:
        'Escolha um arquivo PDF.',

      type:
        'O layout precisa ser enviado em PDF.',

      size:
        'O PDF pode ter no máximo 15 MB.',

      upload:
        'Não foi possível enviar o PDF.',

      template:
        'Modelo não encontrado.',
    };


  const errorMessage =
    params.error
      ? errorMessages[
          params.error
        ] || ''
      : '';


  return (

    <div className="mx-auto max-w-6xl space-y-6">

      <section>

        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
          Configurações
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Modelos de relatório
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
          Envie o layout que sua agência já utiliza. O AprovUp vai manter esse PDF como base e substituir apenas as métricas quando o relatório for gerado.
        </p>

      </section>


      {successMessage ? (

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>

      ) : null}


      {errorMessage ? (

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>

      ) : null}


      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Upload size={20} />
          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-900">
            Enviar novo layout
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Envie o relatório já diagramado pela sua agência.
          </p>


          <form
            action={createReportTemplateAction}
            encType="multipart/form-data"
            className="mt-6 space-y-5"
          >

            <div>

              <label
                htmlFor="report-name"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Nome do modelo
              </label>

              <input
                id="report-name"
                name="name"
                type="text"
                maxLength={80}
                required
                placeholder="Ex.: Relatório Mensal Level UP"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />

            </div>


            <div>

              <label
                htmlFor="layout-pdf"
                className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Layout em PDF
              </label>

              <input
                id="layout-pdf"
                name="layoutPdf"
                type="file"
                accept="application/pdf,.pdf"
                required
                className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
              />

              <p className="mt-2 text-xs text-slate-400">
                PDF de até 15 MB.
              </p>

            </div>


            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Upload size={16} />
              Enviar modelo
            </button>

          </form>

        </div>


        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">

          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Relatório white-label
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-900">
            O cliente recebe o layout da própria agência.
          </h2>

          <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-600">

            <p>
              1. Você envia o PDF que já usa atualmente.
            </p>

            <p>
              2. Depois posicionaremos as métricas sobre cada página.
            </p>

            <p>
              3. O AprovUp busca os números do Instagram conectado.
            </p>

            <p>
              4. Ao baixar, o design continua igual. Apenas os dados mudam.
            </p>

          </div>

        </div>

      </section>


      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex items-center justify-between gap-4">

          <div>

            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Modelos cadastrados
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Layouts da agência
            </h2>

          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            {templates.length}
          </span>

        </div>


        {templates.length === 0 ? (

          <div className="mt-6 flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">

            <div>

              <FileText
                size={34}
                className="mx-auto text-slate-300"
              />

              <p className="mt-4 font-bold text-slate-700">
                Nenhum modelo cadastrado
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Envie o primeiro PDF da agência.
              </p>

            </div>

          </div>

        ) : (

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            {templates.map(
              (template) => (

                <article
                  key={template.id}
                  className={[
                    'rounded-2xl border p-5',
                    template.isDefault
                      ? 'border-blue-200 bg-blue-50/60'
                      : 'border-slate-200 bg-white',
                  ].join(' ')}
                >

                  <div className="flex items-start gap-3">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                      <FileText size={18} />
                    </div>

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="font-bold text-slate-900">
                          {template.name}
                        </h3>

                        {template.isDefault ? (

                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-black uppercase text-white">
                            <CheckCircle2 size={11} />
                            Padrão
                          </span>

                        ) : null}

                      </div>

                      <p className="mt-1 truncate text-xs text-slate-400">
                        {template.originalFileName}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatFileSize(template.fileSize)}
                      </p>

                    </div>

                  </div>


                  <div className="mt-5 flex flex-wrap gap-2">

                    <a
                      href={template.sourceFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink size={14} />
                      Abrir PDF
                    </a>


                    <a
                      href={
                        '/configuracoes/relatorios/' +
                        template.id +
                        '/editar'
                      }
                      className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      Configurar campos
                    </a>


                    {!template.isDefault ? (

                      <form
                        action={
                          setDefaultReportTemplateAction.bind(
                            null,
                            template.id
                          )
                        }
                      >

                        <button
                          type="submit"
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                        >
                          Tornar padrão
                        </button>

                      </form>

                    ) : null}

                  </div>


                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-[11px] font-medium text-slate-400">

                    {Array.isArray(
                      template.elements
                    ) &&
                    template.elements.length > 0
                      ? template.elements.length +
                        ' campo' +
                        (
                          template.elements.length === 1
                            ? ''
                            : 's'
                        ) +
                        ' configurado' +
                        (
                          template.elements.length === 1
                            ? ''
                            : 's'
                        )
                      : 'Campos dinâmicos ainda não configurados'}

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