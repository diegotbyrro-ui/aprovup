import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { uploadAprovUpFile } from '@/lib/aprovupStorage';
import { requirePermission } from '@/lib/userAccess';

type DiagnosisPrintUploadProps = {
  clientId: string;
  currentUrl?: string | null;
  diagnosisPrintUrl?: string | null;
};

async function uploadDiagnosisPrintLocal(clientId: string, formData: FormData) {
  'use server';

  await requirePermission(
    'social.manage'
  );

  if (!clientId) {
    throw new Error('Cliente não informado.');
  }

  const file =
    formData.get('file') ||
    formData.get('diagnosisPrint') ||
    formData.get('print') ||
    formData.get('image');

  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Nenhum arquivo enviado.');
  }

  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'application/pdf',
  ];

  if (file.type && !allowedTypes.includes(file.type)) {
    throw new Error('Formato não permitido. Envie PNG, JPG, WEBP ou PDF.');
  }

  const publicUrl =
    await uploadAprovUpFile(
      file,
      'diagnosis',
      `diagnostico-${clientId}`
    );

  const runtimeModel = (prisma as any)._runtimeDataModel?.models?.Client;
  const fieldNames = new Set(
    (runtimeModel?.fields || []).map((field: any) => field.name)
  );

  const data: any = {};

  const possibleFields = [
    'diagnosisPrintUrl',
    'diagnosisUrl',
    'diagnosisImageUrl',
    'diagnosticPrintUrl',
    'diagnosticUrl',
    'brandDiagnosisPrintUrl',
    'strategyPrintUrl',
    'printUrl',
  ];

  for (const field of possibleFields) {
    if (fieldNames.has(field)) {
      data[field] = publicUrl;
      break;
    }
  }

  if (Object.keys(data).length > 0) {
    await (prisma as any).client.update({
      where: { id: clientId },
      data,
    });
  }

  revalidatePath('/clientes');
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath(`/clientes/${clientId}/editar`);
}

export default function DiagnosisPrintUpload({
  clientId,
  currentUrl,
  diagnosisPrintUrl,
}: DiagnosisPrintUploadProps) {
  const uploadedUrl = currentUrl || diagnosisPrintUrl;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Diagnóstico visual
        </p>

        <h3 className="mt-1 text-lg font-bold text-slate-900">
          Print ou arquivo de diagnóstico
        </h3>

        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          Envie uma imagem ou PDF para anexar ao cliente.
        </p>
      </div>

      {uploadedUrl && (
        <a
          href={uploadedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Ver arquivo enviado
        </a>
      )}

      <form
        action={uploadDiagnosisPrintLocal.bind(null, clientId)}
        className="mt-5 space-y-4"
      >
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
          className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-slate-800"
        />

        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Enviar diagnóstico
        </button>
      </form>
    </div>
  );
}
