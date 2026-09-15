"use client";

import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useTransition,
} from "react";


type KanbanClientFilterProps = {
  clients: Array<{
    id: string;
    name: string;
  }>;

  selectedClient: string;
};


export function KanbanClientFilter({
  clients,
  selectedClient,
}: KanbanClientFilterProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();


  function changeClient(
    clientId: string
  ) {
    const nextParams =
      new URLSearchParams(
        searchParams.toString()
      );


    if (
      clientId ===
      "TODOS"
    ) {
      nextParams.delete(
        "cliente"
      );
    }
    else {
      nextParams.set(
        "cliente",
        clientId
      );
    }


    const query =
      nextParams.toString();


    const href =
      query
        ? pathname +
          "?" +
          query
        : pathname;


    startTransition(
      () => {
        router.replace(
          href,
          {
            scroll:
              false,
          }
        );
      }
    );
  }


  return (
    <label
      className={[
        "flex",
        "h-8",
        "items-center",
        "gap-2",
        "rounded-lg",
        "border",
        "border-slate-200",
        "bg-white",
        "px-2.5",
        "shadow-sm",
        isPending
          ? "opacity-60"
          : "",
      ].join(
        " "
      )}
    >
      <span className="whitespace-nowrap text-[8px] font-black uppercase tracking-[0.08em] text-slate-400">
        Cliente
      </span>


      <select
        aria-label="Filtrar demandas por cliente"
        value={
          selectedClient
        }
        disabled={
          isPending
        }
        onChange={
          (
            event
          ) =>
            changeClient(
              event.target.value
            )
        }
        className="
          min-w-[170px]
          max-w-[240px]
          bg-transparent
          text-[10px]
          font-bold
          text-slate-700
          outline-none
        "
      >
        <option value="TODOS">
          Todos os clientes
        </option>


        {clients.map(
          (
            client
          ) => (
            <option
              key={
                client.id
              }
              value={
                client.id
              }
            >
              {client.name}
            </option>
          )
        )}
      </select>
    </label>
  );
}
