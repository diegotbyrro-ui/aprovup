'use client';


export function ConfirmFinalReopenButton() {

  function confirmReopen(
    event:
      React.MouseEvent<HTMLButtonElement>
  ) {

    const confirmed =
      window.confirm(
        'Tem certeza que deseja marcar este conteúdo como não aprovado? Ele voltará para a 2ª Etapa de Aprovação.'
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
        confirmReopen
      }
      className="w-full rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-600 transition hover:bg-red-50"
    >
      Marcar como não aprovado
    </button>
  );
}
