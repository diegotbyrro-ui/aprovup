'use client';

import {
  Trash2,
} from 'lucide-react';


export function ConfirmDeleteMeetingButton({
  title,
}: {
  title:
    string;
}) {

  function confirmDelete(
    event:
      React.MouseEvent<HTMLButtonElement>
  ) {

    const confirmed =
      window.confirm(
        'Excluir a reunião "' +
        title +
        '" do histórico do AprovUp?\n\n' +
        'A transcrição, o resumo e as ações salvas dessa reunião também serão removidos.'
      );


    if (
      !confirmed
    ) {

      event.preventDefault();
    }
  }


  return (
    <button
      type="submit"
      onClick={
        confirmDelete
      }
      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
      title="Excluir reunião"
    >
      <Trash2
        size={14}
      />

      Excluir
    </button>
  );
}
