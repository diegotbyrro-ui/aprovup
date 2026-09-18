"use client";

import {
  disconnectInstagramConnectionAction,
} from "./actions";


export function DisconnectInstagramButton({
  clientId,
}: {
  clientId:
    string;
}) {
  return (
    <form
      action={
        disconnectInstagramConnectionAction
      }
      onSubmit={
        (
          event
        ) => {
          const confirmed =
            window.confirm(
              "Tem certeza que deseja desconectar esta conta do Instagram? O AprovUp deixara de atualizar dados e publicar ate uma nova conexao."
            );


          if (
            !confirmed
          ) {
            event.preventDefault();
          }
        }
      }
      className="col-start-2 flex justify-center"
    >
      <input
        type="hidden"
        name="clientId"
        value={
          clientId
        }
      />

      <button
        type="submit"
        className="px-2 text-[11px] font-semibold text-slate-400 transition hover:text-red-400"
      >
        Desconectar conta
      </button>
    </form>
  );
}
