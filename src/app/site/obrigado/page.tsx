import { AprovUpLogo } from '@/components/brand/AprovUpLogo';
import { ObrigadoClient } from './ObrigadoClient';

export default function ObrigadoPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-6 py-10 text-[#111827]">
      <section className="mx-auto flex min-h-[82vh] max-w-5xl items-center justify-center">
        <div className="w-full rounded-[42px] bg-white px-8 py-16 text-center shadow-2xl shadow-slate-200 md:px-16">
          <div className="flex justify-center">
            <AprovUpLogo size="lg" showTagline={false} />
          </div>

          <div className="mx-auto mt-12 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-[#7554F7]">
              Cadastro recebido
            </p>

            <h1 className="mt-5 text-5xl font-black leading-[0.95] tracking-[-0.065em] text-slate-950 md:text-6xl">
              Obrigado por entrar na lista do AprovUp.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-slate-600">
              Seu interesse foi registrado. Agora você pode chamar nossa equipe no WhatsApp para acelerar o contato.
            </p>
          </div>

          <ObrigadoClient />

          <div className="mx-auto mt-12 grid max-w-3xl gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-950">1. Recebemos</p>
              <p className="mt-2 text-sm text-slate-500">Seu cadastro foi salvo.</p>
            </div>

            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-950">2. Analisamos</p>
              <p className="mt-2 text-sm text-slate-500">Vamos entender sua operação.</p>
            </div>

            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-950">3. Chamamos</p>
              <p className="mt-2 text-sm text-slate-500">Entraremos em contato.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
