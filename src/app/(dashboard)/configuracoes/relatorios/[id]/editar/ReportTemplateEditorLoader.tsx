'use client';

import dynamic from 'next/dynamic';


type EditorProps = {
  templateId: string;
  pdfUrl: string;
  initialElements: unknown[];
};


const DynamicEditor =
  dynamic<EditorProps>(
    () =>
      import(
        './ReportTemplateEditor'
      ).then(
        (
          module
        ) =>
          module.ReportTemplateEditor
      ),
    {
      ssr:
        false,

      loading:
        () => (
          <div className="flex min-h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-500">
            Preparando editor de PDF...
          </div>
        ),
    }
  );


export function ReportTemplateEditorLoader(
  props:
    EditorProps
) {

  return (
    <DynamicEditor
      {...props}
    />
  );
}