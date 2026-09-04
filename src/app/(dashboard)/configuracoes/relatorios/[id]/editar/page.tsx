import Link from 'next/link';

import {
  ArrowLeft,
  FileText,
} from 'lucide-react';

import {
  notFound,
} from 'next/navigation';

import {
  prisma,
} from '@/lib/prisma';

import {
  requirePermission,
} from '@/lib/userAccess';

import {
  ReportTemplateEditorLoader,
} from './ReportTemplateEditorLoader';


export default async function ReportTemplateEditorPage({
  params,
}: {
  params:
    Promise<{
      id: string;
    }>;
}) {

  const currentUser =
    await requirePermission(
      'settings.manage'
    );


  const {
    id,
  } =
    await params;


  const template =
    await prisma
      .reportTemplate
      .findFirst({

        where: {

          id,

          agencyId:
            currentUser.agencyId,

          status:
            'ATIVO',
        },

      });


  if (!template) {
    notFound();
  }


  const initialElements =
    Array.isArray(
      template.elements
    )
      ? template.elements
      : [];


  return (

    <div className="mx-auto max-w-[1600px] space-y-5">

      <section className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <Link
            href="/configuracoes/relatorios"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft size={14} />
            Voltar aos modelos
          </Link>


          <div className="mt-4 flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText size={20} />
            </div>

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">
                Editor do relatório
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                {template.name}
              </h1>

            </div>

          </div>


          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
            Posicione as métricas diretamente sobre o layout enviado pela agência. O AprovUp salvará essas coordenadas para preencher o relatório automaticamente.
          </p>

        </div>


        <a
          href={template.sourceFileUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Abrir PDF original
        </a>

      </section>


      <ReportTemplateEditorLoader
        templateId={
          template.id
        }
        pdfUrl={
          `/api/report-templates/${template.id}/pdf`
        }
        initialElements={
          initialElements
        }
      />

    </div>
  );
}