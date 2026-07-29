'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UploadCloud } from 'lucide-react';

export default function FinalUploadForm({
  contentId,
}: {
  contentId: string;
}) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsUploading(true);
    setMessage('');

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch(`/api/conteudos/${contentId}/upload-final`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        setMessage(result.message || 'Não foi possível enviar o arquivo.');
        return;
      }

      form.reset();
      setMessage('Material enviado para a Etapa 2 com sucesso.');
      router.refresh();
    } catch (error) {
      setMessage('Erro ao enviar arquivo. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-blue-700">
          Arquivo final
        </label>

        <input
          type="file"
          name="finalFile"
          accept="image/*,video/*,.pdf"
          className="block w-full cursor-pointer rounded-2xl border border-blue-100 bg-white text-sm font-medium text-slate-700 file:mr-4 file:border-0 file:bg-blue-600 file:px-4 file:py-3 file:text-sm file:font-bold file:text-white hover:file:bg-blue-700"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-blue-700">
          Capa / thumbnail
        </label>

        <input
          type="file"
          name="coverFile"
          accept="image/*"
          className="block w-full cursor-pointer rounded-2xl border border-blue-100 bg-white text-sm font-medium text-slate-700 file:mr-4 file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-bold file:text-white hover:file:bg-slate-800"
        />
      </div>

      {message && (
        <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-blue-700">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={isUploading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <UploadCloud size={18} />
        {isUploading ? 'Enviando...' : 'Enviar para Etapa 2'}
      </button>
    </form>
  );
}
