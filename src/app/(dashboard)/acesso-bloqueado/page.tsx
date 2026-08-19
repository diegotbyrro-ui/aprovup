import Link from "next/link";

import {
  LockKeyhole,
} from "lucide-react";


export default function AccessBlockedPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <LockKeyhole
            size={20}
          />
        </div>

        <h1 className="mt-5 text-xl font-bold text-slate-900">
          Acesso não liberado
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Sua conta não possui permissão para acessar esta área do AprovUp.
          Se precisar desse acesso, fale com o administrador.
        </p>

        <Link
          href="/site"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800"
        >
          Voltar
        </Link>
      </div>
    </div>
  );
}