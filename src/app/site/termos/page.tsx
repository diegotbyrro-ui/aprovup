import Link from 'next/link';
import { AprovUpLogo } from '@/components/brand/AprovUpLogo';

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-6 py-10 text-[#111827]">
      <section className="mx-auto max-w-4xl rounded-[40px] bg-white p-8 shadow-2xl shadow-slate-200 md:p-14">
        <AprovUpLogo size="sm" showTagline={false} />

        <p className="mt-10 text-sm font-black uppercase tracking-[0.24em] text-[#7554F7]">
          Termos de uso
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">
          Condições gerais de uso do AprovUp.
        </h1>

        <div className="mt-8 space-y-6 text-lg leading-relaxed text-slate-600">
          <p>
            O AprovUp é uma plataforma em desenvolvimento para organização de aprovações,
            calendário de conteúdo, produção criativa e gestão visual para agências.
          </p>

          <p>
            O cadastro no site não garante acesso imediato à plataforma. Os interessados
            entram em uma lista de contato e poderão ser chamados conforme disponibilidade.
          </p>

          <p>
            As funcionalidades apresentadas no site podem passar por ajustes, melhorias e
            mudanças até o lançamento oficial.
          </p>

          <p>
            Ao enviar seus dados, você autoriza o contato comercial do time AprovUp pelo
            WhatsApp ou outros canais informados.
          </p>
        </div>

        <Link
          href="/site"
          className="mt-10 inline-flex rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#2563EB] px-6 py-3 text-sm font-black text-white"
        >
          Voltar para o site
        </Link>
      </section>
    </main>
  );
}
