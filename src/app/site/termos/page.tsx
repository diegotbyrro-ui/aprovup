import Link from 'next/link';

import {
  AprovUpLogo,
} from '@/components/brand/AprovUpLogo';


export default function TermosPage() {

  return (

    <main className="min-h-screen bg-[#F7F8FC] px-6 py-10 text-[#111827]">

      <section className="mx-auto max-w-4xl rounded-[40px] bg-white p-8 shadow-2xl shadow-slate-200 md:p-14">

        <AprovUpLogo
          size="sm"
          showTagline={false}
        />


        <p className="mt-10 text-sm font-black uppercase tracking-[0.24em] text-[#7554F7]">
          Termos de Uso
        </p>


        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">
          Condições de utilização do AprovUp.
        </h1>


        <p className="mt-5 text-sm font-semibold text-slate-400">
          Última atualização: setembro de 2026.
        </p>


        <div className="mt-10 space-y-9 text-base leading-relaxed text-slate-600">

          <section>

            <h2 className="text-xl font-black text-slate-900">
              1. Uso da plataforma
            </h2>

            <p className="mt-3">
              O AprovUp fornece ferramentas para organização da operação de agências, incluindo clientes, calendários, aprovações, produção, integrações, relatórios e publicação de conteúdo.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              2. Responsabilidade da agência
            </h2>

            <p className="mt-3">
              A agência é responsável por utilizar a plataforma apenas para clientes, contas e ativos que esteja autorizada a administrar.
            </p>

            <p className="mt-3">
              Ao conectar uma Página do Facebook ou conta profissional do Instagram, o usuário declara possuir autorização suficiente para realizar essa conexão e para utilizar os dados e recursos disponibilizados.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              3. Integrações Meta e Instagram
            </h2>

            <p className="mt-3">
              A autenticação com Facebook e Instagram ocorre diretamente nos ambientes oficiais da Meta. O AprovUp não solicita que o usuário informe sua senha da Meta dentro da plataforma.
            </p>

            <p className="mt-3">
              O usuário poderá conceder ou revogar permissões conforme os mecanismos disponibilizados pela Meta.
            </p>

            <p className="mt-3">
              Algumas funcionalidades dependem de contas profissionais do Instagram e da configuração adequada dos ativos na Meta.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              4. Métricas e relatórios
            </h2>

            <p className="mt-3">
              Os relatórios e dashboards do AprovUp utilizam dados disponibilizados pelas integrações autorizadas. A disponibilidade, definição e atualização de determinadas métricas dependem das APIs e regras das plataformas externas.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              5. Publicação
            </h2>

            <p className="mt-3">
              O usuário é responsável por verificar conteúdo, direitos autorais, autorizações, legendas, datas e contas selecionadas antes de publicar ou agendar materiais.
            </p>

            <p className="mt-3">
              O AprovUp executará as solicitações de publicação dentro das possibilidades e limitações oferecidas pelas APIs das plataformas integradas.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              6. Plataformas de terceiros
            </h2>

            <p className="mt-3">
              Meta, Instagram, Facebook, Google e outros serviços integrados possuem seus próprios termos, políticas, limites e disponibilidade. Alterações ou indisponibilidades nesses serviços podem afetar temporariamente funcionalidades do AprovUp.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              7. Segurança e uso indevido
            </h2>

            <p className="mt-3">
              É proibido utilizar o AprovUp para acessar contas sem autorização, violar direitos de terceiros, distribuir conteúdo ilícito ou tentar contornar mecanismos de segurança da plataforma ou das integrações.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              8. Privacidade
            </h2>

            <p className="mt-3">
              O tratamento de dados pessoais e dados provenientes das integrações é descrito na Política de Privacidade do AprovUp.
            </p>

          </section>

        </div>


        <div className="mt-12 flex flex-wrap gap-3">

          <Link
            href="/site/politica-de-privacidade"
            className="inline-flex rounded-full bg-[#111827] px-6 py-3 text-sm font-black text-white"
          >
            Política de privacidade
          </Link>


          <Link
            href="/site/exclusao-de-dados"
            className="inline-flex rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700"
          >
            Exclusão de dados
          </Link>


          <Link
            href="/site"
            className="inline-flex rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#2563EB] px-6 py-3 text-sm font-black text-white"
          >
            Voltar para o site
          </Link>

        </div>

      </section>

    </main>
  );
}