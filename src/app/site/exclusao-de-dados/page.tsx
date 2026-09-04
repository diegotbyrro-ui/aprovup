import Link from 'next/link';

import {
  AprovUpLogo,
} from '@/components/brand/AprovUpLogo';


export default function ExclusaoDeDadosPage() {

  return (

    <main className="min-h-screen bg-[#F7F8FC] px-6 py-10 text-[#111827]">

      <section className="mx-auto max-w-4xl rounded-[40px] bg-white p-8 shadow-2xl shadow-slate-200 md:p-14">

        <AprovUpLogo
          size="sm"
          showTagline={false}
        />


        <p className="mt-10 text-sm font-black uppercase tracking-[0.24em] text-[#7554F7]">
          Exclusão de Dados
        </p>


        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">
          Solicite a remoção dos seus dados.
        </h1>


        <p className="mt-6 text-lg leading-relaxed text-slate-600">
          Esta página explica como solicitar a exclusão de informações mantidas pelo AprovUp, inclusive dados provenientes de integrações com Facebook, Instagram e outros produtos da Meta.
        </p>


        <div className="mt-10 space-y-8 text-base leading-relaxed text-slate-600">

          <section>

            <h2 className="text-xl font-black text-slate-900">
              Dados relacionados à Meta
            </h2>

            <p className="mt-3">
              Quando uma conta profissional do Instagram é conectada ao AprovUp, podemos armazenar identificadores da conta, informações da Página vinculada, tokens de acesso protegidos, permissões concedidas e métricas necessárias para dashboards, relatórios e publicação.
            </p>

            <p className="mt-3">
              O AprovUp não armazena a senha do Facebook ou do Instagram.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              Como solicitar exclusão
            </h2>

            <p className="mt-3">
              Envie uma solicitação pelo WhatsApp
              {' '}
              <strong>
                (82) 98112-2022
              </strong>
              {' '}
              informando que deseja excluir os dados relacionados à integração Meta no AprovUp.
            </p>

            <p className="mt-3">
              Para que possamos localizar corretamente os dados, informe o nome da agência, o cliente cadastrado no AprovUp e a conta profissional do Instagram relacionada à solicitação.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              O que acontece após a solicitação
            </h2>

            <p className="mt-3">
              Após a validação da solicitação, removeremos ou anonimizaremos os dados associados que não sejam necessários para cumprimento de obrigações legais ou proteção de direitos.
            </p>

            <p className="mt-3">
              Quando aplicável, isso inclui tokens de acesso, identificadores da conexão e dados provenientes da integração Meta mantidos pelo AprovUp.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              Remoção pelo Facebook ou Meta
            </h2>

            <p className="mt-3">
              O usuário também pode remover o acesso concedido ao AprovUp nas configurações de aplicativos e sites da própria Meta. A remoção interrompe o acesso futuro concedido por aquela autorização.
            </p>

            <p className="mt-3">
              Caso também queira a exclusão das informações já armazenadas no AprovUp, utilize o canal de solicitação informado nesta página.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              Dúvidas de privacidade
            </h2>

            <p className="mt-3">
              Solicitações relacionadas à privacidade, atualização ou exclusão de dados podem ser encaminhadas pelo mesmo canal de atendimento.
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
            href="/site/termos"
            className="inline-flex rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-700"
          >
            Termos de uso
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