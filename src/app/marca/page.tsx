import { AprovUpLogo } from '@/components/brand/AprovUpLogo';

export default function MarcaPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-6 py-10">
      <section className="mx-auto max-w-6xl rounded-[36px] bg-white px-8 py-14 text-center shadow-2xl shadow-slate-200 md:px-16">
        <p className="mb-10 text-xs font-black uppercase tracking-[0.38em] text-[#7554F7]">
          Identidade visual oficial
        </p>

        <AprovUpLogo size="xl" center />

        <p className="mx-auto mt-12 max-w-2xl text-xl leading-relaxed text-slate-600">
          Agora estamos usando a logo oficial como imagem real, sem tentar redesenhar em código.
        </p>

        <div className="mt-14 rounded-[32px] border border-slate-200 bg-slate-50 p-10">
          <p className="mb-10 text-xs font-black uppercase tracking-[0.3em] text-slate-400">
            Versão reduzida
          </p>

          <AprovUpLogo size="lg" center />
        </div>
      </section>
    </main>
  );
}
