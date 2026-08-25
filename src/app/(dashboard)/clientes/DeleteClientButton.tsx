"use client";

import {
  Trash2,
} from "lucide-react";

import {
  deleteClientAction,
} from "./actions";


type DeleteClientButtonProps = {
  clientId: string;
  clientName: string;
};


export function DeleteClientButton({
  clientId,
  clientName,
}: DeleteClientButtonProps) {

  const action =
    deleteClientAction.bind(
      null,
      clientId
    );


  return (
    <form
      action={action}
      onSubmit={(event) => {

        const confirmed =
          window.confirm(
            `Tem certeza que deseja excluir "${clientName}"?

Todos os conteúdos, aprovações, tarefas, diagnósticos e informações vinculadas a este cliente serão excluídos.

Esta ação não pode ser desfeita.`
          );


        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
      >
        <Trash2 size={16} />

        Excluir cliente
      </button>
    </form>
  );
}