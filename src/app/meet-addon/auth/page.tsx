import {
  getCurrentUser,
} from '@/lib/auth';

import {
  hasPermission,
} from '@/lib/userAccess';

import {
  createMeetAddonToken,
} from '@/lib/meetAddonAuth';

import {
  MeetAddonAuthBridge,
} from './MeetAddonAuthBridge';


export const dynamic =
  'force-dynamic';


export default async function MeetAddonAuthPage() {

  const user =
    await getCurrentUser();


  if (
    !user ||
    user.status !==
      'APROVADO' ||
    !user.agencyId
  ) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">

        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-7">

          <h1 className="text-xl font-black">
            Entre no AprovUp
          </h1>


          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Sua sessão do AprovUp não foi encontrada.
          </p>


          <a
            href="/login"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
          >
            Abrir login do AprovUp
          </a>


          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            Depois de entrar no AprovUp, volte ao Meet e clique novamente em Conectar AprovUp.
          </p>

        </div>

      </main>
    );
  }


  if (
    !hasPermission(
      user,
      'secretary.use'
    )
  ) {

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">

        <div className="max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-7">

          <h1 className="text-xl font-black">
            Sem acesso à Liv
          </h1>


          <p className="mt-3 text-sm text-red-100">
            Seu usuário não possui permissão para usar a Secretária IA.
          </p>

        </div>

      </main>
    );
  }


  const token =
    createMeetAddonToken({
      userId:
        user.id,

      agencyId:
        user.agencyId,
    });


  return (
    <MeetAddonAuthBridge
      token={
        token
      }
      userName={
        user.name ||
        user.email ||
        'Usuário'
      }
    />
  );
}
