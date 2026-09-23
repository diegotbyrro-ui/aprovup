import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Upload,
} from 'lucide-react';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  createEditorialCalendarTemplateAction,
  setDefaultEditorialCalendarTemplateAction,
} from './actions';


function formatFileSize(
  bytes:
    number
) {
  if (
    bytes >=
    1024 *
      1024
  ) {
    return (
      (
        bytes /
        1024 /
        1024
      ).toFixed(
        1
      ) +
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


export default async function EditorialCalendarTemplatesPage({
  searchParams,
}: {
  searchParams?:
    Promise<{
      status?:
        string;

      error?:
        string;
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
      .editorialCalendarTemplate
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
      ? 'Modelo de calendario enviado com sucesso.'
      : params.status ===
        'default'
        ? 'Modelo padrao atualizado.'
        : '';


  const errors:
    Record<
      string,
      string
    > = {
      name:
        'Informe o nome do modelo.',

      file:
        'Escolha o PDF do calendario.',

      type:
        'O modelo precisa ser um PDF.',

      pdf:
        'O arquivo PDF nao pode ser lido.',

      pages:
        'O modelo precisa ter pelo menos 2 paginas.',

      size:
        'O PDF pode ter no maximo 15 MB.',

      upload:
        'Nao foi possivel enviar o arquivo.',

      template:
        'Modelo nao encontrado.',
    };


  const errorMessage =
    params.error
      ? errors[
          params.error
        ] ||
        ''
      : '';


  return (
    <div className="mx-auto max-w-6xl space-y-6">

      <section>

        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
          Configuracoes
        </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Modelos de calendario editorial
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
          Envie um PDF de pelo menos duas paginas. A primeira pagina sera usada para a visao mensal e a segunda para o detalhamento dos conteudos.
        </p>

      </section>


      {
        successMessage
          ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              {successMessage}
            </div>
          )
          : null
      }


      {
        errorMessage
          ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          )
          : null
      }


      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Upload
              size={20}
            />
          </div>

          <h2 className="mt-5 text-lg font-bold text-slate-900">
            Enviar modelo
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Envie apenas o PDF diagramado com a identidade visual da agencia. O nome do arquivo sera usado automaticamente como identificacao do modelo.
          </p>


          <form
            action={
              createEditorialCalendarTemplateAction
            }
            encType="multipart/form-data"
            className="mt-6 space-y-5"
          >

            <div>

              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Layout em PDF
              </label>

              <input
                name="layoutPdf"
                type="file"
                accept="application/pdf,.pdf"
                required
                className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
              />

              <p className="mt-2 text-xs text-slate-400">
                PDF com 2 paginas ou mais. Maximo 15 MB.
              </p>

            </div>


            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Upload
                size={16}
              />

              Enviar modelo
            </button>

          </form>

        </div>


        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">

          <CalendarDays
            size={28}
            className="text-blue-600"
          />

          <h2 className="mt-4 text-xl font-black text-slate-900">
            O layout continua sendo da sua agencia.
          </h2>

          <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-600">

            <p>
              1. O PDF original fica como fundo.
            </p>

            <p>
              2. O AprovUp preenche automaticamente cliente, mes e conteudos.
            </p>

            <p>
              3. A primeira pagina recebe o calendario mensal.
            </p>

            <p>
              4. A segunda pagina recebe o resumo de cada publicacao.
            </p>

            <p>
              5. Se houver muitos conteudos, novas paginas de detalhamento sao criadas automaticamente.
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
              Calendarios da agencia
            </h2>

          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
            {templates.length}
          </span>

        </div>


        {
          templates.length ===
          0
            ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">

                <CalendarDays
                  size={34}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-4 font-bold text-slate-700">
                  Nenhum modelo cadastrado
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Envie o modelo criado para a Level UP.
                </p>

              </div>
            )
            : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">

                {
                  templates.map(
                    (
                      template
                    ) => (
                      <article
                        key={
                          template.id
                        }
                        className={
                          template.isDefault
                            ? 'rounded-2xl border border-blue-200 bg-blue-50/60 p-5'
                            : 'rounded-2xl border border-slate-200 bg-white p-5'
                        }
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <div className="flex flex-wrap items-center gap-2">

                              <p className="font-bold text-slate-900">
                                {template.name}
                              </p>

                              {
                                template.isDefault
                                  ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[9px] font-black uppercase text-white">
                                      <CheckCircle2
                                        size={10}
                                      />

                                      Padrao
                                    </span>
                                  )
                                  : null
                              }

                            </div>

                            <p className="mt-1 text-xs text-slate-400">
                              {template.originalFileName}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {template.pageCount} pagina(s) - {formatFileSize(
                                template.fileSize
                              )}
                            </p>

                          </div>

                        </div>


                        <div className="mt-5 flex flex-wrap gap-2">

                          <a
                            href={
                              template.sourceFileUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink
                              size={14}
                            />

                            Abrir PDF
                          </a>


                          {
                            !template.isDefault
                              ? (
                                <form
                                  action={
                                    setDefaultEditorialCalendarTemplateAction.bind(
                                      null,
                                      template.id
                                    )
                                  }
                                >
                                  <button
                                    type="submit"
                                    className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                                  >
                                    Tornar padrao
                                  </button>
                                </form>
                              )
                              : null
                          }

                        </div>

                      </article>
                    )
                  )
                }

              </div>
            )
        }

      </section>

    </div>
  );
}
