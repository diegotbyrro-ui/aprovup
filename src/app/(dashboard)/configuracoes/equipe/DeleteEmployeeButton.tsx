"use client";

import {
  Trash2,
} from "lucide-react";

import {
  deleteEmployeeAction,
} from "./actions";


type DeleteEmployeeButtonProps = {
  userId: string;
  userName: string;
};


export function DeleteEmployeeButton({
  userId,
  userName,
}: DeleteEmployeeButtonProps) {

  const action =
    deleteEmployeeAction.bind(
      null,
      userId
    );


  return (
    <button
      type="submit"
      formAction={action}
      onClick={(event) => {

        const confirmed =
          window.confirm(
            `Excluir "${userName}" permanentemente?

O funcionário perderá o acesso ao AprovUp e o cadastro será removido.

Clientes e conteúdos não serão excluídos.

Esta ação não pode ser desfeita.`
          );


        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-300 bg-red-600 px-3 text-[9px] font-bold text-white transition hover:bg-red-700"
      title={`Excluir ${userName}`}
    >
      <Trash2
        size={11}
      />

      Excluir
    </button>
  );
}