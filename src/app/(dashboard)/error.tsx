'use client';


import {
  useEffect,
} from 'react';


export default function DashboardError({
  error,
  reset,
}: {
  error:
    Error & {
      digest?:
        string;
    };

  reset:
    () => void;
}) {
  useEffect(
    () => {
      console.error(
        'AprovUp dashboard error:',
        error
      );
    },
    [
      error,
    ]
  );


  return (
    <div className="mx-auto max-w-3xl px-4 py-10">

      <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">

        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-red-500">
          Erro operacional
        </p>

        <h1 className="mt-2 text-xl font-black text-slate-950">
          Não foi possível concluir esta operação.
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Seus dados podem já ter sido salvos. Tente carregar novamente antes de repetir a ação.
        </p>


        <div className="mt-5 flex flex-wrap gap-2">

          <button
            type="button"
            onClick={
              () =>
                reset()
            }
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"
          >
            Tentar novamente
          </button>


          <button
            type="button"
            onClick={
              () =>
                window.location.reload()
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Recarregar página
          </button>

        </div>


        {error.digest ? (
          <p className="mt-4 text-[10px] text-slate-400">
            Código do erro: {error.digest}
          </p>
        ) : null}

      </section>

    </div>
  );
}
