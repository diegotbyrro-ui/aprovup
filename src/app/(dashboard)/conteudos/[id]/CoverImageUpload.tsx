'use client';

import { useRef, useState } from 'react';
import { uploadContentCoverImage } from './actions';

export function CoverImageUpload({
  contentId,
  coverImageUrl,
  currentImageUrl,
}: {
  contentId: string;
  coverImageUrl?: string | null;
  currentImageUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  const imageUrl = coverImageUrl || currentImageUrl || '';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Capa do conteúdo
        </p>

        <h3 className="mt-1 text-lg font-bold text-slate-900">
          Imagem de pré-visualização
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Envie uma imagem para aparecer na prévia do Instagram.
        </p>
      </div>

      {imageUrl ? (
        <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <img
            src={imageUrl}
            alt="Capa do conteúdo"
            className="h-64 w-full object-cover"
          />
        </div>
      ) : (
        <div className="mb-4 flex h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-400">
          Nenhuma imagem enviada
        </div>
      )}

      <form action={uploadContentCoverImage.bind(null, contentId)} className="space-y-3">
        <input
          ref={inputRef}
          name="coverImage"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setSelectedFileName(file?.name || '');
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Escolher imagem
        </button>

        {selectedFileName && (
          <p className="text-center text-xs font-medium text-slate-500">
            Arquivo selecionado: {selectedFileName}
          </p>
        )}

        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">
            Ou cole uma URL da imagem
          </label>

          <input
            name="coverImageUrl"
            type="url"
            placeholder="https://..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
        >
          Enviar capa
        </button>
      </form>
    </div>
  );
}
