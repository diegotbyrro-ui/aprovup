import Link from 'next/link';
import { AprovUpLogo } from '@/components/brand/AprovUpLogo';

export default function PoliticaDePrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-6 py-10 text-[#111827]">
      <section className="mx-auto max-w-4xl rounded-[40px] bg-white p-8 shadow-2xl shadow-slate-200 md:p-14">
        <AprovUpLogo size="sm" showTagline={false} />

        <p className="mt-10 text-sm font-black uppercase tracking-[0.24em] text-[#7554F7]">
          Política de privacidade
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">
          Como usamos os dados enviados no site.
        </h1>

        <div className="mt-8 space-y-6 text-lg leading-relaxed text-slate-600">
          <p>
            Ao preencher o formulário do AprovUp, coletamos informações como nome,
            agência, WhatsApp, quantidade de clientes e principal dificuldade informada.
          </p>

          <p>
            Esses dados são usados apenas para contato comercial, entendimento da operação
            da agência e apresentação do AprovUp.
          </p>

          <p>
            Não vendemos dados pessoais. As informações ficam restritas ao time responsável
            pelo atendimento e prospecção do AprovUp.
          </p>

          <p>
            Caso queira solicitar remoção ou atualização dos seus dados, entre em contato
            pelo WhatsApp: <strong>(82) 98112-2022</strong>.
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
