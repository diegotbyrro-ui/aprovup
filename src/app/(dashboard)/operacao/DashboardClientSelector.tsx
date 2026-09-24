'use client';

import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import {
  Building2,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';


type DashboardClientOption = {
  id: string;
  name: string;
};


type DashboardMonthOption = {
  value: string;
  label: string;
};


export function DashboardClientSelector({
  clients,
  selectedClientId,
  selectedPeriod,
  monthOptions,
  allLabel,
}: {
  clients: DashboardClientOption[];
  selectedClientId?: string | null;
  selectedPeriod: string;
  monthOptions: DashboardMonthOption[];
  allLabel: string;
}) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();


  function handleMonthChange(
    value: string
  ) {

    const params =
      new URLSearchParams(
        searchParams.toString()
      );


    params.set(
      'mes',
      value
    );


    router.push(
      '/operacao?' +
      params.toString()
    );
  }


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
    <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">

      <div className="relative">

        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
          <CalendarDays
            size={16}
          />
        </div>

        <select
          value={
            selectedPeriod
          }
          onChange={(
            event
          ) =>
            handleMonthChange(
              event.target.value
            )
          }
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-bold text-slate-800 shadow-sm outline-none focus:border-blue-500 sm:min-w-[210px]"
        >
          {
            monthOptions.map(
              (
                option
              ) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              )
            )
          }
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
          <ChevronDown
            size={16}
          />
        </div>

      </div>


      <div className="relative">

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
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-bold text-slate-800 shadow-sm outline-none focus:border-blue-500 md:min-w-[280px]"
        >
          <option value="">
            {allLabel}
          </option>

          {
            clients.map(
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
            )
          }
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
          <ChevronDown
            size={16}
          />
        </div>

      </div>

    </div>
  );
}
