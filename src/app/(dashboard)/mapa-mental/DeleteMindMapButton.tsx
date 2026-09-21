"use client";

import {
  Trash2,
} from "lucide-react";

import {
  deleteMindMapAction,
} from "./actions";


export function DeleteMindMapButton({
  mapId,
}: {
  mapId: string;
}) {
  return (
    <form
      action={
        deleteMindMapAction.bind(
          null,
          mapId
        )
      }
      onSubmit={
        (
          event
        ) => {
          if (
            !window.confirm(
              "Excluir este mapa mental?"
            )
          ) {
            event.preventDefault();
          }
        }
      }
    >
      <button
        type="submit"
        title="Excluir mapa"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100"
      >
        <Trash2
          size={
            15
          }
        />
      </button>
    </form>
  );
}
