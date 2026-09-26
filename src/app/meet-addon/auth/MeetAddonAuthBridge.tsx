'use client';

import {
  useEffect,
} from 'react';


export function MeetAddonAuthBridge({
  token,
  userName,
}: {
  token:
    string;

  userName:
    string;
}) {

  useEffect(
    () => {

      if (
        window.opener
      ) {

        window.opener
          .postMessage(
            {
              type:
                'APROVUP_MEET_ADDON_AUTH',

              token,
            },
            window.location.origin
          );


        window.setTimeout(
          () => {

            window.close();

          },
          400
        );
      }

    },
    [
      token,
    ]
  );


  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">

      <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-7 text-center">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 text-2xl">
          ✨
        </div>


        <h1 className="mt-4 text-xl font-black">
          Liv conectada
        </h1>


        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {
            userName
          }, o AprovUp autorizou a Liv para esta sessão do Google Meet.
        </p>


        <p className="mt-4 text-xs text-slate-400">
          Esta janela pode ser fechada.
        </p>

      </div>

    </main>
  );
}
