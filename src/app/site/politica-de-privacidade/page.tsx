import Link from 'next/link';

import {
  AprovUpLogo,
} from '@/components/brand/AprovUpLogo';


export default function PoliticaDePrivacidadePage() {

  return (

    <main className="min-h-screen bg-[#F7F8FC] px-6 py-10 text-[#111827]">

      <section className="mx-auto max-w-4xl rounded-[40px] bg-white p-8 shadow-2xl shadow-slate-200 md:p-14">

        <AprovUpLogo
          size="sm"
          showTagline={false}
        />


        <p className="mt-10 text-sm font-black uppercase tracking-[0.24em] text-[#7554F7]">
          Política de Privacidade
        </p>


        <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">
          Como o AprovUp utiliza e protege dados.
        </h1>


        <p className="mt-5 text-sm font-semibold text-slate-400">
          Última atualização: setembro de 2026.
        </p>


        <div className="mt-10 space-y-9 text-base leading-relaxed text-slate-600">

          <section>

            <h2 className="text-xl font-black text-slate-900">
              1. Sobre o AprovUp
            </h2>

            <p className="mt-3">
              O AprovUp é uma plataforma destinada à organização da operação de agências, incluindo planejamento, aprovação, produção de conteúdo, integrações, publicação e análise de resultados.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              2. Dados de cadastro e contato
            </h2>

            <p className="mt-3">
              Podemos tratar informações como nome, e-mail, agência, telefone, WhatsApp, dados de clientes cadastrados e informações necessárias para operação e suporte da plataforma.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              3. Integração com Meta e Instagram
            </h2>

            <p className="mt-3">
              Quando um usuário autorizado conecta uma conta profissional do Instagram ao AprovUp, a autenticação acontece diretamente nos ambientes oficiais da Meta. O AprovUp não solicita, recebe nem armazena a senha do Facebook ou do Instagram.
            </p>

            <p className="mt-3">
              Conforme as permissões autorizadas pelo usuário, podemos receber e armazenar identificadores da conta profissional do Instagram, identificadores e nomes de Páginas do Facebook vinculadas, nome de usuário, nome de exibição, tokens de acesso, validade dos tokens, permissões concedidas e informações necessárias para manter a integração.
            </p>

            <p className="mt-3">
              Os tokens de acesso utilizados pelo AprovUp são armazenados de forma protegida e são utilizados exclusivamente para executar as funcionalidades autorizadas.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              4. Métricas e relatórios
            </h2>

            <p className="mt-3">
              Quando autorizado, o AprovUp pode consultar métricas disponibilizadas pela Meta para contas profissionais, como seguidores, alcance, visualizações, interações, desempenho de conteúdos e outras métricas suportadas pela API.
            </p>

            <p className="mt-3">
              Esses dados podem ser armazenados em históricos e snapshots para permitir dashboards, comparações entre períodos e geração de relatórios solicitados pela agência.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              5. Publicação de conteúdo
            </h2>

            <p className="mt-3">
              Quando a agência utiliza recursos de publicação ou agendamento, o AprovUp pode enviar à Meta conteúdos, legendas e demais informações necessárias para publicar na conta profissional escolhida pelo usuário autorizado.
            </p>

            <p className="mt-3">
              O AprovUp somente executa essas ações a partir das permissões concedidas à integração e das ações realizadas pelos usuários da agência dentro da plataforma.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              6. Finalidades do tratamento
            </h2>

            <p className="mt-3">
              Os dados são utilizados para fornecer as funcionalidades contratadas, autenticar usuários, manter integrações autorizadas, gerar relatórios, realizar publicações, prestar suporte, manter segurança, prevenir abuso e melhorar o funcionamento do AprovUp.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              7. Compartilhamento
            </h2>

            <p className="mt-3">
              O AprovUp não vende dados pessoais. Informações podem ser processadas por provedores de infraestrutura estritamente necessários à operação da plataforma e pelas plataformas externas que o próprio usuário optar por integrar, como Meta e Google, de acordo com as respectivas autorizações e políticas.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              8. Segurança
            </h2>

            <p className="mt-3">
              Adotamos medidas técnicas e organizacionais destinadas a proteger credenciais, tokens, informações dos usuários e dados operacionais contra acesso, alteração, divulgação ou destruição não autorizados.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              9. Retenção e exclusão
            </h2>

            <p className="mt-3">
              Mantemos os dados pelo período necessário para fornecer o serviço, cumprir obrigações legais, resolver disputas e proteger a plataforma. Quando uma integração é revogada ou quando houver uma solicitação válida de exclusão, os dados associados serão removidos ou anonimizados quando aplicável, respeitadas obrigações legais de retenção.
            </p>

            <p className="mt-3">
              As instruções específicas para solicitar exclusão de dados relacionados à Meta e ao Instagram estão disponíveis na página de Exclusão de Dados.
            </p>

          </section>


          <section>

            <h2 className="text-xl font-black text-slate-900">
              10. Direitos e contato
            </h2>

            <p className="mt-3">
              O titular pode solicitar informações, correção ou exclusão de seus dados, observadas as hipóteses legais aplicáveis.
            </p>

            <p className="mt-3">
              Para solicitações de privacidade e exclusão, entre em contato pelo WhatsApp:
              {' '}
              <strong>
                (82) 98112-2022
              </strong>.
            </p>

          </section>

        </div>


        <div className="mt-12 flex flex-wrap gap-3">

          <Link
            href="/site/exclusao-de-dados"
            className="inline-flex rounded-full bg-[#111827] px-6 py-3 text-sm font-black text-white"
          >
            Exclusão de dados
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