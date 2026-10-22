'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { RotateCcw, X } from 'lucide-react';

export function ConfirmManualPublicationRevertButton() {
  const [confirming, setConfirming] = useState(false);
  const { pending } = useFormStatus();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-900 transition hover:bg-amber-100 sm:w-auto"
        title="Corrigir um status marcado como publicado manualmente por engano."
      >
        <RotateCcw size={16} className="mr-2 inline" />
        Reverter publicação
      </button>
    );
  }

  return (
    <div className="max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 shadow-sm">
      <p className="text-sm font-bold">Desfazer publicação manual?</p>
      <p className="mt-1 text-xs leading-relaxed">
        Este conteúdo voltará para Pronto para Postar. O botão altera somente o status no APROVUP;
        não apaga postagens nas redes sociais e não desfaz aprovações.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {pending ? 'Revertendo...' : 'Sim, reverter status'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 disabled:opacity-50"
        >
          <X size={13} className="mr-1 inline" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
