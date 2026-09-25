'use client';

import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import {
  Building2,
  ChevronDown,
} from 'lucide-react';


type DashboardClientOption = {
  id: string;
  name: string;
};


export function DashboardClientSelector({
  clients,
  selectedClientId,
  allLabel,
}: {
  clients: DashboardClientOption[];
  selectedClientId?: string | null;
  allLabel: string;
}) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();


  function handleChange(
    value: string
  ) {
    const params =
      new URLSearchParams(
        searchParams.toString()
      );

    if (value) {
      params.set(
        'cliente',
        value
      );
    }
    else {
      params.delete(
        'cliente'
      );
    }

    const query =
      params.toString();

    router.push(
      query
        ? `/operacao?${query}`
        : '/operacao'
    );
  }


  return (
    <div className="relative min-w-0">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <Building2
          size={16}
        />
      </div>

      <select
        value={
          selectedClientId ||
          ''
        }
        onChange={(
          event
        ) =>
          handleChange(
            event.target.value
          )
        }
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-bold text-slate-800 shadow-sm outline-none transition hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 md:min-w-[320px]"
        aria-label="Selecionar cliente do dashboard"
      >
        <option value="">
          {allLabel}
        </option>

        {clients.map(
          (client) => (
            <option
              key={client.id}
              value={client.id}
            >
              {client.name}
            </option>
          )
        )}
      </select>

      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
        <ChevronDown
          size={16}
        />
      </div>
    </div>
  );
}
